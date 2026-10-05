import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

import { sendNotificationEmail } from '@/lib/notifications/email'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

function isAuthorized(request: Request) {
  const cronSecret = process.env.CRON_SECRET?.trim()
  return Boolean(cronSecret) && request.headers.get('authorization') === `Bearer ${cronSecret}`
}

export async function GET(request: Request) {
  if (!process.env.CRON_SECRET?.trim()) {
    return NextResponse.json({ error: 'Operations alert cron is not configured.' }, { status: 503 })
  }
  if (!isAuthorized(request)) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: 'Operations alert database access is not configured.' }, { status: 503 })
  }

  const since = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data, error } = await supabase
    .from('stripe_webhook_events')
    .select('stripe_event_id,event_type,created_at,last_error')
    .eq('processing_status', 'failed')
    .gte('created_at', since)
    .order('created_at', { ascending: false })

  if (error) throw error

  const { data: recoveryHealth, error: recoveryHealthError } = await supabase
    .from('operational_job_health')
    .select('last_started_at,last_succeeded_at,last_failed_at,last_status,last_error,updated_at')
    .eq('job_name', 'storage-recovery')
    .maybeSingle()
  if (recoveryHealthError) throw recoveryHealthError

  const staleBefore = Date.now() - 26 * 60 * 60 * 1000
  const lastSuccessMs = recoveryHealth?.last_succeeded_at
    ? new Date(recoveryHealth.last_succeeded_at).getTime()
    : 0
  const recoveryProblem =
    !recoveryHealth ||
    recoveryHealth.last_status === 'failed' ||
    !lastSuccessMs ||
    lastSuccessMs < staleBefore

  if (!data?.length && !recoveryProblem) {
    return NextResponse.json({ ok: true, failedEvents: 0, recoveryProblem: false, alerted: false })
  }

  const alertEmail = process.env.RAISEHUB_ALERT_EMAIL?.trim() || 'alerts@raisehub.app'

  const failedEvents = data ?? []
  const eventIds = failedEvents.map((row) => row.stripe_event_id).sort()
  const problems = [
    ...failedEvents
      .slice(0, 10)
      .map((row) => `Stripe: ${row.event_type} — ${row.stripe_event_id} — ${row.last_error ?? 'Unknown error'}`),
    ...(recoveryProblem
      ? [`Storage recovery: ${recoveryHealth?.last_status ?? 'missing heartbeat'} — last success ${recoveryHealth?.last_succeeded_at ?? 'never'} — ${recoveryHealth?.last_error ?? 'No recorded error'}`]
      : []),
  ]
  const result = await sendNotificationEmail({
    to: alertEmail,
    title: `RaiseHub operations alert: ${problems.length} issue${problems.length === 1 ? '' : 's'}`,
    message: problems.join('\n'),
    actionUrl: '/dashboard/owner',
    actionLabel: 'Open RaiseHub owner dashboard',
    idempotencyKey: `ops-${eventIds.join('-')}-recovery-${recoveryHealth?.updated_at ?? 'missing'}`.slice(0, 240),
    category: 'operations-alert',
  })

  if (result.status !== 'sent') {
    console.error('Unable to send operations alert', result)
    return NextResponse.json({ ok: false, failedEvents: failedEvents.length, recoveryProblem, alerted: false, delivery: result }, { status: 500 })
  }

  return NextResponse.json({ ok: true, failedEvents: failedEvents.length, recoveryProblem, alerted: true })
}

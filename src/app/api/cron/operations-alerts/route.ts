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
  if (!data?.length) return NextResponse.json({ ok: true, failedEvents: 0, alerted: false })

  const alertEmail = process.env.RAISEHUB_ALERT_EMAIL?.trim() || 'alerts@raisehub.app'

  const eventIds = data.map((row) => row.stripe_event_id).sort()
  const result = await sendNotificationEmail({
    to: alertEmail,
    title: `RaiseHub alert: ${data.length} Stripe webhook failure${data.length === 1 ? '' : 's'}`,
    message: data
      .slice(0, 10)
      .map((row) => `${row.event_type} — ${row.stripe_event_id} — ${row.last_error ?? 'Unknown error'}`)
      .join('\n'),
    actionUrl: '/dashboard/owner',
    actionLabel: 'Open RaiseHub owner dashboard',
    idempotencyKey: `ops-stripe-webhook-${eventIds.join('-')}`.slice(0, 240),
    category: 'operations-alert',
  })

  if (result.status !== 'sent') {
    console.error('Unable to send Stripe webhook failure alert', result)
    return NextResponse.json({ ok: false, failedEvents: data.length, alerted: false, delivery: result }, { status: 500 })
  }

  return NextResponse.json({ ok: true, failedEvents: data.length, alerted: true })
}

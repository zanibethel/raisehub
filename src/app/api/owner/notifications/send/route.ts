import { NextResponse } from 'next/server'

import { sendNotificationEmail } from '@/lib/notifications/email'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

type Payload = {
  recipientIds?: string[]
  title?: string
  message?: string
  actionUrl?: string | null
  actionLabel?: string | null
  severity?: 'info' | 'success' | 'warning' | 'error'
  sendEmail?: boolean
  template?: string
}

type Recipient = {
  id: string
  email: string | null
  full_name: string | null
  display_name: string | null
  business_name: string | null
  role: string
  is_demo: boolean | null
}

const ALLOWED_SEVERITIES = new Set(['info', 'success', 'warning', 'error'])

function recipientName(recipient: Recipient) {
  return (
    recipient.business_name?.trim() ||
    recipient.display_name?.trim() ||
    recipient.full_name?.trim() ||
    null
  )
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const { data: actor } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle<{ role: string }>()

  if (actor?.role !== 'owner') {
    return NextResponse.json({ error: 'Owner access required.' }, { status: 403 })
  }

  const body = (await request.json().catch(() => null)) as Payload | null
  const recipientIds = [...new Set((body?.recipientIds ?? []).filter(Boolean))]
  const title = body?.title?.trim() ?? ''
  const message = body?.message?.trim() ?? ''
  const severity = body?.severity ?? 'info'

  if (recipientIds.length === 0) {
    return NextResponse.json({ error: 'Select at least one recipient.' }, { status: 400 })
  }

  if (recipientIds.length > 100) {
    return NextResponse.json({ error: 'Send to no more than 100 profiles at a time.' }, { status: 400 })
  }

  if (!title || title.length > 140 || !message || message.length > 1500) {
    return NextResponse.json({ error: 'Enter a valid title and message.' }, { status: 400 })
  }

  if (!ALLOWED_SEVERITIES.has(severity)) {
    return NextResponse.json({ error: 'Invalid notification priority.' }, { status: 400 })
  }

  const admin = createAdminClient() as any
  const { data: recipients, error: recipientError } = await admin
    .from('profiles')
    .select('id, email, full_name, display_name, business_name, role, is_demo')
    .in('id', recipientIds)
    .in('role', ['business', 'organization', 'customer'])

  if (recipientError) {
    return NextResponse.json({ error: recipientError.message }, { status: 500 })
  }

  const rows = (recipients ?? []) as Recipient[]
  let notificationsCreated = 0
  let emailsSent = 0
  let emailsSkipped = 0
  let emailsFailed = 0
  const errors: string[] = []

  for (const recipient of rows) {
    const sourceKey = `owner_manual:${user.id}:${crypto.randomUUID()}`
    const { data: notification, error: notificationError } = await admin
      .from('notifications')
      .insert({
        user_id: recipient.id,
        source_key: sourceKey,
        type: 'owner_message',
        severity,
        title,
        message,
        action_url: body?.actionUrl?.trim() || null,
        action_label: body?.actionLabel?.trim() || null,
        metadata: {
          sent_by_owner_id: user.id,
          template: body?.template || 'custom',
          manual: true,
        },
      })
      .select('id')
      .single()

    if (notificationError || !notification) {
      errors.push(`${recipient.id}: ${notificationError?.message || 'Notification insert failed.'}`)
      continue
    }

    notificationsCreated += 1

    if (!body?.sendEmail) continue

    if (!recipient.email?.trim()) {
      emailsSkipped += 1
      continue
    }

    const attemptedAt = new Date().toISOString()
    const { data: delivery, error: deliveryError } = await admin
      .from('notification_deliveries')
      .insert({
        notification_id: notification.id,
        user_id: recipient.id,
        channel: 'email',
        status: 'pending',
        provider: 'resend',
        attempted_at: attemptedAt,
      })
      .select('id')
      .single()

    if (deliveryError || !delivery) {
      emailsFailed += 1
      errors.push(`${recipient.id}: ${deliveryError?.message || 'Delivery ledger insert failed.'}`)
      continue
    }

    const emailResult = await sendNotificationEmail({
      to: recipient.email.trim(),
      recipientName: recipientName(recipient),
      title,
      message,
      actionUrl: body?.actionUrl?.trim() || null,
      actionLabel: body?.actionLabel?.trim() || null,
      idempotencyKey: `raisehub/${notification.id}/email`,
    })

    if (emailResult.status === 'sent') {
      emailsSent += 1
      await admin
        .from('notification_deliveries')
        .update({
          status: 'sent',
          provider_message_id: emailResult.providerMessageId,
          sent_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          error_message: null,
        })
        .eq('id', delivery.id)
    } else if (emailResult.status === 'skipped') {
      emailsSkipped += 1
      await admin
        .from('notification_deliveries')
        .update({
          status: 'skipped',
          updated_at: new Date().toISOString(),
          error_message: emailResult.reason,
        })
        .eq('id', delivery.id)
    } else {
      emailsFailed += 1
      await admin
        .from('notification_deliveries')
        .update({
          status: 'failed',
          updated_at: new Date().toISOString(),
          error_message: emailResult.error,
        })
        .eq('id', delivery.id)
    }
  }

  return NextResponse.json({
    requested: recipientIds.length,
    matchedRecipients: rows.length,
    notificationsCreated,
    emailsSent,
    emailsSkipped,
    emailsFailed,
    errors,
  })
}

import type { SupabaseClient } from '@supabase/supabase-js'

type SupportReplyInput = {
  admin: SupabaseClient<any, any, any>
  supportRequestId: string
  requesterEmail: string
  requesterUserId?: string | null
  topic: string
  replyFromEmail: string
  replyDisplayName: string
  body: string
  providerInReplyTo?: string | null
}

type SupportReplyResult = {
  ok: boolean
  providerMessageId: string | null
  requesterUserId: string | null
}

function replySubject(topic: string) {
  const trimmed = topic.trim() || 'RaiseHub support'
  return /^re:/i.test(trimmed) ? trimmed : `Re: ${trimmed}`
}

export function threadedReplyAddress(address: string, supportRequestId: string) {
  const [localPart, domain] = address.trim().toLowerCase().split('@')
  if (!localPart || !domain) return address
  return `${localPart}+${supportRequestId}@${domain}`
}

async function resolveRequesterUserId(
  admin: SupabaseClient<any, any, any>,
  supportRequestId: string,
  requesterEmail: string,
  requesterUserId?: string | null
) {
  if (requesterUserId) return requesterUserId

  const { data: profile } = await admin
    .from('profiles')
    .select('id')
    .ilike('email', requesterEmail.trim())
    .limit(1)
    .maybeSingle<{ id: string }>()

  if (!profile?.id) return null

  await admin
    .from('support_requests')
    .update({ requester_user_id: profile.id, updated_at: new Date().toISOString() })
    .eq('id', supportRequestId)
    .is('requester_user_id', null)

  return profile.id
}

export async function deliverCustomerSupportReply({
  admin,
  supportRequestId,
  requesterEmail,
  requesterUserId,
  topic,
  replyFromEmail,
  replyDisplayName,
  body,
  providerInReplyTo,
}: SupportReplyInput): Promise<SupportReplyResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  if (!apiKey) {
    console.error('Unable to publish support reply: RESEND_API_KEY is missing.')
    return { ok: false, providerMessageId: null, requesterUserId: requesterUserId ?? null }
  }

  const headers: Record<string, string> = {}
  if (providerInReplyTo) {
    headers['In-Reply-To'] = providerInReplyTo
    headers.References = providerInReplyTo
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `${replyDisplayName} <${replyFromEmail}>`,
      to: [requesterEmail],
      subject: replySubject(topic),
      text: body,
      reply_to: threadedReplyAddress(replyFromEmail, supportRequestId),
      headers,
      tags: [
        { name: 'product', value: 'raisehub' },
        { name: 'category', value: 'support-reply' },
      ],
    }),
    cache: 'no-store',
  })

  const payload = (await response.json().catch(() => null)) as
    | { id?: string; message?: string; error?: { message?: string } }
    | null

  if (!response.ok) {
    console.error(
      'Unable to publish support reply:',
      payload?.error?.message || payload?.message || response.status
    )
    return { ok: false, providerMessageId: null, requesterUserId: requesterUserId ?? null }
  }

  const providerMessageId = payload?.id ?? null
  const linkedUserId = await resolveRequesterUserId(
    admin,
    supportRequestId,
    requesterEmail,
    requesterUserId
  )

  if (linkedUserId) {
    const { error: notificationError } = await admin.from('notifications').insert({
      user_id: linkedUserId,
      type: 'support_reply',
      severity: 'info',
      title: `${replyDisplayName} replied`,
      message: body.slice(0, 500),
      action_url: '/support',
      action_label: 'View support reply',
      source_key: `support_reply:${supportRequestId}:${providerMessageId ?? crypto.randomUUID()}`,
      metadata: {
        support_request_id: supportRequestId,
        reply_from_email: replyFromEmail,
      },
    })

    if (notificationError) {
      console.error('Unable to create customer support notification:', notificationError)
    }
  }

  return {
    ok: true,
    providerMessageId,
    requesterUserId: linkedUserId,
  }
}

'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient as createAdminClient } from '@supabase/supabase-js'

import { createClient } from '@/lib/supabase/server'
import { deliverCustomerSupportReply } from '@/lib/support/customer-reply'

const VALID_STATUSES = new Set(['open', 'in_progress', 'resolved', 'closed'])

function value(formData: FormData, key: string, maxLength: number) {
  const entry = formData.get(key)
  return typeof entry === 'string' ? entry.trim().slice(0, maxLength) : ''
}

function replySubject(topic: string) {
  const trimmed = topic.trim() || 'RaiseHub support'
  return /^re:/i.test(trimmed) ? trimmed : `Re: ${trimmed}`
}

export async function updateSupportRequest(formData: FormData) {
  const id = value(formData, 'id', 100)
  const status = value(formData, 'status', 40)
  const internalNotes = value(formData, 'internal_notes', 5000)
  const customerReply = value(formData, 'customer_reply', 5000)
  const intent = value(formData, 'intent', 40)

  if (!id || !VALID_STATUSES.has(status)) return
  if (intent === 'publish_reply' && !customerReply) return

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle<{ role: string }>()

  if (profile?.role !== 'owner') redirect('/dashboard')

  const { data: requestRow } = await supabase
    .from('support_requests')
    .select('requester_email, requester_user_id, topic, reply_from_email, provider_message_id')
    .eq('id', id)
    .maybeSingle<{
      requester_email: string
      requester_user_id: string | null
      topic: string
      reply_from_email: string | null
      provider_message_id: string | null
    }>()

  if (!requestRow) return

  let sentProviderMessageId: string | null = null
  let linkedRequesterUserId = requestRow.requester_user_id
  let replyFromEmail = requestRow.reply_from_email || 'support@raisehub.app'
  let replyDisplayName = 'RaiseHub Support'

  const { data: route } = await supabase
    .from('support_email_routes')
    .select('address, display_name')
    .eq('address', replyFromEmail)
    .eq('is_active', true)
    .maybeSingle<{ address: string; display_name: string }>()

  if (route) {
    replyFromEmail = route.address
    replyDisplayName = route.display_name
  }

  if (intent === 'publish_reply') {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('Unable to publish support reply: Supabase service role is missing.')
      return
    }

    const admin = createAdminClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const delivery = await deliverCustomerSupportReply({
      admin,
      supportRequestId: id,
      requesterEmail: requestRow.requester_email,
      requesterUserId: requestRow.requester_user_id,
      topic: requestRow.topic,
      replyFromEmail,
      replyDisplayName,
      body: customerReply,
      providerInReplyTo: requestRow.provider_message_id,
    })

    if (!delivery.ok) return

    sentProviderMessageId = delivery.providerMessageId
    linkedRequesterUserId = delivery.requesterUserId
  }

  const now = new Date().toISOString()
  const effectiveStatus = intent === 'publish_reply' ? 'closed' : status

  const { error } = await supabase
    .from('support_requests')
    .update({
      status: effectiveStatus,
      assigned_to: user.id,
      requester_user_id: linkedRequesterUserId,
      internal_notes: internalNotes || null,
      customer_reply: customerReply || null,
      customer_reply_sent_at:
        intent === 'publish_reply'
          ? now
          : intent === 'save_draft'
            ? null
            : undefined,
      reply_from_email: replyFromEmail,
      updated_at: now,
    })
    .eq('id', id)

  if (error) {
    console.error('Unable to update support request:', error)
    return
  }

  if (intent === 'publish_reply') {
    const { error: messageError } = await supabase
      .from('support_request_messages')
      .insert({
        support_request_id: id,
        direction: 'outbound',
        sender_email: replyFromEmail,
        recipient_emails: [requestRow.requester_email],
        subject: replySubject(requestRow.topic),
        body_text: customerReply,
        provider_message_id: sentProviderMessageId,
        provider_in_reply_to: requestRow.provider_message_id,
        created_by: user.id,
      })

    if (messageError) {
      console.error('Unable to store support reply history:', messageError)
    }
  }

  revalidatePath('/dashboard/owner/support/requests')
  revalidatePath('/support')
  revalidatePath('/dashboard/notifications')
}

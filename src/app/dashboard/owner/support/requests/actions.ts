'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'

const VALID_STATUSES = new Set(['open', 'in_progress', 'resolved', 'closed'])

function value(formData: FormData, key: string, maxLength: number) {
  const entry = formData.get(key)
  return typeof entry === 'string' ? entry.trim().slice(0, maxLength) : ''
}

export async function updateSupportRequest(formData: FormData) {
  const id = value(formData, 'id', 100)
  const status = value(formData, 'status', 40)
  const internalNotes = value(formData, 'internal_notes', 5000)
  const customerReply = value(formData, 'customer_reply', 5000)
  const intent = value(formData, 'intent', 40)

  if (!id || !VALID_STATUSES.has(status)) {
    return
  }

  if (intent === 'publish_reply' && !customerReply) {
    return
  }

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

  const now = new Date().toISOString()
  const { error } = await supabase
    .from('support_requests')
    .update({
      status,
      assigned_to: user.id,
      internal_notes: internalNotes || null,
      customer_reply: customerReply || null,
      customer_reply_sent_at:
        intent === 'publish_reply'
          ? now
          : intent === 'save_draft'
            ? null
            : undefined,
      updated_at: now,
    })
    .eq('id', id)

  if (error) {
    console.error('Unable to update support request:', error)
    return
  }

  revalidatePath('/dashboard/owner/support/requests')
  revalidatePath('/support')
}

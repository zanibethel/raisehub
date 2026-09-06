'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'

function text(formData: FormData, key: string, maxLength: number) {
  const value = formData.get(key)
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
}

function parseRecipients(value: string) {
  return Array.from(
    new Set(
      value
        .split(/[\n,;]/)
        .map((entry) => entry.trim().toLowerCase())
        .filter((entry) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(entry))
    )
  ).slice(0, 20)
}

export async function updateSupportEmailRoute(formData: FormData) {
  const id = text(formData, 'id', 100)
  const recipients = parseRecipients(text(formData, 'forward_to', 3000))
  const isActive = formData.get('is_active') === 'on'

  if (!id) return

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

  const { error } = await supabase
    .from('support_email_routes')
    .update({
      forward_to: recipients,
      is_active: isActive,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) {
    console.error('Unable to update support email route:', error)
    return
  }

  revalidatePath('/dashboard/owner/support/email-routing')
}

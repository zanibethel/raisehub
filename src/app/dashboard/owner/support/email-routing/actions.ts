'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'

const EMAIL_ROUTE_PATH = '/dashboard/owner/support/email-routing'

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
  ).slice(0, 50)
}

function normalizeLocalPart(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/@raisehub\.app$/i, '')
}

function bucketFromLocalPart(localPart: string) {
  return localPart
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40)
}

async function requireOwner() {
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

  return { supabase, user }
}

export async function createSupportEmailRoute(formData: FormData) {
  const localPart = normalizeLocalPart(text(formData, 'local_part', 80))
  const label = text(formData, 'label', 80)
  const displayName = text(formData, 'display_name', 120)
  const recipients = parseRecipients(text(formData, 'forward_to', 8000))
  const isActive = formData.get('is_active') === 'on'
  const acceptsInbound = formData.get('accepts_inbound') === 'on'
  const forwardEnabled = formData.get('forward_enabled') === 'on'

  if (!/^[a-z0-9][a-z0-9._-]{0,62}$/.test(localPart)) {
    redirect(`${EMAIL_ROUTE_PATH}?error=invalid-address`)
  }

  const bucket = bucketFromLocalPart(localPart)
  if (!bucket || !/^[a-z][a-z0-9_]{1,39}$/.test(bucket)) {
    redirect(`${EMAIL_ROUTE_PATH}?error=invalid-bucket`)
  }

  if (!label || !displayName) {
    redirect(`${EMAIL_ROUTE_PATH}?error=missing-details`)
  }

  const address = `${localPart}@raisehub.app`
  const { supabase } = await requireOwner()

  const { error } = await supabase.from('support_email_routes').insert({
    address,
    label,
    bucket,
    display_name: displayName,
    forward_to: recipients,
    is_active: isActive,
    accepts_inbound: acceptsInbound,
    forward_enabled: acceptsInbound && forwardEnabled && recipients.length > 0,
    updated_at: new Date().toISOString(),
  })

  if (error) {
    console.error('Unable to create support email route:', error)
    redirect(`${EMAIL_ROUTE_PATH}?error=route-exists`)
  }

  revalidatePath(EMAIL_ROUTE_PATH)
  revalidatePath('/dashboard/owner/support/requests')
  redirect(`${EMAIL_ROUTE_PATH}?created=${encodeURIComponent(address)}`)
}

export async function updateSupportEmailRoute(formData: FormData) {
  const id = text(formData, 'id', 100)
  const recipients = parseRecipients(text(formData, 'forward_to', 8000))
  const isActive = formData.get('is_active') === 'on'
  const forwardEnabled = formData.get('forward_enabled') === 'on'

  if (!id) return

  const { supabase } = await requireOwner()

  const { error } = await supabase
    .from('support_email_routes')
    .update({
      forward_to: recipients,
      is_active: isActive,
      forward_enabled: forwardEnabled && recipients.length > 0,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) {
    console.error('Unable to update support email route:', error)
    return
  }

  revalidatePath(EMAIL_ROUTE_PATH)
}

'use server'

import { revalidatePath } from 'next/cache'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

const ALLOWED_KINDS = new Set([
  'announcement',
  'upgrade',
  'business_promo',
  'organization_promo',
  'system',
])
const ALLOWED_ROLES = new Set(['customer', 'business', 'organization', 'owner'])
const ALLOWED_ENVIRONMENTS = new Set(['all', 'production', 'demo'])

async function requireOwner() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Authentication required')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle<{ role: string }>()

  if (profile?.role !== 'owner') throw new Error('Owner access required')
  return user
}

function optionalText(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? '').trim()
  return value || null
}

function optionalDate(formData: FormData, key: string) {
  const raw = optionalText(formData, key)
  if (!raw) return null
  const parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime())) throw new Error(`Invalid ${key}`)
  return parsed.toISOString()
}

function positiveInteger(formData: FormData, key: string, fallback: number) {
  const parsed = Number.parseInt(String(formData.get(key) ?? ''), 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

export async function createSpotlightCampaignAction(formData: FormData) {
  const user = await requireOwner()
  const admin = createAdminClient() as any

  const title = String(formData.get('title') ?? '').trim()
  if (!title) throw new Error('Spotlight title is required')

  const kindRaw = String(formData.get('kind') ?? 'announcement')
  const kind = ALLOWED_KINDS.has(kindRaw) ? kindRaw : 'announcement'
  const environmentRaw = String(formData.get('environment_scope') ?? 'all')
  const environmentScope = ALLOWED_ENVIRONMENTS.has(environmentRaw)
    ? environmentRaw
    : 'all'

  const audienceRoles = formData
    .getAll('audience_roles')
    .map(String)
    .filter((role) => ALLOWED_ROLES.has(role))
  if (audienceRoles.length === 0) throw new Error('Choose at least one audience')

  const startsAt = optionalDate(formData, 'starts_at') ?? new Date().toISOString()
  const endsAt = optionalDate(formData, 'ends_at')
  if (endsAt && new Date(endsAt).getTime() <= new Date(startsAt).getTime()) {
    throw new Error('End date must be after the start date')
  }

  const repeatRaw = String(formData.get('repeat_after_hours') ?? '').trim()
  const repeatAfterHours = repeatRaw
    ? positiveInteger(formData, 'repeat_after_hours', 24)
    : null

  const { error } = await admin.from('spotlight_campaigns').insert({
    title,
    body: optionalText(formData, 'body'),
    image_url: optionalText(formData, 'image_url'),
    cta_label: optionalText(formData, 'cta_label'),
    cta_url: optionalText(formData, 'cta_url'),
    secondary_cta_label: optionalText(formData, 'secondary_cta_label'),
    secondary_cta_url: optionalText(formData, 'secondary_cta_url'),
    kind,
    audience_roles: audienceRoles,
    environment_scope: environmentScope,
    priority: positiveInteger(formData, 'priority', 100),
    starts_at: startsAt,
    ends_at: endsAt,
    is_active: formData.get('is_active') === 'on',
    dismissible: formData.get('dismissible') === 'on',
    max_views_per_user: positiveInteger(formData, 'max_views_per_user', 1),
    repeat_after_hours: repeatAfterHours,
    created_by: user.id,
  })

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/owner/spotlights')
  revalidatePath('/dashboard')
}

export async function toggleSpotlightCampaignAction(formData: FormData) {
  await requireOwner()
  const id = String(formData.get('id') ?? '').trim()
  if (!id) throw new Error('Spotlight campaign ID is required')

  const nextActive = String(formData.get('next_active') ?? '') === 'true'
  const admin = createAdminClient() as any
  const { error } = await admin
    .from('spotlight_campaigns')
    .update({ is_active: nextActive })
    .eq('id', id)

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/owner/spotlights')
  revalidatePath('/dashboard')
}

export async function deleteSpotlightCampaignAction(formData: FormData) {
  await requireOwner()
  const id = String(formData.get('id') ?? '').trim()
  if (!id) throw new Error('Spotlight campaign ID is required')

  const admin = createAdminClient() as any
  const { error } = await admin.from('spotlight_campaigns').delete().eq('id', id)
  if (error) throw new Error(error.message)

  revalidatePath('/dashboard/owner/spotlights')
  revalidatePath('/dashboard')
}

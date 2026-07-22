'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

type UpdateOrganizationProfileInput = {
  name: string
  organizationType: string
  description: string
  phone: string
  email: string
  websiteUrl: string
  townName: string
  stateCode: string
}

type UpdateOrganizationProfileResult =
  | { success: true; error?: never }
  | { success?: never; error: string }

function clean(value: string, maxLength: number) {
  const normalized = value.trim()
  return normalized ? normalized.slice(0, maxLength) : null
}

export async function updateOrganizationProfileAction(
  input: UpdateOrganizationProfileInput
): Promise<UpdateOrganizationProfileResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'You must be signed in to update your organization.' }
  }

  const name = clean(input.name, 160)
  const townName = clean(input.townName, 120)
  const stateCode = input.stateCode.trim().toUpperCase()

  if (!name) {
    return { error: 'Organization name is required.' }
  }

  if (!townName) {
    return { error: 'Town or city is required so RaiseHub can apply local pricing.' }
  }

  if (!/^[A-Z]{2}$/.test(stateCode)) {
    return { error: 'Enter a valid two-letter state code.' }
  }

  const admin = createAdminClient()
  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('id, role, is_demo')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError || profile?.role !== 'organization') {
    return { error: 'This account is not authorized to manage an organization.' }
  }

  const payload = {
    legacy_profile_id: user.id,
    name,
    organization_type: clean(input.organizationType, 80),
    description: clean(input.description, 1200),
    phone: clean(input.phone, 40),
    email: clean(input.email, 320) ?? user.email ?? null,
    website_url: clean(input.websiteUrl, 500),
    town_name: townName,
    state_code: stateCode,
    status: 'active',
    created_by: user.id,
    updated_at: new Date().toISOString(),
  }

  const { data: organization, error: organizationError } = await admin
    .from('organizations')
    .upsert(payload, { onConflict: 'legacy_profile_id' })
    .select('id')
    .single()

  if (organizationError || !organization) {
    return { error: 'Your organization details could not be saved. Please try again.' }
  }

  const { error: membershipError } = await admin
    .from('organization_memberships')
    .upsert(
      {
        organization_id: organization.id,
        user_id: user.id,
        membership_role: 'admin',
        status: 'active',
        accepted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'organization_id,user_id' }
    )

  if (membershipError) {
    return { error: 'Organization details were saved, but access setup could not be completed.' }
  }

  await admin
    .from('profiles')
    .update({
      business_name: name,
      display_name: name,
      business_description: clean(input.description, 1200),
      phone: clean(input.phone, 40),
      website_url: clean(input.websiteUrl, 500),
    })
    .eq('id', user.id)

  revalidatePath('/dashboard')
  revalidatePath('/campaigns')
  revalidatePath('/')

  return { success: true }
}

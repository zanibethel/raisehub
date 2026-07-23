'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

type UpdateOrganizationProfileInput = {
  organizationId: string
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

  const organizationId = input.organizationId.trim()
  const name = clean(input.name, 160)
  const townName = clean(input.townName, 120)
  const stateCode = input.stateCode.trim().toUpperCase()

  if (!organizationId) {
    return { error: 'Choose an organization workspace before saving.' }
  }

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
  const { data: membership, error: membershipError } = await admin
    .from('organization_memberships')
    .select('id, membership_role')
    .eq('organization_id', organizationId)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle()

  if (
    membershipError ||
    !membership ||
    !['admin', 'manager'].includes(membership.membership_role)
  ) {
    return { error: 'This account is not authorized to edit this organization.' }
  }

  const payload = {
    name,
    organization_type: clean(input.organizationType, 80),
    description: clean(input.description, 1200),
    phone: clean(input.phone, 40),
    email: clean(input.email, 320) ?? user.email ?? null,
    website_url: clean(input.websiteUrl, 500),
    town_name: townName,
    state_code: stateCode,
    status: 'active',
    updated_at: new Date().toISOString(),
  }

  // The live schema includes town_name and state_code. The checked-in generated
  // Supabase types predate those columns, so keep this compatibility cast local.
  const { error: organizationError } = await admin
    .from('organizations')
    .update(payload as never)
    .eq('id', organizationId)

  if (organizationError) {
    return { error: 'Your organization details could not be saved. Please try again.' }
  }

  revalidatePath('/dashboard')
  revalidatePath('/campaigns')
  revalidatePath('/')

  return { success: true }
}

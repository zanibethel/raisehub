import { cookies } from 'next/headers'

import { getAuthenticatedWorkspaces } from '@/lib/services/authenticated-workspace-service'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import OrganizationProfileSetupSection from './sections/organization-profile-setup-section'

type OrganizationSetupRecord = {
  id: string
  name: string
  organization_type: string | null
  description: string | null
  phone: string | null
  email: string | null
  website_url: string | null
  town_name: string | null
  state_code: string | null
}

const WORKSPACE_PREFERENCE_COOKIE = 'raisehub-selected-workspace'

export default async function OrganizationProfileSetupLoader() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const workspaceResult = await getAuthenticatedWorkspaces()
  const selectedWorkspaceKey =
    (await cookies()).get(WORKSPACE_PREFERENCE_COOKIE)?.value.trim() || ''
  const selectedWorkspace = workspaceResult.success
    ? workspaceResult.workspaces.find(
        (workspace) =>
          workspace.key === selectedWorkspaceKey &&
          (workspace.kind === 'organization' || workspace.kind === 'fundraising')
      )
    : null
  const selectedOrganizationId = selectedWorkspace?.workspaceId ?? null

  if (!selectedOrganizationId) {
    return null
  }

  const admin = createAdminClient()
  const profileRequest = admin
    .from('profiles')
    .select(
      'business_name, display_name, business_description, phone, email, website_url'
    )
    .eq('id', user.id)
    .maybeSingle()

  // The live schema includes town_name and state_code. The checked-in generated
  // Supabase types predate those columns, so keep this compatibility cast local
  // until the generated type file is refreshed from the live project.
  const organizationRequest = (admin.from('organizations') as any)
    .select(
      'id, name, organization_type, description, phone, email, website_url, town_name, state_code'
    )
    .eq('id', selectedOrganizationId)
    .maybeSingle()

  const [{ data: profile }, { data: organizationResult }] = await Promise.all([
    profileRequest,
    organizationRequest,
  ])
  const organization = organizationResult as OrganizationSetupRecord | null

  if (!organization) {
    return null
  }

  const profileData = {
    name:
      organization.name ||
      profile?.business_name ||
      profile?.display_name ||
      '',
    organizationType: organization.organization_type || '',
    description:
      organization.description ||
      profile?.business_description ||
      '',
    phone: organization.phone || profile?.phone || '',
    email: organization.email || profile?.email || user.email || '',
    websiteUrl:
      organization.website_url || profile?.website_url || '',
    townName: organization.town_name || '',
    stateCode: organization.state_code || '',
  }

  const isComplete = Boolean(
    profileData.name.trim() &&
      profileData.townName.trim() &&
      /^[A-Z]{2}$/.test(profileData.stateCode)
  )

  return (
    <OrganizationProfileSetupSection
      organizationId={organization.id}
      profile={profileData}
      isComplete={isComplete}
    />
  )
}

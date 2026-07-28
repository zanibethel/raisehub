import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'

export type WorkspaceProfileRole =
  | 'business'
  | 'organization'
  | 'customer'

export type WorkspaceProfile = {
  id: string
  canonical_workspace_id: string | null
  lifecycle_status: string | null
  is_demo: boolean
  email: string | null
  role: WorkspaceProfileRole
  full_name: string | null
  business_name: string | null
  display_name: string | null
  phone: string | null
  address: string | null
  website_url: string | null
  logo_url: string | null
  business_description: string | null
  subscription_tier: string
  onboarding_completed: boolean
}

type WorkspaceProfilesResult = {
  profiles: WorkspaceProfile[]
  error: string | null
}

type CanonicalWorkspace = {
  id: string
  legacy_profile_id: string | null
  status: string | null
  is_demo: boolean | null
}

export async function getWorkspaceProfiles(): Promise<WorkspaceProfilesResult> {
  const admin = createAdminClient() as any

  const [profilesResult, businessesResult, organizationsResult] = await Promise.all([
    admin
      .from('profiles')
      .select(
        'id, email, role, full_name, business_name, display_name, phone, address, website_url, logo_url, business_description, subscription_tier, onboarding_completed, is_demo'
      )
      .in('role', ['business', 'organization', 'customer'])
      .order('created_at', { ascending: false }),
    admin
      .from('businesses')
      .select('id, legacy_profile_id, status, is_demo'),
    admin
      .from('organizations')
      .select('id, legacy_profile_id, status, is_demo'),
  ])

  const error =
    profilesResult.error || businessesResult.error || organizationsResult.error

  if (error) {
    return { profiles: [], error: error.message }
  }

  const businessesByProfile = new Map<string, CanonicalWorkspace>(
    (businessesResult.data ?? [])
      .filter((workspace: CanonicalWorkspace) => workspace.legacy_profile_id)
      .map((workspace: CanonicalWorkspace) => [
        workspace.legacy_profile_id as string,
        workspace,
      ])
  )
  const organizationsByProfile = new Map<string, CanonicalWorkspace>(
    (organizationsResult.data ?? [])
      .filter((workspace: CanonicalWorkspace) => workspace.legacy_profile_id)
      .map((workspace: CanonicalWorkspace) => [
        workspace.legacy_profile_id as string,
        workspace,
      ])
  )

  const profiles = (profilesResult.data ?? []).map((profile: any) => {
    const canonical =
      profile.role === 'business'
        ? businessesByProfile.get(profile.id)
        : profile.role === 'organization'
          ? organizationsByProfile.get(profile.id)
          : null

    return {
      ...profile,
      canonical_workspace_id: canonical?.id ?? null,
      lifecycle_status: canonical?.status ?? null,
      is_demo: Boolean(profile.is_demo || canonical?.is_demo),
    } as WorkspaceProfile
  })

  return { profiles, error: null }
}

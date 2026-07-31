import 'server-only'

import {
  recordsShareEnvironment,
  type EnvironmentOwnedRecord,
} from '@/lib/data-environment'
import { createAdminClient } from '@/lib/supabase/admin'

export type WorkspaceProfileRole = 'business' | 'organization' | 'customer'

export type WorkspaceProfile = EnvironmentOwnedRecord & {
  id: string
  canonical_workspace_id: string | null
  lifecycle_status: string | null
  is_demo: boolean
  demo_group: string | null
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
  business_category: string | null
  facebook_url: string | null
  instagram_url: string | null
  tiktok_url: string | null
  subscription_tier: string
  onboarding_completed: boolean
}

type WorkspaceProfilesResult = {
  profiles: WorkspaceProfile[]
  error: string | null
}

type CanonicalWorkspace = EnvironmentOwnedRecord & {
  id: string
  legacy_profile_id: string | null
  status: string | null
  is_demo: boolean
  demo_group: string | null
}

function hasValidEnvironment(record: EnvironmentOwnedRecord): boolean {
  const group = record.demo_group?.trim() || null
  return record.is_demo === true ? Boolean(group) : group === null
}

export async function getWorkspaceProfiles(): Promise<WorkspaceProfilesResult> {
  const admin = createAdminClient() as any

  const [profilesResult, businessesResult, organizationsResult] = await Promise.all([
    admin
      .from('profiles')
      .select(
        'id, email, role, full_name, business_name, display_name, phone, address, website_url, logo_url, business_description, business_category, facebook_url, instagram_url, tiktok_url, subscription_tier, onboarding_completed, is_demo, demo_group'
      )
      .in('role', ['business', 'organization', 'customer'])
      .order('created_at', { ascending: false }),
    admin
      .from('businesses')
      .select('id, legacy_profile_id, status, is_demo, demo_group'),
    admin
      .from('organizations')
      .select('id, legacy_profile_id, status, is_demo, demo_group'),
  ])

  const error =
    profilesResult.error || businessesResult.error || organizationsResult.error

  if (error) return { profiles: [], error: error.message }

  const businessesByProfile = new Map<string, CanonicalWorkspace>(
    (businessesResult.data ?? [])
      .filter(
        (workspace: CanonicalWorkspace) =>
          Boolean(workspace.legacy_profile_id) && hasValidEnvironment(workspace)
      )
      .map((workspace: CanonicalWorkspace) => [
        workspace.legacy_profile_id as string,
        workspace,
      ])
  )

  const organizationsByProfile = new Map<string, CanonicalWorkspace>(
    (organizationsResult.data ?? [])
      .filter(
        (workspace: CanonicalWorkspace) =>
          Boolean(workspace.legacy_profile_id) && hasValidEnvironment(workspace)
      )
      .map((workspace: CanonicalWorkspace) => [
        workspace.legacy_profile_id as string,
        workspace,
      ])
  )

  const profiles = (profilesResult.data ?? [])
    .filter((profile: WorkspaceProfile) => hasValidEnvironment(profile))
    .flatMap((profile: WorkspaceProfile) => {
      const canonical =
        profile.role === 'business'
          ? businessesByProfile.get(profile.id)
          : profile.role === 'organization'
            ? organizationsByProfile.get(profile.id)
            : null

      if (
        (profile.role === 'business' || profile.role === 'organization') &&
        (!canonical || !recordsShareEnvironment(profile, canonical))
      ) {
        return []
      }

      return [
        {
          ...profile,
          canonical_workspace_id: canonical?.id ?? null,
          lifecycle_status: canonical?.status ?? null,
          is_demo: profile.is_demo === true,
          demo_group: profile.demo_group?.trim() || null,
        } as WorkspaceProfile,
      ]
    })

  return { profiles, error: null }
}

import type {
  WorkspaceCardData,
  WorkspaceRole,
} from '@/lib/types/identity-access'
import { createClient } from '@/lib/supabase/server'
import { getOwnerWorkspacesResult } from '@/lib/services/workspace-service'

// =============================================================================
// Types
// =============================================================================

export type OwnerWorkspaceAuthorizationFailureReason =
  | 'unauthenticated'
  | 'owner-role-required'
  | 'workspace-not-found'
  | 'workspace-role-mismatch'
  | 'lookup-failure'

export type OwnerWorkspaceAuthorizationResult =
  | {
      authorized: true
      workspace: WorkspaceCardData
    }
  | {
      authorized: false
      reason: OwnerWorkspaceAuthorizationFailureReason
      message: string
    }

type ActorProfile = {
  role: string
}

type CanonicalBusiness = {
  id: string
  legacy_profile_id: string | null
  name: string
  status: string
  subscription_tier: string
  phone: string | null
  email: string | null
}

type LegacyBusinessProfile = {
  email: string | null
  phone: string | null
  business_name: string | null
  display_name: string | null
  full_name: string | null
}

function businessStatusLabel(status: string): string {
  switch (status) {
    case 'archived':
      return 'archived'
    case 'restore_requested':
      return 'restore_requested'
    case 'suspended':
      return 'suspended'
    case 'inactive':
      return 'inactive'
    default:
      return 'active'
  }
}

async function getCanonicalBusinessWorkspace(
  workspaceId: string
): Promise<WorkspaceCardData | null> {
  const supabase = await createClient()

  const { data: business, error } = await supabase
    .from('businesses')
    .select(
      'id, legacy_profile_id, name, status, subscription_tier, phone, email'
    )
    .eq('id', workspaceId)
    .maybeSingle<CanonicalBusiness>()

  if (error || !business) return null

  let legacyProfile: LegacyBusinessProfile | null = null

  if (business.legacy_profile_id) {
    const { data } = await supabase
      .from('profiles')
      .select('email, phone, business_name, display_name, full_name')
      .eq('id', business.legacy_profile_id)
      .maybeSingle<LegacyBusinessProfile>()

    legacyProfile = data ?? null
  }

  const name =
    business.name ||
    legacyProfile?.business_name ||
    legacyProfile?.display_name ||
    legacyProfile?.full_name ||
    business.email ||
    legacyProfile?.email ||
    'Unnamed business'

  return {
    id: business.id,
    role: 'business',
    name,
    subtitle:
      business.status === 'archived'
        ? 'Archived business workspace'
        : business.status === 'restore_requested'
          ? 'Business restoration requested'
          : 'Business workspace',
    status: businessStatusLabel(business.status),
    planLabel:
      business.subscription_tier?.toLowerCase() === 'free'
        ? 'Free plan'
        : `${business.subscription_tier} plan`,
    setupPercentage: 0,
    completedSetupItems: 0,
    totalSetupItems: 0,
    missingSetupItems: [],
    email: business.email ?? legacyProfile?.email ?? null,
    phone: business.phone ?? legacyProfile?.phone ?? null,
  }
}

// =============================================================================
// Service
// =============================================================================

export async function authorizeOwnerWorkspaceRead(
  workspaceId: string,
  workspaceRole: WorkspaceRole
): Promise<OwnerWorkspaceAuthorizationResult> {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return {
      authorized: false,
      reason: 'unauthenticated',
      message: 'No authenticated session.',
    }
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single<ActorProfile>()

  if (profileError || !profile) {
    return {
      authorized: false,
      reason: 'lookup-failure',
      message: 'Unable to load actor profile.',
    }
  }

  if (profile.role !== 'owner') {
    return {
      authorized: false,
      reason: 'owner-role-required',
      message: 'Access denied.',
    }
  }

  const { workspaces, error: workspacesError } =
    await getOwnerWorkspacesResult()

  if (workspacesError) {
    return {
      authorized: false,
      reason: 'lookup-failure',
      message: 'Unable to load workspaces.',
    }
  }

  let workspace = workspaces.find((candidate) => candidate.id === workspaceId)

  // Canonical business workspaces use the businesses.id value. Archived records
  // must remain resolvable even when they are intentionally absent from active
  // profile listings or discovery queries.
  if (!workspace && workspaceRole === 'business') {
    workspace = (await getCanonicalBusinessWorkspace(workspaceId)) ?? undefined
  }

  if (!workspace) {
    return {
      authorized: false,
      reason: 'workspace-not-found',
      message: 'Workspace not found.',
    }
  }

  if (workspace.role !== workspaceRole) {
    return {
      authorized: false,
      reason: 'workspace-role-mismatch',
      message: 'Access denied.',
    }
  }

  return {
    authorized: true,
    workspace,
  }
}

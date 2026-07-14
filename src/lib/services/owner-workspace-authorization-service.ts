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

// =============================================================================
// Service
// =============================================================================

export async function authorizeOwnerWorkspaceRead(
  workspaceId: string,
  workspaceRole: WorkspaceRole
): Promise<OwnerWorkspaceAuthorizationResult> {
  const supabase = await createClient()

  // Step 1: Verify an authenticated session exists.
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

  // Step 2: Load the actor's stored profile and confirm the role is owner.
  const { data: profile, error: profileError } =
    await supabase
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

  // Step 3: Load workspaces and validate the requested workspace.
  const { workspaces, error: workspacesError } =
    await getOwnerWorkspacesResult()

  if (workspacesError) {
    return {
      authorized: false,
      reason: 'lookup-failure',
      message: 'Unable to load workspaces.',
    }
  }

  const workspace = workspaces.find(
    (w) => w.id === workspaceId
  )

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

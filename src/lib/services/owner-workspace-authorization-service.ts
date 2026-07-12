import type {
  WorkspaceCardData,
  WorkspaceRole,
} from '@/components/platform/workspace-card'
import { getOwnerWorkspaces } from '@/lib/services/workspace-service'

// =============================================================================
// Types
// =============================================================================

export type OwnerIdentity = {
  userId: string
  role: string
}

export type OwnerWorkspaceAuthorizationResult =
  | {
      authorized: true
      workspace: WorkspaceCardData
    }
  | {
      authorized: false
      reason: string
    }

// =============================================================================
// Service
// =============================================================================

export async function authorizeOwnerWorkspaceRead(
  owner: OwnerIdentity,
  workspaceId: string,
  workspaceRole: WorkspaceRole
): Promise<OwnerWorkspaceAuthorizationResult> {
  if (owner.role !== 'owner') {
    return {
      authorized: false,
      reason: 'Access denied. Owner role required.',
    }
  }

  const workspaces = await getOwnerWorkspaces()

  const workspace = workspaces.find(
    (w) => w.id === workspaceId
  )

  if (!workspace) {
    return {
      authorized: false,
      reason: 'Workspace not found.',
    }
  }

  if (workspace.role !== workspaceRole) {
    return {
      authorized: false,
      reason: `Workspace role mismatch. Expected ${workspaceRole}, found ${workspace.role}.`,
    }
  }

  return {
    authorized: true,
    workspace,
  }
}

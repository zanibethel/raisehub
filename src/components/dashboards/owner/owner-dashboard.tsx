import type {
  WorkspaceCardData,
  WorkspaceRole,
} from '@/components/platform/workspace-card'
import type { WorkspaceSupportMode } from '@/components/platform/selected-workspace-panel'
import { getOwnerWorkspaces } from '@/lib/services/workspace-service'

import OwnerDashboardContent from './owner-dashboard-content'

// =============================================================================
// Types
// =============================================================================

export type PreviewRole =
  | 'customer'
  | 'business'
  | 'organization'
  | 'admin'

type Props = {
  searchParams?: {
    previewRole?: string
    workspaceId?: string
    workspaceRole?: string
    supportMode?: string
  }
}

// =============================================================================
// Constants
// =============================================================================

const VALID_PREVIEW_ROLES: PreviewRole[] = [
  'customer',
  'business',
  'organization',
  'admin',
]

const VALID_WORKSPACE_ROLES: WorkspaceRole[] = [
  'customer',
  'business',
  'organization',
]

// =============================================================================
// Helpers
// =============================================================================

function resolvePreviewRole(
  previewRole?: string
): PreviewRole {
  return VALID_PREVIEW_ROLES.includes(
    previewRole as PreviewRole
  )
    ? (previewRole as PreviewRole)
    : 'customer'
}

function resolveWorkspaceRole(
  workspaceRole?: string
): WorkspaceRole | null {
  return VALID_WORKSPACE_ROLES.includes(
    workspaceRole as WorkspaceRole
  )
    ? (workspaceRole as WorkspaceRole)
    : null
}

function resolveWorkspaceMode(
  supportMode?: string
): WorkspaceSupportMode {
  return supportMode === 'read-only'
    ? 'read-only'
    : 'workspace'
}

function resolveSelectedWorkspace({
  workspaces,
  workspaceId,
  workspaceRole,
}: {
  workspaces: WorkspaceCardData[]
  workspaceId?: string
  workspaceRole?: string
}): WorkspaceCardData | null {
  if (!workspaceId) {
    return null
  }

  const validWorkspaceRole =
    resolveWorkspaceRole(workspaceRole)

  if (!validWorkspaceRole) {
    return null
  }

  return (
    workspaces.find(
      (workspace) =>
        workspace.id === workspaceId &&
        workspace.role === validWorkspaceRole
    ) ?? null
  )
}

// =============================================================================
// Loader
// =============================================================================

export default async function OwnerDashboard({
  searchParams,
}: Props) {
  const previewRole = resolvePreviewRole(
    searchParams?.previewRole
  )

  const workspaces = await getOwnerWorkspaces()

  const selectedWorkspace =
    resolveSelectedWorkspace({
      workspaces,
      workspaceId: searchParams?.workspaceId,
      workspaceRole: searchParams?.workspaceRole,
    })

  const workspaceMode = selectedWorkspace
    ? resolveWorkspaceMode(
        searchParams?.supportMode
      )
    : 'workspace'

  return (
    <OwnerDashboardContent
      activeRole={previewRole}
      workspaces={workspaces}
      selectedWorkspace={selectedWorkspace}
      workspaceMode={workspaceMode}
    />
  )
}
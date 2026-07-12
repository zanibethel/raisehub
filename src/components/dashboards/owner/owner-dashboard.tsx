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
  }
}

// =============================================================================
// Constants
// =============================================================================

const VALID_ROLES: PreviewRole[] = [
  'customer',
  'business',
  'organization',
  'admin',
]

// =============================================================================
// Helpers
// =============================================================================

function resolvePreviewRole(
  previewRole?: string
): PreviewRole {
  return VALID_ROLES.includes(previewRole as PreviewRole)
    ? (previewRole as PreviewRole)
    : 'customer'
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

  return (
    <OwnerDashboardContent
      activeRole={previewRole}
      workspaces={workspaces}
    />
  )
}
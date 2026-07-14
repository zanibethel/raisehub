import type {
  LegacyProfileRole,
  SelectableWorkspace,
  SelectableWorkspaceKind,
} from '../types/identity-access'

// =============================================================================
// Types
// =============================================================================

export type DashboardExperienceRole =
  | 'customer'
  | 'business'
  | 'organization'
  | 'admin'
  | 'owner'

export type WorkspaceSelectionResult = {
  selectedWorkspace: SelectableWorkspace | null
  selectedWorkspaceKey: string | null
  experienceRole: DashboardExperienceRole
  requestedWorkspaceWasValid: boolean
  usedFallback: boolean
}

// =============================================================================
// Input normalization
// =============================================================================

function getFirstSearchParamValue(
  value: string | string[] | undefined
): string | null {
  if (Array.isArray(value)) {
    return value[0]?.trim() || null
  }

  return value?.trim() || null
}

// =============================================================================
// Workspace lookup
// =============================================================================

function findWorkspaceByKey(
  workspaces: SelectableWorkspace[],
  key: string | null
): SelectableWorkspace | null {
  if (!key) {
    return null
  }

  return (
    workspaces.find((workspace) => workspace.key === key) ??
    null
  )
}

function findDefaultWorkspace(
  workspaces: SelectableWorkspace[]
): SelectableWorkspace | null {
  return (
    workspaces.find((workspace) => workspace.isDefault) ??
    workspaces[0] ??
    null
  )
}

// =============================================================================
// Experience mapping
// =============================================================================

export function mapWorkspaceKindToExperienceRole(
  kind: SelectableWorkspaceKind
): DashboardExperienceRole {
  switch (kind) {
    case 'customer':
      return 'customer'

    case 'fundraising':
      return 'organization'

    case 'organization':
      return 'organization'

    case 'business':
      return 'business'

    case 'owner':
      return 'owner'
  }
}

function mapLegacyRoleToExperienceRole(
  legacyRole: LegacyProfileRole | null
): DashboardExperienceRole {
  switch (legacyRole) {
    case 'business':
      return 'business'

    case 'organization':
      return 'organization'

    case 'admin':
      return 'admin'

    case 'owner':
      return 'owner'

    case 'customer':
    default:
      return 'customer'
  }
}

// =============================================================================
// Selection
// =============================================================================

export function resolveWorkspaceSelection(input: {
  requestedWorkspace?: string | string[]
  workspaces: SelectableWorkspace[]
  legacyRole: LegacyProfileRole | null
}): WorkspaceSelectionResult {
  const requestedWorkspaceKey = getFirstSearchParamValue(
    input.requestedWorkspace
  )

  const requestedWorkspace = findWorkspaceByKey(
    input.workspaces,
    requestedWorkspaceKey
  )

  if (requestedWorkspace) {
    return {
      selectedWorkspace: requestedWorkspace,
      selectedWorkspaceKey: requestedWorkspace.key,
      experienceRole: mapWorkspaceKindToExperienceRole(
        requestedWorkspace.kind
      ),
      requestedWorkspaceWasValid: true,
      usedFallback: false,
    }
  }

  const fallbackWorkspace = findDefaultWorkspace(
    input.workspaces
  )

  if (fallbackWorkspace) {
    return {
      selectedWorkspace: fallbackWorkspace,
      selectedWorkspaceKey: fallbackWorkspace.key,
      experienceRole: mapWorkspaceKindToExperienceRole(
        fallbackWorkspace.kind
      ),
      requestedWorkspaceWasValid:
        requestedWorkspaceKey === null,
      usedFallback: true,
    }
  }

  return {
    selectedWorkspace: null,
    selectedWorkspaceKey: null,
    experienceRole: mapLegacyRoleToExperienceRole(
      input.legacyRole
    ),
    requestedWorkspaceWasValid:
      requestedWorkspaceKey === null,
    usedFallback: true,
  }
}
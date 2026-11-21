import type {
  SelectableWorkspace,
  SelectableWorkspaceKind,
} from '../types/identity-access'

/**
 * Only UI navigation context is exported to the native app.
 * The server must reauthorize every action; these values confer no permissions.
 */
export type MobileWorkspace = {
  key: string
  kind: SelectableWorkspaceKind
  name: string
  subtitle: string | null
  workspaceId: string | null
  isDefault: boolean
}

export function toMobileWorkspaces(
  workspaces: SelectableWorkspace[]
): MobileWorkspace[] {
  return workspaces.map((workspace) => ({
    key: workspace.key,
    kind: workspace.kind,
    name: workspace.name,
    subtitle: workspace.subtitle,
    workspaceId: workspace.workspaceId,
    isDefault: workspace.isDefault,
  }))
}

/**
 * A selection is a UI preference, not an authorization.
 * A revoked or otherwise missing workspace falls back to a fresh authorized one.
 */
export function selectAuthorizedMobileWorkspace(
  workspaces: MobileWorkspace[],
  preferredKey: string | null | undefined
): MobileWorkspace | null {
  return (
    workspaces.find((workspace) => workspace.key === preferredKey) ??
    workspaces.find((workspace) => workspace.isDefault) ??
    workspaces.find((workspace) => workspace.kind === 'customer') ??
    workspaces[0] ??
    null
  )
}

export function parseMobileBearerAuthorization(
  authorization: string | null
): string | null {
  if (!authorization || authorization.length > 8192) return null
  const match = /^Bearer ([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)$/.exec(authorization)
  return match?.[1] ?? null
}

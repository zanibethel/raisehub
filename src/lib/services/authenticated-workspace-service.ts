import { resolveActorCapabilitySummary } from './capability-resolution-service'
import type {
  ActorCapabilitySummary,
  BusinessAccessRecord,
  CapabilitySource,
  OrganizationAccessRecord,
  SelectableWorkspace,
  SelectableWorkspaceKind,
} from '../types/identity-access'

export type AuthenticatedWorkspacesResult =
  | { success: true; workspaces: SelectableWorkspace[] }
  | {
      success: false
      reason: string
      message: string
      workspaces: []
    }

function buildWorkspaceKey(
  kind: SelectableWorkspaceKind,
  identifier: string
): string {
  return `${kind}:${identifier}`
}

function buildWorkspaceHref(key: string): string {
  return `/dashboard?workspace=${encodeURIComponent(key)}`
}

function getBusinessSubtitle(access: BusinessAccessRecord): string {
  switch (access.membership.membership_role) {
    case 'owner':
      return 'Business owner'
    case 'manager':
      return 'Business manager'
    case 'staff':
      return 'Business staff'
    default:
      return 'Business workspace'
  }
}

function getOrganizationSubtitle(access: OrganizationAccessRecord): string {
  switch (access.membership.membership_role) {
    case 'admin':
      return 'Organization administrator'
    case 'manager':
      return 'Organization manager'
    case 'seller':
      return 'Organization seller'
    default:
      return 'Organization workspace'
  }
}

function getFundraisingSubtitle(membershipRole: string): string {
  switch (membershipRole) {
    case 'admin':
      return 'Fundraising administrator'
    case 'manager':
      return 'Fundraising manager'
    case 'seller':
      return 'Seller experience'
    default:
      return 'Fundraising progress'
  }
}

function buildCustomerWorkspace(
  summary: ActorCapabilitySummary,
  source: CapabilitySource
): SelectableWorkspace {
  const key = buildWorkspaceKey('customer', summary.actor.id)

  return {
    key,
    kind: 'customer',
    name: 'My Pass',
    subtitle: 'Deals, savings, and purchased passes',
    href: buildWorkspaceHref(key),
    workspaceId: summary.actor.id,
    membershipId: null,
    legacyProfileId: summary.actor.id,
    source,
    isDefault: summary.legacyWorkspaceRole === 'customer',
  }
}

function buildBusinessWorkspace(
  summary: ActorCapabilitySummary,
  access: BusinessAccessRecord
): SelectableWorkspace {
  const key = buildWorkspaceKey('business', access.business.id)

  return {
    key,
    kind: 'business',
    name: access.business.name,
    subtitle: getBusinessSubtitle(access),
    href: buildWorkspaceHref(key),
    workspaceId: access.business.id,
    membershipId: access.membership.id,
    legacyProfileId: access.business.legacy_profile_id,
    source: 'business-membership',
    isDefault:
      summary.legacyWorkspaceRole === 'business' &&
      access.business.legacy_profile_id === summary.actor.id,
  }
}

function buildOrganizationWorkspace(
  summary: ActorCapabilitySummary,
  access: OrganizationAccessRecord
): SelectableWorkspace {
  const key = buildWorkspaceKey('organization', access.organization.id)

  return {
    key,
    kind: 'organization',
    name: access.organization.name,
    subtitle: getOrganizationSubtitle(access),
    href: buildWorkspaceHref(key),
    workspaceId: access.organization.id,
    membershipId: access.membership.id,
    legacyProfileId: access.organization.legacy_profile_id,
    source: 'organization-membership',
    isDefault:
      summary.legacyWorkspaceRole === 'organization' &&
      access.organization.legacy_profile_id === summary.actor.id,
  }
}

function buildOwnerWorkspace(
  summary: ActorCapabilitySummary
): SelectableWorkspace {
  const key = buildWorkspaceKey('owner', summary.actor.id)

  return {
    key,
    kind: 'owner',
    name: 'Owner Platform',
    subtitle: 'Operate and support RaiseHub',
    href: buildWorkspaceHref(key),
    workspaceId: summary.actor.id,
    membershipId: null,
    legacyProfileId: summary.actor.id,
    source: 'owner-role',
    isDefault: summary.actor.legacyRole === 'owner',
  }
}

function buildLegacyWorkspace(
  summary: ActorCapabilitySummary,
  kind: 'business' | 'organization'
): SelectableWorkspace {
  const key = buildWorkspaceKey(kind, `legacy-${summary.actor.id}`)

  return {
    key,
    kind,
    name:
      kind === 'business'
        ? 'Business Dashboard'
        : 'Organization Dashboard',
    subtitle:
      kind === 'business'
        ? 'Legacy business experience'
        : 'Legacy organization experience',
    href: buildWorkspaceHref(key),
    workspaceId: null,
    membershipId: null,
    legacyProfileId: summary.actor.id,
    source: 'legacy-profile',
    isDefault: true,
  }
}

const WORKSPACE_KIND_ORDER: Record<SelectableWorkspaceKind, number> = {
  customer: 0,
  fundraising: 1,
  organization: 2,
  business: 3,
  owner: 4,
}

function compareWorkspaces(
  first: SelectableWorkspace,
  second: SelectableWorkspace
): number {
  if (first.isDefault !== second.isDefault) {
    return first.isDefault ? -1 : 1
  }

  const kindDifference =
    WORKSPACE_KIND_ORDER[first.kind] -
    WORKSPACE_KIND_ORDER[second.kind]

  if (kindDifference !== 0) return kindDifference

  return first.name.localeCompare(second.name, undefined, {
    sensitivity: 'base',
  })
}

function addWorkspace(
  workspacesByKey: Map<string, SelectableWorkspace>,
  workspace: SelectableWorkspace
) {
  if (!workspacesByKey.has(workspace.key)) {
    workspacesByKey.set(workspace.key, workspace)
  }
}

export function buildSelectableWorkspaces(
  summary: ActorCapabilitySummary
): SelectableWorkspace[] {
  const workspacesByKey = new Map<string, SelectableWorkspace>()

  // Every authenticated person has a personal Supporter experience. Access to
  // paid benefits inside that experience remains entitlement-gated separately.
  const customerSource: CapabilitySource = summary.activeCustomerEntitlement
    ? 'customer-entitlement'
    : summary.hasLegacyCustomerPass
      ? 'legacy-customer-pass'
      : 'legacy-profile'

  addWorkspace(
    workspacesByKey,
    buildCustomerWorkspace(summary, customerSource)
  )

  const organizationAccessByMembershipId = new Map(
    summary.organizationAccess.map((access) => [
      access.membership.id,
      access,
    ])
  )

  for (const campaignAccess of summary.campaignAccess) {
    const membership = campaignAccess.organizationMembership
    const organizationAccess = organizationAccessByMembershipId.get(
      membership.id
    )
    const organizationName =
      organizationAccess?.organization.name ?? 'My Fundraising'
    const key = buildWorkspaceKey('fundraising', membership.id)

    addWorkspace(workspacesByKey, {
      key,
      kind: 'fundraising',
      name:
        organizationName === 'My Fundraising'
          ? organizationName
          : `${organizationName} Fundraising`,
      subtitle: getFundraisingSubtitle(membership.membership_role),
      href: buildWorkspaceHref(key),
      workspaceId: membership.organization_id,
      membershipId: membership.id,
      legacyProfileId:
        organizationAccess?.organization.legacy_profile_id ?? null,
      source: 'campaign-membership',
      isDefault: false,
    })
  }

  for (const access of summary.organizationAccess) {
    addWorkspace(
      workspacesByKey,
      buildOrganizationWorkspace(summary, access)
    )
  }

  for (const access of summary.businessAccess) {
    addWorkspace(
      workspacesByKey,
      buildBusinessWorkspace(summary, access)
    )
  }

  const hasBusinessWorkspace = [...workspacesByKey.values()].some(
    (workspace) => workspace.kind === 'business'
  )

  if (
    summary.legacyWorkspaceRole === 'business' &&
    !hasBusinessWorkspace
  ) {
    addWorkspace(
      workspacesByKey,
      buildLegacyWorkspace(summary, 'business')
    )
  }

  const hasOrganizationWorkspace = [...workspacesByKey.values()].some(
    (workspace) => workspace.kind === 'organization'
  )

  if (
    summary.legacyWorkspaceRole === 'organization' &&
    !hasOrganizationWorkspace
  ) {
    addWorkspace(
      workspacesByKey,
      buildLegacyWorkspace(summary, 'organization')
    )
  }

  if (summary.canAccessOwnerPlatform) {
    addWorkspace(
      workspacesByKey,
      buildOwnerWorkspace(summary)
    )
  }

  return [...workspacesByKey.values()].sort(compareWorkspaces)
}

export async function getAuthenticatedWorkspaces(): Promise<AuthenticatedWorkspacesResult> {
  const capabilityResult = await resolveActorCapabilitySummary()

  if (!capabilityResult.success) {
    return {
      success: false,
      reason: capabilityResult.reason,
      message: capabilityResult.message,
      workspaces: [],
    }
  }

  return {
    success: true,
    workspaces: buildSelectableWorkspaces(
      capabilityResult.summary
    ),
  }
}

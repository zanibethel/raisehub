import type {
  BusinessMembershipRole,
  BusinessRow,
  CampaignRow,
  CapabilityName,
  CustomerEntitlementRecord,
  CustomerEntitlementStatus,
  CustomerEntitlementType,
  LegacyProfileRole,
  MembershipStatus,
  OrganizationMembershipRole,
  OrganizationRow,
  WorkspaceRole,
} from '../types/identity-access'

const LEGACY_PROFILE_ROLES: LegacyProfileRole[] = [
  'customer',
  'business',
  'organization',
  'admin',
  'owner',
]

const WORKSPACE_ROLES: WorkspaceRole[] = [
  'business',
  'organization',
  'customer',
]

const MEMBERSHIP_STATUSES: MembershipStatus[] = [
  'invited',
  'active',
  'suspended',
  'removed',
]

const BUSINESS_MEMBERSHIP_ROLES: BusinessMembershipRole[] = [
  'owner',
  'manager',
  'staff',
  'viewer',
]

const ORGANIZATION_MEMBERSHIP_ROLES: OrganizationMembershipRole[] = [
  'admin',
  'manager',
  'seller',
  'viewer',
]

const CUSTOMER_ENTITLEMENT_TYPES: CustomerEntitlementType[] = [
  'purchased_pass',
  'complimentary_pass',
  'trial',
  'promotional_access',
  'replacement_access',
]

const CUSTOMER_ENTITLEMENT_STATUSES: CustomerEntitlementStatus[] = [
  'pending',
  'active',
  'expired',
  'revoked',
  'replaced',
  'cancelled',
]

const BUSINESS_CAPABILITIES: Record<
  BusinessMembershipRole,
  Extract<
    CapabilityName,
    | 'canViewBusiness'
    | 'canManageBusiness'
    | 'canManageBusinessMembers'
    | 'canViewBusinessAnalytics'
  >[]
> = {
  owner: [
    'canViewBusiness',
    'canManageBusiness',
    'canManageBusinessMembers',
    'canViewBusinessAnalytics',
  ],
  manager: [
    'canViewBusiness',
    'canManageBusiness',
    'canViewBusinessAnalytics',
  ],
  staff: ['canViewBusiness'],
  viewer: ['canViewBusiness'],
}

const ORGANIZATION_CAPABILITIES: Record<
  OrganizationMembershipRole,
  Extract<
    CapabilityName,
    | 'canViewOrganization'
    | 'canManageOrganization'
    | 'canManageOrganizationMembers'
    | 'canCreateCampaign'
    | 'canManageCampaign'
    | 'canViewSellerProgress'
  >[]
> = {
  admin: [
    'canViewOrganization',
    'canManageOrganization',
    'canManageOrganizationMembers',
    'canCreateCampaign',
    'canManageCampaign',
    'canViewSellerProgress',
  ],
  manager: [
    'canViewOrganization',
    'canCreateCampaign',
    'canManageCampaign',
    'canViewSellerProgress',
  ],
  seller: ['canViewOrganization', 'canViewSellerProgress'],
  viewer: ['canViewOrganization'],
}

export type WorkspaceLifecycleDenialReason =
  | 'workspace-inactive'
  | 'workspace-archived'

function hasArchivedAt(
  value: Pick<BusinessRow, 'archived_at'> | Pick<OrganizationRow, 'archived_at'>
): boolean {
  return Boolean(value.archived_at)
}

export function getBusinessLifecycleDenialReason(
  business: Pick<BusinessRow, 'status' | 'archived_at'>
): WorkspaceLifecycleDenialReason | null {
  if (hasArchivedAt(business)) {
    return 'workspace-archived'
  }

  if (business.status !== 'active') {
    return 'workspace-inactive'
  }

  return null
}

export function isBusinessOperational(
  business: Pick<BusinessRow, 'status' | 'archived_at'>
): boolean {
  return getBusinessLifecycleDenialReason(business) === null
}

export function getOrganizationLifecycleDenialReason(
  organization: Pick<OrganizationRow, 'status' | 'archived_at'>
): WorkspaceLifecycleDenialReason | null {
  if (hasArchivedAt(organization)) {
    return 'workspace-archived'
  }

  if (organization.status !== 'active') {
    return 'workspace-inactive'
  }

  return null
}

export function isOrganizationOperational(
  organization: Pick<OrganizationRow, 'status' | 'archived_at'>
): boolean {
  return getOrganizationLifecycleDenialReason(organization) === null
}

export function isCampaignCurrentlySellable(
  campaign: Pick<CampaignRow, 'status' | 'starts_at' | 'ends_at'>,
  now = new Date()
): boolean {
  if (campaign.status !== 'active') {
    return false
  }

  if (campaign.starts_at) {
    const startsAt = new Date(campaign.starts_at)

    if (Number.isNaN(startsAt.getTime()) || startsAt > now) {
      return false
    }
  }

  if (campaign.ends_at) {
    const endsAt = new Date(campaign.ends_at)

    if (Number.isNaN(endsAt.getTime()) || endsAt <= now) {
      return false
    }
  }

  return true
}

export function isLegacyProfileRole(
  value: string | null | undefined
): value is LegacyProfileRole {
  return LEGACY_PROFILE_ROLES.includes(value as LegacyProfileRole)
}

export function isWorkspaceRole(
  value: string | null | undefined
): value is WorkspaceRole {
  return WORKSPACE_ROLES.includes(value as WorkspaceRole)
}

export function isMembershipStatus(
  value: string | null | undefined
): value is MembershipStatus {
  return MEMBERSHIP_STATUSES.includes(value as MembershipStatus)
}

export function isActiveMembershipStatus(
  value: string | null | undefined
): value is 'active' {
  return value === 'active'
}

export function isBusinessMembershipRole(
  value: string | null | undefined
): value is BusinessMembershipRole {
  return BUSINESS_MEMBERSHIP_ROLES.includes(
    value as BusinessMembershipRole
  )
}

export function isOrganizationMembershipRole(
  value: string | null | undefined
): value is OrganizationMembershipRole {
  return ORGANIZATION_MEMBERSHIP_ROLES.includes(
    value as OrganizationMembershipRole
  )
}

export function isCustomerEntitlementType(
  value: string | null | undefined
): value is CustomerEntitlementType {
  return CUSTOMER_ENTITLEMENT_TYPES.includes(
    value as CustomerEntitlementType
  )
}

export function isCustomerEntitlementStatus(
  value: string | null | undefined
): value is CustomerEntitlementStatus {
  return CUSTOMER_ENTITLEMENT_STATUSES.includes(
    value as CustomerEntitlementStatus
  )
}

export function getLegacyWorkspaceRole(
  role: string | null | undefined
): WorkspaceRole | null {
  switch (role) {
    case 'business':
    case 'organization':
    case 'customer':
      return role
    default:
      return null
  }
}

export function hasBusinessCapability(
  role: string | null | undefined,
  capability: Extract<
    CapabilityName,
    | 'canViewBusiness'
    | 'canManageBusiness'
    | 'canManageBusinessMembers'
    | 'canViewBusinessAnalytics'
  >
): boolean {
  if (!isBusinessMembershipRole(role)) {
    return false
  }

  return BUSINESS_CAPABILITIES[role].includes(capability)
}

export function hasOrganizationCapability(
  role: string | null | undefined,
  capability: Extract<
    CapabilityName,
    | 'canViewOrganization'
    | 'canManageOrganization'
    | 'canManageOrganizationMembers'
    | 'canCreateCampaign'
    | 'canManageCampaign'
    | 'canViewSellerProgress'
  >
): boolean {
  if (!isOrganizationMembershipRole(role)) {
    return false
  }

  return ORGANIZATION_CAPABILITIES[role].includes(capability)
}

export function isLegacyPurchaseActive(
  paymentStatus: string | null | undefined
): boolean {
  if (!paymentStatus) {
    return false
  }

  return paymentStatus.trim().toLowerCase() !== 'failed'
}

export function isCustomerEntitlementActive(
  entitlement: Pick<
    CustomerEntitlementRecord,
    'status' | 'starts_at' | 'expires_at' | 'revoked_at' | 'purchase_payment_status'
  >,
  now = new Date()
): boolean {
  if (entitlement.status !== 'active') {
    return false
  }

  if (entitlement.revoked_at) {
    return false
  }

  const startsAt = new Date(entitlement.starts_at)

  if (Number.isNaN(startsAt.getTime()) || startsAt > now) {
    return false
  }

  if (entitlement.expires_at) {
    const expiresAt = new Date(entitlement.expires_at)

    if (Number.isNaN(expiresAt.getTime()) || expiresAt <= now) {
      return false
    }
  }

  if (
    entitlement.purchase_payment_status !== null &&
    !isLegacyPurchaseActive(entitlement.purchase_payment_status)
  ) {
    return false
  }

  return true
}

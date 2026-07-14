import type { Tables } from '../supabase/database.types'

export type WorkspaceRole =
  | 'business'
  | 'organization'
  | 'customer'

export type WorkspaceCardData = {
  id: string
  name: string
  role: WorkspaceRole
  subtitle?: string | null
  status?: string | null
  planLabel?: string | null
  setupPercentage?: number | null
  completedSetupItems?: number | null
  totalSetupItems?: number | null
  missingSetupItems?: string[]
  email?: string | null
  phone?: string | null
}

export type LegacyProfileRole =
  | 'customer'
  | 'business'
  | 'organization'
  | 'admin'
  | 'owner'

export type EntityStatus =
  | 'active'
  | 'inactive'
  | 'suspended'
  | 'archived'

export type MembershipStatus =
  | 'invited'
  | 'active'
  | 'suspended'
  | 'removed'

export type BusinessMembershipRole =
  | 'owner'
  | 'manager'
  | 'staff'
  | 'viewer'

export type OrganizationMembershipRole =
  | 'admin'
  | 'manager'
  | 'seller'
  | 'viewer'

export type CustomerEntitlementType =
  | 'purchased_pass'
  | 'complimentary_pass'
  | 'trial'
  | 'promotional_access'
  | 'replacement_access'

export type CustomerEntitlementStatus =
  | 'pending'
  | 'active'
  | 'expired'
  | 'revoked'
  | 'replaced'
  | 'cancelled'

export type CapabilityName =
  | 'canAccessCustomerBenefits'
  | 'canViewBusiness'
  | 'canManageBusiness'
  | 'canManageBusinessMembers'
  | 'canViewBusinessAnalytics'
  | 'canViewOrganization'
  | 'canManageOrganization'
  | 'canManageOrganizationMembers'
  | 'canCreateCampaign'
  | 'canManageCampaign'
  | 'canSellForCampaign'
  | 'canViewSellerProgress'
  | 'canAccessOwnerPlatform'

export type CapabilityWorkspaceType =
  | WorkspaceRole
  | 'campaign'
  | 'owner'

export type CapabilitySource =
  | 'business-membership'
  | 'organization-membership'
  | 'campaign-membership'
  | 'customer-entitlement'
  | 'legacy-customer-pass'
  | 'owner-role'
  | 'legacy-profile'

export type BusinessRow = Tables<'businesses'>
export type BusinessMembershipRow = Tables<'business_memberships'>
export type CampaignMembershipRow = Tables<'campaign_memberships'>
export type CampaignRow = Tables<'campaigns'>
export type CustomerEntitlementRow = Tables<'customer_entitlements'>
export type OrganizationMembershipRow = Tables<'organization_memberships'>
export type OrganizationRow = Tables<'organizations'>
export type ProfileRow = Tables<'profiles'>

export type ActorProfile = Pick<
  ProfileRow,
  'id' | 'email' | 'role'
>

export type AuthenticatedActor = {
  id: string
  email: string | null
  legacyRole: LegacyProfileRole | null
}

export type BusinessAccessRecord = {
  business: BusinessRow
  membership: BusinessMembershipRow
}

export type OrganizationAccessRecord = {
  organization: OrganizationRow
  membership: OrganizationMembershipRow
}

export type CampaignAccessRecord = {
  campaignMembership: CampaignMembershipRow
  organizationMembership: OrganizationMembershipRow
}

export type CustomerEntitlementRecord = CustomerEntitlementRow & {
  purchase_payment_status: string | null
}

export type ActorCapabilitySummary = {
  actor: AuthenticatedActor
  legacyWorkspaceRole: WorkspaceRole | null
  businessAccess: BusinessAccessRecord[]
  organizationAccess: OrganizationAccessRecord[]
  campaignAccess: CampaignAccessRecord[]
  customerEntitlements: CustomerEntitlementRecord[]
  activeCustomerEntitlement: CustomerEntitlementRecord | null
  hasLegacyCustomerPass: boolean
  canAccessOwnerPlatform: boolean
}

export type CapabilityResult = {
  allowed: boolean
  capability: CapabilityName
  actorId?: string
  reason?: string
  workspaceType?: CapabilityWorkspaceType
  workspaceId?: string
  membershipId?: string
  source?: CapabilitySource
  legacyProfileId?: string | null
}

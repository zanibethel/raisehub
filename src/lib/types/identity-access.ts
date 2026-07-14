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

// =============================================================================
// Authenticated workspace selection
// =============================================================================

/**
 * The user-facing experience currently selected by an authenticated person.
 *
 * This remains separate from WorkspaceCardData, which is used by the Owner
 * Platform workspace browser to inspect client accounts.
 */
export type SelectableWorkspaceKind =
  | 'customer'
  | 'fundraising'
  | 'business'
  | 'organization'
  | 'owner'

/**
 * A normalized workspace option that may appear in the authenticated account
 * menu or a future Switch Experience interface.
 *
 * Authorization must still be verified on the server when the destination is
 * opened. A client-selected workspace is context, not proof of permission.
 */
export type SelectableWorkspace = {
  /**
   * Stable React, URL-state, and selection key.
   *
   * This should include the workspace kind and relevant entity or membership
   * identifier so two workspaces cannot accidentally share the same key.
   */
  key: string

  /**
   * The user-facing experience represented by this option.
   */
  kind: SelectableWorkspaceKind

  /**
   * Primary name shown in the account menu.
   *
   * Examples:
   * - My Pass
   * - My Fundraising
   * - Elysian Hair Salon
   * - Roosevelt Football
   * - Owner Platform
   */
  name: string

  /**
   * Optional secondary explanation shown beneath the workspace name.
   */
  subtitle: string | null

  /**
   * Authorized destination for this workspace.
   *
   * The destination may include workspace context in its path or query string,
   * but the destination route must independently verify authorization.
   */
  href: string

  /**
   * Entity or contextual workspace identifier where one exists.
   *
   * Business and organization workspaces use their entity IDs. Fundraising
   * options may use the relevant organization or campaign context selected by
   * the workspace-resolution service.
   */
  workspaceId: string | null

  /**
   * Membership responsible for access when the option comes from a business,
   * organization, or campaign relationship.
   */
  membershipId: string | null

  /**
   * Legacy profile identifier retained only for compatibility while existing
   * routes and records continue migrating to entity-based workspaces.
   */
  legacyProfileId: string | null

  /**
   * Verified relationship or compatibility source that produced the option.
   */
  source: CapabilitySource

  /**
   * True when this option represents the current legacy/default dashboard
   * experience before an explicit workspace selection is made.
   */
  isDefault: boolean
}

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
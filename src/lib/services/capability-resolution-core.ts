import {
  getBusinessLifecycleDenialReason,
  getLegacyWorkspaceRole,
  getOrganizationLifecycleDenialReason,
  hasBusinessCapability,
  hasOrganizationCapability,
  isCampaignCurrentlySellable,
  isCustomerEntitlementActive,
} from '../rules/identity-access-rules'
import {
  isLegacyBusinessEntityOwner,
  isLegacyCampaignOwner,
  isLegacyOrganizationEntityAdmin,
} from './legacy-compatibility-service'
import type {
  ActorCapabilitySummary,
  AuthenticatedActor,
  BusinessAccessRecord,
  BusinessMembershipRow,
  BusinessRow,
  CampaignAccessRecord,
  CampaignMembershipRow,
  CampaignRow,
  CapabilityResult,
  CustomerEntitlementRecord,
  OrganizationAccessRecord,
  OrganizationMembershipRow,
  OrganizationRow,
} from '../types/identity-access'

export type CapabilityResolverDependencies = {
  now?: () => Date
  loadBusinessAccess(actorId: string): Promise<BusinessAccessRecord[]>
  loadOrganizationAccess(actorId: string): Promise<OrganizationAccessRecord[]>
  loadCampaignAccess(actorId: string): Promise<CampaignAccessRecord[]>
  loadCustomerEntitlements(
    actorId: string
  ): Promise<CustomerEntitlementRecord[]>
  hasLegacyCustomerPassAccess(actorId: string): Promise<boolean>
  loadBusinessById(businessId: string): Promise<BusinessRow | null>
  loadOrganizationById(
    organizationId: string
  ): Promise<OrganizationRow | null>
  loadOrganizationByLegacyProfileId(
    legacyProfileId: string
  ): Promise<OrganizationRow | null>
  loadCampaignById(campaignId: string): Promise<CampaignRow | null>
  loadCampaignMembershipById(
    campaignMembershipId: string
  ): Promise<CampaignMembershipRow | null>
  loadOrganizationMembershipById(
    organizationMembershipId: string
  ): Promise<OrganizationMembershipRow | null>
  loadBusinessAccessForActorAndBusiness(
    actorId: string,
    businessId: string
  ): Promise<BusinessAccessRecord | null>
  loadOrganizationAccessForActorAndOrganization(
    actorId: string,
    organizationId: string
  ): Promise<OrganizationAccessRecord | null>
  loadOrganizationAccessForActorByLegacyProfileId(
    actorId: string,
    legacyProfileId: string
  ): Promise<OrganizationAccessRecord | null>
  loadCampaignAccessForActorAndCampaign(
    actorId: string,
    campaignId: string
  ): Promise<CampaignAccessRecord | null>
}

function buildDeniedResult(
  actor: AuthenticatedActor,
  capability: CapabilityResult['capability'],
  reason: string,
  context?: Partial<CapabilityResult>
): CapabilityResult {
  return {
    allowed: false,
    capability,
    actorId: actor.id,
    reason,
    ...context,
  }
}

function buildAllowedResult(
  actor: AuthenticatedActor,
  capability: CapabilityResult['capability'],
  context?: Partial<CapabilityResult>
): CapabilityResult {
  return {
    allowed: true,
    capability,
    actorId: actor.id,
    ...context,
  }
}

function filterOperationalBusinessAccess(
  businessAccess: BusinessAccessRecord[]
): BusinessAccessRecord[] {
  return businessAccess.filter(
    ({ business }) => getBusinessLifecycleDenialReason(business) === null
  )
}

function filterOperationalOrganizationAccess(
  organizationAccess: OrganizationAccessRecord[]
): OrganizationAccessRecord[] {
  return organizationAccess.filter(
    ({ organization }) =>
      getOrganizationLifecycleDenialReason(organization) === null
  )
}

function isSelfActiveCampaignMembership(
  actor: AuthenticatedActor,
  campaignMembership: CampaignMembershipRow,
  organizationMembership: OrganizationMembershipRow
): boolean {
  return (
    organizationMembership.user_id === actor.id &&
    organizationMembership.status === 'active' &&
    campaignMembership.status === 'active'
  )
}

function buildMembershipDeniedReason<T extends { membership: { membership_role: string } }>(
  access: T | null,
  capabilityCheck: (role: string) => boolean
): 'inactive-membership' | 'insufficient-role' {
  if (!access) {
    return 'inactive-membership'
  }

  return capabilityCheck(access.membership.membership_role)
    ? 'inactive-membership'
    : 'insufficient-role'
}

export function createCapabilityResolver(
  dependencies: CapabilityResolverDependencies
) {
  const getNow = () => dependencies.now?.() ?? new Date()

  async function resolveActorCapabilitySummaryForActor(
    actor: AuthenticatedActor
  ): Promise<ActorCapabilitySummary> {
    const [
      businessAccess,
      organizationAccess,
      campaignAccess,
      customerEntitlements,
      hasLegacyCustomerPass,
    ] = await Promise.all([
      dependencies.loadBusinessAccess(actor.id),
      dependencies.loadOrganizationAccess(actor.id),
      dependencies.loadCampaignAccess(actor.id),
      dependencies.loadCustomerEntitlements(actor.id),
      dependencies.hasLegacyCustomerPassAccess(actor.id),
    ])

    const activeCustomerEntitlement =
      customerEntitlements.find((entitlement) =>
        isCustomerEntitlementActive(entitlement, getNow())
      ) ?? null

    return {
      actor,
      legacyWorkspaceRole: getLegacyWorkspaceRole(actor.legacyRole),
      businessAccess: filterOperationalBusinessAccess(businessAccess),
      organizationAccess:
        filterOperationalOrganizationAccess(organizationAccess),
      campaignAccess,
      customerEntitlements,
      activeCustomerEntitlement,
      hasLegacyCustomerPass,
      canAccessOwnerPlatform: actor.legacyRole === 'owner',
    }
  }

  async function canAccessCustomerBenefitsForActor(
    actor: AuthenticatedActor
  ): Promise<CapabilityResult> {
    const summary =
      await resolveActorCapabilitySummaryForActor(actor)

    if (summary.activeCustomerEntitlement) {
      return buildAllowedResult(actor, 'canAccessCustomerBenefits', {
        source: 'customer-entitlement',
        workspaceType: 'customer',
        workspaceId: actor.id,
      })
    }

    if (summary.hasLegacyCustomerPass) {
      return buildAllowedResult(actor, 'canAccessCustomerBenefits', {
        source: 'legacy-customer-pass',
        workspaceType: 'customer',
        workspaceId: actor.id,
        legacyProfileId: actor.id,
      })
    }

    return buildDeniedResult(
      actor,
      'canAccessCustomerBenefits',
      'missing-entitlement',
      {
        workspaceType: 'customer',
        workspaceId: actor.id,
      }
    )
  }

  async function canAccessOwnerPlatformForActor(
    actor: AuthenticatedActor
  ): Promise<CapabilityResult> {
    if (actor.legacyRole === 'owner') {
      return buildAllowedResult(actor, 'canAccessOwnerPlatform', {
        source: 'owner-role',
        workspaceType: 'owner',
      })
    }

    return buildDeniedResult(
      actor,
      'canAccessOwnerPlatform',
      'owner-role-required',
      {
        workspaceType: 'owner',
      }
    )
  }

  async function canViewBusinessForActor(
    actor: AuthenticatedActor,
    businessId: string
  ): Promise<CapabilityResult> {
    const business = await dependencies.loadBusinessById(businessId)

    if (!business) {
      return buildDeniedResult(
        actor,
        'canViewBusiness',
        'resource-not-found',
        {
          workspaceType: 'business',
          workspaceId: businessId,
        }
      )
    }

    const lifecycleDenialReason =
      getBusinessLifecycleDenialReason(business)

    if (lifecycleDenialReason) {
      return buildDeniedResult(
        actor,
        'canViewBusiness',
        lifecycleDenialReason,
        {
          workspaceType: 'business',
          workspaceId: businessId,
          legacyProfileId: business.legacy_profile_id,
        }
      )
    }

    const access =
      await dependencies.loadBusinessAccessForActorAndBusiness(
        actor.id,
        businessId
      )

    if (access) {
      return buildAllowedResult(actor, 'canViewBusiness', {
        source: 'business-membership',
        workspaceType: 'business',
        workspaceId: businessId,
        membershipId: access.membership.id,
        legacyProfileId: business.legacy_profile_id,
      })
    }

    if (isLegacyBusinessEntityOwner(actor, business)) {
      return buildAllowedResult(actor, 'canViewBusiness', {
        source: 'legacy-profile',
        workspaceType: 'business',
        workspaceId: businessId,
        legacyProfileId: business.legacy_profile_id,
      })
    }

    return buildDeniedResult(
      actor,
      'canViewBusiness',
      'inactive-membership',
      {
        workspaceType: 'business',
        workspaceId: businessId,
        legacyProfileId: business.legacy_profile_id,
      }
    )
  }

  async function canManageBusinessForActor(
    actor: AuthenticatedActor,
    businessId: string
  ): Promise<CapabilityResult> {
    const business = await dependencies.loadBusinessById(businessId)

    if (!business) {
      return buildDeniedResult(
        actor,
        'canManageBusiness',
        'resource-not-found',
        {
          workspaceType: 'business',
          workspaceId: businessId,
        }
      )
    }

    const lifecycleDenialReason =
      getBusinessLifecycleDenialReason(business)

    if (lifecycleDenialReason) {
      return buildDeniedResult(
        actor,
        'canManageBusiness',
        lifecycleDenialReason,
        {
          workspaceType: 'business',
          workspaceId: businessId,
          legacyProfileId: business.legacy_profile_id,
        }
      )
    }

    const access =
      await dependencies.loadBusinessAccessForActorAndBusiness(
        actor.id,
        businessId
      )

    if (
      access &&
      hasBusinessCapability(
        access.membership.membership_role,
        'canManageBusiness'
      )
    ) {
      return buildAllowedResult(actor, 'canManageBusiness', {
        source: 'business-membership',
        workspaceType: 'business',
        workspaceId: businessId,
        membershipId: access.membership.id,
        legacyProfileId: business.legacy_profile_id,
      })
    }

    if (isLegacyBusinessEntityOwner(actor, business)) {
      return buildAllowedResult(actor, 'canManageBusiness', {
        source: 'legacy-profile',
        workspaceType: 'business',
        workspaceId: businessId,
        legacyProfileId: business.legacy_profile_id,
      })
    }

    return buildDeniedResult(
      actor,
      'canManageBusiness',
      buildMembershipDeniedReason(
        access,
        (role) => hasBusinessCapability(role, 'canManageBusiness')
      ),
      {
        workspaceType: 'business',
        workspaceId: businessId,
        membershipId: access?.membership.id,
        legacyProfileId: business.legacy_profile_id,
      }
    )
  }

  async function canManageBusinessMembersForActor(
    actor: AuthenticatedActor,
    businessId: string
  ): Promise<CapabilityResult> {
    const business = await dependencies.loadBusinessById(businessId)

    if (!business) {
      return buildDeniedResult(
        actor,
        'canManageBusinessMembers',
        'resource-not-found',
        {
          workspaceType: 'business',
          workspaceId: businessId,
        }
      )
    }

    const lifecycleDenialReason =
      getBusinessLifecycleDenialReason(business)

    if (lifecycleDenialReason) {
      return buildDeniedResult(
        actor,
        'canManageBusinessMembers',
        lifecycleDenialReason,
        {
          workspaceType: 'business',
          workspaceId: businessId,
          legacyProfileId: business.legacy_profile_id,
        }
      )
    }

    const access =
      await dependencies.loadBusinessAccessForActorAndBusiness(
        actor.id,
        businessId
      )

    if (
      access &&
      hasBusinessCapability(
        access.membership.membership_role,
        'canManageBusinessMembers'
      )
    ) {
      return buildAllowedResult(
        actor,
        'canManageBusinessMembers',
        {
          source: 'business-membership',
          workspaceType: 'business',
          workspaceId: businessId,
          membershipId: access.membership.id,
          legacyProfileId: business.legacy_profile_id,
        }
      )
    }

    if (isLegacyBusinessEntityOwner(actor, business)) {
      return buildAllowedResult(
        actor,
        'canManageBusinessMembers',
        {
          source: 'legacy-profile',
          workspaceType: 'business',
          workspaceId: businessId,
          legacyProfileId: business.legacy_profile_id,
        }
      )
    }

    return buildDeniedResult(
      actor,
      'canManageBusinessMembers',
      buildMembershipDeniedReason(
        access,
        (role) =>
          hasBusinessCapability(role, 'canManageBusinessMembers')
      ),
      {
        workspaceType: 'business',
        workspaceId: businessId,
        membershipId: access?.membership.id,
        legacyProfileId: business.legacy_profile_id,
      }
    )
  }

  async function canViewBusinessAnalyticsForActor(
    actor: AuthenticatedActor,
    businessId: string
  ): Promise<CapabilityResult> {
    const business = await dependencies.loadBusinessById(businessId)

    if (!business) {
      return buildDeniedResult(
        actor,
        'canViewBusinessAnalytics',
        'resource-not-found',
        {
          workspaceType: 'business',
          workspaceId: businessId,
        }
      )
    }

    const lifecycleDenialReason =
      getBusinessLifecycleDenialReason(business)

    if (lifecycleDenialReason) {
      return buildDeniedResult(
        actor,
        'canViewBusinessAnalytics',
        lifecycleDenialReason,
        {
          workspaceType: 'business',
          workspaceId: businessId,
          legacyProfileId: business.legacy_profile_id,
        }
      )
    }

    const access =
      await dependencies.loadBusinessAccessForActorAndBusiness(
        actor.id,
        businessId
      )

    if (
      access &&
      hasBusinessCapability(
        access.membership.membership_role,
        'canViewBusinessAnalytics'
      )
    ) {
      return buildAllowedResult(
        actor,
        'canViewBusinessAnalytics',
        {
          source: 'business-membership',
          workspaceType: 'business',
          workspaceId: businessId,
          membershipId: access.membership.id,
          legacyProfileId: business.legacy_profile_id,
        }
      )
    }

    if (isLegacyBusinessEntityOwner(actor, business)) {
      return buildAllowedResult(
        actor,
        'canViewBusinessAnalytics',
        {
          source: 'legacy-profile',
          workspaceType: 'business',
          workspaceId: businessId,
          legacyProfileId: business.legacy_profile_id,
        }
      )
    }

    return buildDeniedResult(
      actor,
      'canViewBusinessAnalytics',
      buildMembershipDeniedReason(
        access,
        (role) =>
          hasBusinessCapability(role, 'canViewBusinessAnalytics')
      ),
      {
        workspaceType: 'business',
        workspaceId: businessId,
        membershipId: access?.membership.id,
        legacyProfileId: business.legacy_profile_id,
      }
    )
  }

  async function canViewOrganizationForActor(
    actor: AuthenticatedActor,
    organizationId: string
  ): Promise<CapabilityResult> {
    const organization =
      await dependencies.loadOrganizationById(organizationId)

    if (!organization) {
      return buildDeniedResult(
        actor,
        'canViewOrganization',
        'resource-not-found',
        {
          workspaceType: 'organization',
          workspaceId: organizationId,
        }
      )
    }

    const lifecycleDenialReason =
      getOrganizationLifecycleDenialReason(organization)

    if (lifecycleDenialReason) {
      return buildDeniedResult(
        actor,
        'canViewOrganization',
        lifecycleDenialReason,
        {
          workspaceType: 'organization',
          workspaceId: organizationId,
          legacyProfileId: organization.legacy_profile_id,
        }
      )
    }

    const access =
      await dependencies.loadOrganizationAccessForActorAndOrganization(
        actor.id,
        organizationId
      )

    if (access) {
      return buildAllowedResult(actor, 'canViewOrganization', {
        source: 'organization-membership',
        workspaceType: 'organization',
        workspaceId: organizationId,
        membershipId: access.membership.id,
        legacyProfileId: organization.legacy_profile_id,
      })
    }

    if (isLegacyOrganizationEntityAdmin(actor, organization)) {
      return buildAllowedResult(actor, 'canViewOrganization', {
        source: 'legacy-profile',
        workspaceType: 'organization',
        workspaceId: organizationId,
        legacyProfileId: organization.legacy_profile_id,
      })
    }

    return buildDeniedResult(
      actor,
      'canViewOrganization',
      'inactive-membership',
      {
        workspaceType: 'organization',
        workspaceId: organizationId,
        legacyProfileId: organization.legacy_profile_id,
      }
    )
  }

  async function canManageOrganizationForActor(
    actor: AuthenticatedActor,
    organizationId: string
  ): Promise<CapabilityResult> {
    const organization =
      await dependencies.loadOrganizationById(organizationId)

    if (!organization) {
      return buildDeniedResult(
        actor,
        'canManageOrganization',
        'resource-not-found',
        {
          workspaceType: 'organization',
          workspaceId: organizationId,
        }
      )
    }

    const lifecycleDenialReason =
      getOrganizationLifecycleDenialReason(organization)

    if (lifecycleDenialReason) {
      return buildDeniedResult(
        actor,
        'canManageOrganization',
        lifecycleDenialReason,
        {
          workspaceType: 'organization',
          workspaceId: organizationId,
          legacyProfileId: organization.legacy_profile_id,
        }
      )
    }

    const access =
      await dependencies.loadOrganizationAccessForActorAndOrganization(
        actor.id,
        organizationId
      )

    if (
      access &&
      hasOrganizationCapability(
        access.membership.membership_role,
        'canManageOrganization'
      )
    ) {
      return buildAllowedResult(actor, 'canManageOrganization', {
        source: 'organization-membership',
        workspaceType: 'organization',
        workspaceId: organizationId,
        membershipId: access.membership.id,
        legacyProfileId: organization.legacy_profile_id,
      })
    }

    if (isLegacyOrganizationEntityAdmin(actor, organization)) {
      return buildAllowedResult(actor, 'canManageOrganization', {
        source: 'legacy-profile',
        workspaceType: 'organization',
        workspaceId: organizationId,
        legacyProfileId: organization.legacy_profile_id,
      })
    }

    return buildDeniedResult(
      actor,
      'canManageOrganization',
      buildMembershipDeniedReason(
        access,
        (role) =>
          hasOrganizationCapability(role, 'canManageOrganization')
      ),
      {
        workspaceType: 'organization',
        workspaceId: organizationId,
        membershipId: access?.membership.id,
        legacyProfileId: organization.legacy_profile_id,
      }
    )
  }

  async function canManageOrganizationMembersForActor(
    actor: AuthenticatedActor,
    organizationId: string
  ): Promise<CapabilityResult> {
    const organization =
      await dependencies.loadOrganizationById(organizationId)

    if (!organization) {
      return buildDeniedResult(
        actor,
        'canManageOrganizationMembers',
        'resource-not-found',
        {
          workspaceType: 'organization',
          workspaceId: organizationId,
        }
      )
    }

    const lifecycleDenialReason =
      getOrganizationLifecycleDenialReason(organization)

    if (lifecycleDenialReason) {
      return buildDeniedResult(
        actor,
        'canManageOrganizationMembers',
        lifecycleDenialReason,
        {
          workspaceType: 'organization',
          workspaceId: organizationId,
          legacyProfileId: organization.legacy_profile_id,
        }
      )
    }

    const access =
      await dependencies.loadOrganizationAccessForActorAndOrganization(
        actor.id,
        organizationId
      )

    if (
      access &&
      hasOrganizationCapability(
        access.membership.membership_role,
        'canManageOrganizationMembers'
      )
    ) {
      return buildAllowedResult(
        actor,
        'canManageOrganizationMembers',
        {
          source: 'organization-membership',
          workspaceType: 'organization',
          workspaceId: organizationId,
          membershipId: access.membership.id,
          legacyProfileId: organization.legacy_profile_id,
        }
      )
    }

    if (isLegacyOrganizationEntityAdmin(actor, organization)) {
      return buildAllowedResult(
        actor,
        'canManageOrganizationMembers',
        {
          source: 'legacy-profile',
          workspaceType: 'organization',
          workspaceId: organizationId,
          legacyProfileId: organization.legacy_profile_id,
        }
      )
    }

    return buildDeniedResult(
      actor,
      'canManageOrganizationMembers',
      buildMembershipDeniedReason(
        access,
        (role) =>
          hasOrganizationCapability(
            role,
            'canManageOrganizationMembers'
          )
      ),
      {
        workspaceType: 'organization',
        workspaceId: organizationId,
        membershipId: access?.membership.id,
        legacyProfileId: organization.legacy_profile_id,
      }
    )
  }

  async function canCreateCampaignForActor(
    actor: AuthenticatedActor,
    organizationId: string
  ): Promise<CapabilityResult> {
    const organization =
      await dependencies.loadOrganizationById(organizationId)

    if (!organization) {
      return buildDeniedResult(
        actor,
        'canCreateCampaign',
        'resource-not-found',
        {
          workspaceType: 'organization',
          workspaceId: organizationId,
        }
      )
    }

    const lifecycleDenialReason =
      getOrganizationLifecycleDenialReason(organization)

    if (lifecycleDenialReason) {
      return buildDeniedResult(
        actor,
        'canCreateCampaign',
        lifecycleDenialReason,
        {
          workspaceType: 'organization',
          workspaceId: organizationId,
          legacyProfileId: organization.legacy_profile_id,
        }
      )
    }

    const access =
      await dependencies.loadOrganizationAccessForActorAndOrganization(
        actor.id,
        organizationId
      )

    if (
      access &&
      hasOrganizationCapability(
        access.membership.membership_role,
        'canCreateCampaign'
      )
    ) {
      return buildAllowedResult(actor, 'canCreateCampaign', {
        source: 'organization-membership',
        workspaceType: 'organization',
        workspaceId: organizationId,
        membershipId: access.membership.id,
        legacyProfileId: organization.legacy_profile_id,
      })
    }

    if (isLegacyOrganizationEntityAdmin(actor, organization)) {
      return buildAllowedResult(actor, 'canCreateCampaign', {
        source: 'legacy-profile',
        workspaceType: 'organization',
        workspaceId: organizationId,
        legacyProfileId: organization.legacy_profile_id,
      })
    }

    return buildDeniedResult(
      actor,
      'canCreateCampaign',
      buildMembershipDeniedReason(
        access,
        (role) => hasOrganizationCapability(role, 'canCreateCampaign')
      ),
      {
        workspaceType: 'organization',
        workspaceId: organizationId,
        membershipId: access?.membership.id,
        legacyProfileId: organization.legacy_profile_id,
      }
    )
  }

  async function canManageCampaignForActor(
    actor: AuthenticatedActor,
    campaignId: string
  ): Promise<CapabilityResult> {
    const campaign = await dependencies.loadCampaignById(campaignId)

    if (!campaign) {
      return buildDeniedResult(
        actor,
        'canManageCampaign',
        'resource-not-found',
        {
          workspaceType: 'campaign',
          workspaceId: campaignId,
        }
      )
    }

    const organization =
      await dependencies.loadOrganizationByLegacyProfileId(
        campaign.organization_id
      )

    const lifecycleDenialReason = organization
      ? getOrganizationLifecycleDenialReason(organization)
      : null

    if (lifecycleDenialReason) {
      return buildDeniedResult(
        actor,
        'canManageCampaign',
        lifecycleDenialReason,
        {
          workspaceType: 'campaign',
          workspaceId: campaignId,
          legacyProfileId: campaign.organization_id,
        }
      )
    }

    const access =
      await dependencies.loadOrganizationAccessForActorByLegacyProfileId(
        actor.id,
        campaign.organization_id
      )

    if (
      access &&
      hasOrganizationCapability(
        access.membership.membership_role,
        'canManageCampaign'
      )
    ) {
      return buildAllowedResult(actor, 'canManageCampaign', {
        source: 'organization-membership',
        workspaceType: 'campaign',
        workspaceId: campaignId,
        membershipId: access.membership.id,
        legacyProfileId: campaign.organization_id,
      })
    }

    if (isLegacyCampaignOwner(actor, campaign.organization_id)) {
      return buildAllowedResult(actor, 'canManageCampaign', {
        source: 'legacy-profile',
        workspaceType: 'campaign',
        workspaceId: campaignId,
        legacyProfileId: campaign.organization_id,
      })
    }

    return buildDeniedResult(
      actor,
      'canManageCampaign',
      buildMembershipDeniedReason(
        access,
        (role) => hasOrganizationCapability(role, 'canManageCampaign')
      ),
      {
        workspaceType: 'campaign',
        workspaceId: campaignId,
        membershipId: access?.membership.id,
        legacyProfileId: campaign.organization_id,
      }
    )
  }

  async function canSellForCampaignForActor(
    actor: AuthenticatedActor,
    campaignId: string
  ): Promise<CapabilityResult> {
    const campaign = await dependencies.loadCampaignById(campaignId)

    if (!campaign) {
      return buildDeniedResult(
        actor,
        'canSellForCampaign',
        'resource-not-found',
        {
          workspaceType: 'campaign',
          workspaceId: campaignId,
        }
      )
    }

    if (!isCampaignCurrentlySellable(campaign, getNow())) {
      return buildDeniedResult(
        actor,
        'canSellForCampaign',
        'campaign-not-sellable',
        {
          workspaceType: 'campaign',
          workspaceId: campaignId,
          legacyProfileId: campaign.organization_id,
        }
      )
    }

    const access =
      await dependencies.loadCampaignAccessForActorAndCampaign(
        actor.id,
        campaignId
      )

    if (access) {
      return buildAllowedResult(actor, 'canSellForCampaign', {
        source: 'campaign-membership',
        workspaceType: 'campaign',
        workspaceId: campaignId,
        membershipId: access.campaignMembership.id,
        legacyProfileId: campaign.organization_id,
      })
    }

    return buildDeniedResult(
      actor,
      'canSellForCampaign',
      'campaign-membership-required',
      {
        workspaceType: 'campaign',
        workspaceId: campaignId,
        legacyProfileId: campaign.organization_id,
      }
    )
  }

  async function canViewSellerProgressForActor(
    actor: AuthenticatedActor,
    campaignMembershipId: string
  ): Promise<CapabilityResult> {
    const campaignMembership =
      await dependencies.loadCampaignMembershipById(campaignMembershipId)

    if (!campaignMembership) {
      return buildDeniedResult(
        actor,
        'canViewSellerProgress',
        'resource-not-found',
        {
          workspaceType: 'campaign',
          membershipId: campaignMembershipId,
        }
      )
    }

    const organizationMembership =
      await dependencies.loadOrganizationMembershipById(
        campaignMembership.organization_membership_id
      )

    if (!organizationMembership) {
      return buildDeniedResult(
        actor,
        'canViewSellerProgress',
        'resource-not-found',
        {
          workspaceType: 'campaign',
          membershipId: campaignMembershipId,
          workspaceId: campaignMembership.campaign_id,
        }
      )
    }

    if (
      isSelfActiveCampaignMembership(
        actor,
        campaignMembership,
        organizationMembership
      )
    ) {
      return buildAllowedResult(actor, 'canViewSellerProgress', {
        source: 'campaign-membership',
        workspaceType: 'campaign',
        workspaceId: campaignMembership.campaign_id,
        membershipId: campaignMembershipId,
      })
    }

    const managerAccess =
      await dependencies.loadOrganizationAccessForActorAndOrganization(
        actor.id,
        organizationMembership.organization_id
      )

    if (
      managerAccess &&
      hasOrganizationCapability(
        managerAccess.membership.membership_role,
        'canViewSellerProgress'
      )
    ) {
      return buildAllowedResult(actor, 'canViewSellerProgress', {
        source: 'organization-membership',
        workspaceType: 'campaign',
        workspaceId: campaignMembership.campaign_id,
        membershipId: managerAccess.membership.id,
      })
    }

    return buildDeniedResult(
      actor,
      'canViewSellerProgress',
      buildMembershipDeniedReason(
        managerAccess,
        (role) => hasOrganizationCapability(role, 'canViewSellerProgress')
      ),
      {
        workspaceType: 'campaign',
        workspaceId: campaignMembership.campaign_id,
        membershipId: campaignMembershipId,
      }
    )
  }

  return {
    resolveActorCapabilitySummaryForActor,
    canAccessCustomerBenefitsForActor,
    canAccessOwnerPlatformForActor,
    canViewBusinessForActor,
    canManageBusinessForActor,
    canManageBusinessMembersForActor,
    canViewBusinessAnalyticsForActor,
    canViewOrganizationForActor,
    canManageOrganizationForActor,
    canManageOrganizationMembersForActor,
    canCreateCampaignForActor,
    canManageCampaignForActor,
    canSellForCampaignForActor,
    canViewSellerProgressForActor,
  }
}

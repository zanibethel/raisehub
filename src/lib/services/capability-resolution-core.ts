import {
  getLegacyWorkspaceRole,
  hasBusinessCapability,
  hasOrganizationCapability,
  isCustomerEntitlementActive,
} from '../rules/identity-access-rules.ts'
import {
  isLegacyBusinessEntityOwner,
  isLegacyCampaignOwner,
  isLegacyOrganizationEntityAdmin,
} from './legacy-compatibility-service.ts'
import type {
  ActorCapabilitySummary,
  AuthenticatedActor,
  BusinessAccessRecord,
  BusinessRow,
  CampaignAccessRecord,
  CampaignMembershipRow,
  CampaignRow,
  CapabilityResult,
  CustomerEntitlementRecord,
  OrganizationAccessRecord,
  OrganizationMembershipRow,
} from '../types/identity-access.ts'

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
  ): Promise<OrganizationAccessRecord['organization'] | null>
  loadCampaignById(campaignId: string): Promise<CampaignRow | null>
  loadCampaignMembershipById(
    campaignMembershipId: string
  ): Promise<CampaignMembershipRow | null>
  loadOrganizationMembershipById(
    organizationMembershipId: string
  ): Promise<OrganizationMembershipRow | null>
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
      businessAccess,
      organizationAccess,
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
    const summary =
      await resolveActorCapabilitySummaryForActor(actor)

    const access = summary.businessAccess.find(
      ({ business }) => business.id === businessId
    )

    if (access) {
      return buildAllowedResult(actor, 'canViewBusiness', {
        source: 'business-membership',
        workspaceType: 'business',
        workspaceId: businessId,
        membershipId: access.membership.id,
        legacyProfileId: access.business.legacy_profile_id,
      })
    }

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
    const summary =
      await resolveActorCapabilitySummaryForActor(actor)

    const access = summary.businessAccess.find(
      ({ business }) => business.id === businessId
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
        legacyProfileId: access.business.legacy_profile_id,
      })
    }

    const business = await dependencies.loadBusinessById(businessId)

    if (business && isLegacyBusinessEntityOwner(actor, business)) {
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
      access ? 'insufficient-role' : 'inactive-membership',
      {
        workspaceType: 'business',
        workspaceId: businessId,
        membershipId: access?.membership.id,
        legacyProfileId: access?.business.legacy_profile_id ?? business?.legacy_profile_id ?? null,
      }
    )
  }

  async function canManageBusinessMembersForActor(
    actor: AuthenticatedActor,
    businessId: string
  ): Promise<CapabilityResult> {
    const summary =
      await resolveActorCapabilitySummaryForActor(actor)

    const access = summary.businessAccess.find(
      ({ business }) => business.id === businessId
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
          legacyProfileId: access.business.legacy_profile_id,
        }
      )
    }

    const business = await dependencies.loadBusinessById(businessId)

    if (business && isLegacyBusinessEntityOwner(actor, business)) {
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
      access ? 'insufficient-role' : 'inactive-membership',
      {
        workspaceType: 'business',
        workspaceId: businessId,
        membershipId: access?.membership.id,
        legacyProfileId: access?.business.legacy_profile_id ?? business?.legacy_profile_id ?? null,
      }
    )
  }

  async function canViewBusinessAnalyticsForActor(
    actor: AuthenticatedActor,
    businessId: string
  ): Promise<CapabilityResult> {
    const summary =
      await resolveActorCapabilitySummaryForActor(actor)

    const access = summary.businessAccess.find(
      ({ business }) => business.id === businessId
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
          legacyProfileId: access.business.legacy_profile_id,
        }
      )
    }

    const business = await dependencies.loadBusinessById(businessId)

    if (business && isLegacyBusinessEntityOwner(actor, business)) {
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
      access ? 'insufficient-role' : 'inactive-membership',
      {
        workspaceType: 'business',
        workspaceId: businessId,
        membershipId: access?.membership.id,
        legacyProfileId: access?.business.legacy_profile_id ?? business?.legacy_profile_id ?? null,
      }
    )
  }

  async function canViewOrganizationForActor(
    actor: AuthenticatedActor,
    organizationId: string
  ): Promise<CapabilityResult> {
    const summary =
      await resolveActorCapabilitySummaryForActor(actor)

    const access = summary.organizationAccess.find(
      ({ organization }) => organization.id === organizationId
    )

    if (access) {
      return buildAllowedResult(actor, 'canViewOrganization', {
        source: 'organization-membership',
        workspaceType: 'organization',
        workspaceId: organizationId,
        membershipId: access.membership.id,
        legacyProfileId: access.organization.legacy_profile_id,
      })
    }

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
    const summary =
      await resolveActorCapabilitySummaryForActor(actor)

    const access = summary.organizationAccess.find(
      ({ organization }) => organization.id === organizationId
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
        legacyProfileId: access.organization.legacy_profile_id,
      })
    }

    const organization =
      await dependencies.loadOrganizationById(organizationId)

    if (
      organization &&
      isLegacyOrganizationEntityAdmin(actor, organization)
    ) {
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
      access ? 'insufficient-role' : 'inactive-membership',
      {
        workspaceType: 'organization',
        workspaceId: organizationId,
        membershipId: access?.membership.id,
        legacyProfileId:
          access?.organization.legacy_profile_id ??
          organization?.legacy_profile_id ??
          null,
      }
    )
  }

  async function canManageOrganizationMembersForActor(
    actor: AuthenticatedActor,
    organizationId: string
  ): Promise<CapabilityResult> {
    const summary =
      await resolveActorCapabilitySummaryForActor(actor)

    const access = summary.organizationAccess.find(
      ({ organization }) => organization.id === organizationId
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
          legacyProfileId: access.organization.legacy_profile_id,
        }
      )
    }

    const organization =
      await dependencies.loadOrganizationById(organizationId)

    if (
      organization &&
      isLegacyOrganizationEntityAdmin(actor, organization)
    ) {
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
      access ? 'insufficient-role' : 'inactive-membership',
      {
        workspaceType: 'organization',
        workspaceId: organizationId,
        membershipId: access?.membership.id,
        legacyProfileId:
          access?.organization.legacy_profile_id ??
          organization?.legacy_profile_id ??
          null,
      }
    )
  }

  async function canCreateCampaignForActor(
    actor: AuthenticatedActor,
    organizationId: string
  ): Promise<CapabilityResult> {
    const summary =
      await resolveActorCapabilitySummaryForActor(actor)

    const access = summary.organizationAccess.find(
      ({ organization }) => organization.id === organizationId
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
        legacyProfileId: access.organization.legacy_profile_id,
      })
    }

    const organization =
      await dependencies.loadOrganizationById(organizationId)

    if (
      organization &&
      isLegacyOrganizationEntityAdmin(actor, organization)
    ) {
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
      access ? 'insufficient-role' : 'inactive-membership',
      {
        workspaceType: 'organization',
        workspaceId: organizationId,
        membershipId: access?.membership.id,
        legacyProfileId:
          access?.organization.legacy_profile_id ??
          organization?.legacy_profile_id ??
          null,
      }
    )
  }

  async function canManageCampaignForActor(
    actor: AuthenticatedActor,
    campaignId: string
  ): Promise<CapabilityResult> {
    const summary =
      await resolveActorCapabilitySummaryForActor(actor)

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

    const access = summary.organizationAccess.find(
      ({ organization, membership }) =>
        organization.legacy_profile_id === campaign.organization_id &&
        hasOrganizationCapability(
          membership.membership_role,
          'canManageCampaign'
        )
    )

    if (access) {
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
      'inactive-membership',
      {
        workspaceType: 'campaign',
        workspaceId: campaignId,
        legacyProfileId: campaign.organization_id,
      }
    )
  }

  async function canSellForCampaignForActor(
    actor: AuthenticatedActor,
    campaignId: string
  ): Promise<CapabilityResult> {
    const summary =
      await resolveActorCapabilitySummaryForActor(actor)

    const access = summary.campaignAccess.find(
      ({ campaignMembership }) =>
        campaignMembership.campaign_id === campaignId
    )

    if (access) {
      return buildAllowedResult(actor, 'canSellForCampaign', {
        source: 'campaign-membership',
        workspaceType: 'campaign',
        workspaceId: campaignId,
        membershipId: access.campaignMembership.id,
      })
    }

    return buildDeniedResult(
      actor,
      'canSellForCampaign',
      'campaign-membership-required',
      {
        workspaceType: 'campaign',
        workspaceId: campaignId,
      }
    )
  }

  async function canViewSellerProgressForActor(
    actor: AuthenticatedActor,
    campaignMembershipId: string
  ): Promise<CapabilityResult> {
    const summary =
      await resolveActorCapabilitySummaryForActor(actor)

    const selfAccess = summary.campaignAccess.find(
      ({ campaignMembership }) =>
        campaignMembership.id === campaignMembershipId
    )

    if (selfAccess) {
      return buildAllowedResult(actor, 'canViewSellerProgress', {
        source: 'campaign-membership',
        workspaceType: 'campaign',
        workspaceId: selfAccess.campaignMembership.campaign_id,
        membershipId: campaignMembershipId,
      })
    }

    const campaignMembership =
      await dependencies.loadCampaignMembershipById(
        campaignMembershipId
      )

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

    const managerAccess = summary.organizationAccess.find(
      ({ membership }) =>
        membership.organization_id ===
          organizationMembership.organization_id &&
        hasOrganizationCapability(
          membership.membership_role,
          'canViewSellerProgress'
        )
    )

    if (managerAccess) {
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
      'inactive-membership',
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

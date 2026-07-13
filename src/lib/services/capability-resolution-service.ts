import { getBusinessById, getBusinessesByIds } from '../repositories/business-repository'
import {
  getBusinessMembershipsForUser,
} from '../repositories/business-membership-repository'
import { getCampaignById } from '../repositories/campaign-repository'
import {
  getCampaignMembershipById,
  getCampaignMembershipsByOrganizationMembershipIds,
} from '../repositories/campaign-membership-repository'
import { getCustomerEntitlementsForUser } from '../repositories/customer-entitlement-repository'
import { getOrganizationById, getOrganizationsByIds } from '../repositories/organization-repository'
import {
  getOrganizationMembershipById,
  getOrganizationMembershipsForUser,
} from '../repositories/organization-membership-repository'
import { getAuthenticatedActor, type AuthenticatedActorResult } from './authenticated-actor-service'
import {
  createCapabilityResolver,
  type CapabilityResolverDependencies,
} from './capability-resolution-core'
import { hasLegacyCustomerPassAccess } from './legacy-compatibility-service'
import type {
  ActorCapabilitySummary,
  AuthenticatedActor,
  BusinessAccessRecord,
  CampaignAccessRecord,
  CapabilityResult,
  CustomerEntitlementRecord,
  OrganizationAccessRecord,
} from '../types/identity-access'

type UnauthenticatedActorResult = Extract<
  AuthenticatedActorResult,
  { authenticated: false }
>

function createLookupError(message: string): Error {
  return new Error(message)
}

async function loadBusinessAccess(
  actorId: string
): Promise<BusinessAccessRecord[]> {
  const { memberships, error: membershipsError } =
    await getBusinessMembershipsForUser(actorId, {
      status: 'active',
    })

  if (membershipsError) {
    throw createLookupError(membershipsError)
  }

  const businessIds = memberships.map((membership) => membership.business_id)
  const { businesses, error: businessesError } = await getBusinessesByIds(
    businessIds
  )

  if (businessesError) {
    throw createLookupError(businessesError)
  }

  const businessesById = new Map(
    businesses.map((business) => [business.id, business])
  )

  return memberships.flatMap((membership) => {
    const business = businessesById.get(membership.business_id)

    return business ? [{ business, membership }] : []
  })
}

async function loadOrganizationAccess(
  actorId: string
): Promise<OrganizationAccessRecord[]> {
  const { memberships, error: membershipsError } =
    await getOrganizationMembershipsForUser(actorId, {
      status: 'active',
    })

  if (membershipsError) {
    throw createLookupError(membershipsError)
  }

  const organizationIds = memberships.map(
    (membership) => membership.organization_id
  )

  const { organizations, error: organizationsError } =
    await getOrganizationsByIds(organizationIds)

  if (organizationsError) {
    throw createLookupError(organizationsError)
  }

  const organizationsById = new Map(
    organizations.map((organization) => [organization.id, organization])
  )

  return memberships.flatMap((membership) => {
    const organization = organizationsById.get(
      membership.organization_id
    )

    return organization ? [{ organization, membership }] : []
  })
}

async function loadCampaignAccess(
  actorId: string
): Promise<CampaignAccessRecord[]> {
  const { memberships, error: membershipsError } =
    await getOrganizationMembershipsForUser(actorId, {
      status: 'active',
    })

  if (membershipsError) {
    throw createLookupError(membershipsError)
  }

  const organizationMembershipById = new Map(
    memberships.map((membership) => [membership.id, membership])
  )

  const { memberships: campaignMemberships, error: campaignError } =
    await getCampaignMembershipsByOrganizationMembershipIds(
      memberships.map((membership) => membership.id),
      {
        status: 'active',
      }
    )

  if (campaignError) {
    throw createLookupError(campaignError)
  }

  return campaignMemberships.flatMap((campaignMembership) => {
    const organizationMembership = organizationMembershipById.get(
      campaignMembership.organization_membership_id
    )

    return organizationMembership
      ? [{ campaignMembership, organizationMembership }]
      : []
  })
}

async function loadCustomerEntitlements(
  actorId: string
): Promise<CustomerEntitlementRecord[]> {
  const { entitlements, error } =
    await getCustomerEntitlementsForUser(actorId)

  if (error) {
    throw createLookupError(error)
  }

  return entitlements
}

function createDefaultDependencies(): CapabilityResolverDependencies {
  return {
    loadBusinessAccess,
    loadOrganizationAccess,
    loadCampaignAccess,
    loadCustomerEntitlements,
    hasLegacyCustomerPassAccess,
    async loadBusinessById(businessId) {
      const { business, error } = await getBusinessById(businessId)

      if (error) {
        throw createLookupError(error)
      }

      return business
    },
    async loadOrganizationById(organizationId) {
      const { organization, error } = await getOrganizationById(
        organizationId
      )

      if (error) {
        throw createLookupError(error)
      }

      return organization
    },
    async loadCampaignById(campaignId) {
      const { campaign, error } = await getCampaignById(campaignId)

      if (error) {
        throw createLookupError(error)
      }

      return campaign
    },
    async loadCampaignMembershipById(campaignMembershipId) {
      const { membership, error } = await getCampaignMembershipById(
        campaignMembershipId
      )

      if (error) {
        throw createLookupError(error)
      }

      return membership
    },
    async loadOrganizationMembershipById(organizationMembershipId) {
      const { membership, error } = await getOrganizationMembershipById(
        organizationMembershipId
      )

      if (error) {
        throw createLookupError(error)
      }

      return membership
    },
  }
}

function buildUnauthenticatedCapabilityResult(
  capability: CapabilityResult['capability'],
  actorResult: UnauthenticatedActorResult,
  context?: Partial<CapabilityResult>
): CapabilityResult {
  return {
    allowed: false,
    capability,
    reason: actorResult.message,
    workspaceType: context?.workspaceType,
    workspaceId: context?.workspaceId,
    membershipId: context?.membershipId,
  }
}

async function withAuthenticatedActor<T>(
  callback: (actor: AuthenticatedActor) => Promise<T>
): Promise<T | UnauthenticatedActorResult> {
  const actorResult = await getAuthenticatedActor()

  if (!actorResult.authenticated) {
    return actorResult
  }

  return callback(actorResult.actor)
}

export async function resolveActorCapabilitySummary(): Promise<
  | { success: true; summary: ActorCapabilitySummary }
  | { success: false; reason: string; message: string }
> {
  const actorResult = await getAuthenticatedActor()

  if (!actorResult.authenticated) {
    return {
      success: false,
      reason: actorResult.reason,
      message: actorResult.message,
    }
  }

  try {
    const resolver = createCapabilityResolver(
      createDefaultDependencies()
    )

    return {
      success: true,
      summary:
        await resolver.resolveActorCapabilitySummaryForActor(
          actorResult.actor
        ),
    }
  } catch (error) {
    return {
      success: false,
      reason: 'lookup-failure',
      message:
        error instanceof Error ? error.message : 'Lookup failed.',
    }
  }
}

export async function canAccessCustomerBenefits(): Promise<CapabilityResult> {
  try {
    const result = await withAuthenticatedActor(async (actor) => {
      const resolver = createCapabilityResolver(
        createDefaultDependencies()
      )

      return resolver.canAccessCustomerBenefitsForActor(actor)
    })

    if ('authenticated' in result) {
      return buildUnauthenticatedCapabilityResult(
        'canAccessCustomerBenefits',
        result,
        { workspaceType: 'customer' }
      )
    }

    return result
  } catch (error) {
    return {
      allowed: false,
      capability: 'canAccessCustomerBenefits',
      reason:
        error instanceof Error ? error.message : 'Lookup failed.',
      workspaceType: 'customer',
    }
  }
}

export async function canAccessOwnerPlatform(): Promise<CapabilityResult> {
  try {
    const result = await withAuthenticatedActor(async (actor) => {
      const resolver = createCapabilityResolver(
        createDefaultDependencies()
      )

      return resolver.canAccessOwnerPlatformForActor(actor)
    })

    if ('authenticated' in result) {
      return buildUnauthenticatedCapabilityResult(
        'canAccessOwnerPlatform',
        result,
        { workspaceType: 'owner' }
      )
    }

    return result
  } catch (error) {
    return {
      allowed: false,
      capability: 'canAccessOwnerPlatform',
      reason:
        error instanceof Error ? error.message : 'Lookup failed.',
      workspaceType: 'owner',
    }
  }
}

async function runActorCapabilityCheck(
  capability:
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
    | 'canViewSellerProgress',
  callback: (resolver: ReturnType<typeof createCapabilityResolver>, actor: AuthenticatedActor) => Promise<CapabilityResult>,
  context: Partial<CapabilityResult>
): Promise<CapabilityResult> {
  try {
    const result = await withAuthenticatedActor(async (actor) => {
      const resolver = createCapabilityResolver(
        createDefaultDependencies()
      )

      return callback(resolver, actor)
    })

    if ('authenticated' in result) {
      return buildUnauthenticatedCapabilityResult(
        capability,
        result,
        context
      )
    }

    return result
  } catch (error) {
    return {
      allowed: false,
      capability,
      reason:
        error instanceof Error ? error.message : 'Lookup failed.',
      workspaceType: context.workspaceType,
      workspaceId: context.workspaceId,
      membershipId: context.membershipId,
    }
  }
}

export async function canViewBusiness(
  businessId: string
): Promise<CapabilityResult> {
  return runActorCapabilityCheck(
    'canViewBusiness',
    (resolver, actor) =>
      resolver.canViewBusinessForActor(actor, businessId),
    { workspaceType: 'business', workspaceId: businessId }
  )
}

export async function canManageBusiness(
  businessId: string
): Promise<CapabilityResult> {
  return runActorCapabilityCheck(
    'canManageBusiness',
    (resolver, actor) =>
      resolver.canManageBusinessForActor(actor, businessId),
    { workspaceType: 'business', workspaceId: businessId }
  )
}

export async function canManageBusinessMembers(
  businessId: string
): Promise<CapabilityResult> {
  return runActorCapabilityCheck(
    'canManageBusinessMembers',
    (resolver, actor) =>
      resolver.canManageBusinessMembersForActor(actor, businessId),
    { workspaceType: 'business', workspaceId: businessId }
  )
}

export async function canViewBusinessAnalytics(
  businessId: string
): Promise<CapabilityResult> {
  return runActorCapabilityCheck(
    'canViewBusinessAnalytics',
    (resolver, actor) =>
      resolver.canViewBusinessAnalyticsForActor(actor, businessId),
    { workspaceType: 'business', workspaceId: businessId }
  )
}

export async function canViewOrganization(
  organizationId: string
): Promise<CapabilityResult> {
  return runActorCapabilityCheck(
    'canViewOrganization',
    (resolver, actor) =>
      resolver.canViewOrganizationForActor(actor, organizationId),
    { workspaceType: 'organization', workspaceId: organizationId }
  )
}

export async function canManageOrganization(
  organizationId: string
): Promise<CapabilityResult> {
  return runActorCapabilityCheck(
    'canManageOrganization',
    (resolver, actor) =>
      resolver.canManageOrganizationForActor(actor, organizationId),
    { workspaceType: 'organization', workspaceId: organizationId }
  )
}

export async function canManageOrganizationMembers(
  organizationId: string
): Promise<CapabilityResult> {
  return runActorCapabilityCheck(
    'canManageOrganizationMembers',
    (resolver, actor) =>
      resolver.canManageOrganizationMembersForActor(
        actor,
        organizationId
      ),
    { workspaceType: 'organization', workspaceId: organizationId }
  )
}

export async function canCreateCampaign(
  organizationId: string
): Promise<CapabilityResult> {
  return runActorCapabilityCheck(
    'canCreateCampaign',
    (resolver, actor) =>
      resolver.canCreateCampaignForActor(actor, organizationId),
    { workspaceType: 'organization', workspaceId: organizationId }
  )
}

export async function canManageCampaign(
  campaignId: string
): Promise<CapabilityResult> {
  return runActorCapabilityCheck(
    'canManageCampaign',
    (resolver, actor) =>
      resolver.canManageCampaignForActor(actor, campaignId),
    { workspaceType: 'campaign', workspaceId: campaignId }
  )
}

export async function canSellForCampaign(
  campaignId: string
): Promise<CapabilityResult> {
  return runActorCapabilityCheck(
    'canSellForCampaign',
    (resolver, actor) =>
      resolver.canSellForCampaignForActor(actor, campaignId),
    { workspaceType: 'campaign', workspaceId: campaignId }
  )
}

export async function canViewSellerProgress(
  campaignMembershipId: string
): Promise<CapabilityResult> {
  return runActorCapabilityCheck(
    'canViewSellerProgress',
    (resolver, actor) =>
      resolver.canViewSellerProgressForActor(
        actor,
        campaignMembershipId
      ),
    { workspaceType: 'campaign', membershipId: campaignMembershipId }
  )
}

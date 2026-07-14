import assert from 'node:assert/strict'
import test from 'node:test'

import { createCapabilityResolver } from './capability-resolution-core'
import type {
  AuthenticatedActor,
  BusinessAccessRecord,
  BusinessMembershipRow,
  BusinessRow,
  CampaignAccessRecord,
  CampaignMembershipRow,
  CampaignRow,
  CustomerEntitlementRecord,
  OrganizationAccessRecord,
  OrganizationMembershipRow,
  OrganizationRow,
} from '../types/identity-access'

const actor: AuthenticatedActor = {
  id: 'actor-1',
  email: 'actor@example.com',
  legacyRole: 'customer',
}

function createBusiness(
  overrides: Partial<BusinessRow> = {}
): BusinessRow {
  return {
    id: 'business-1',
    legacy_profile_id: 'legacy-business-1',
    name: 'Main Street Coffee',
    legal_name: null,
    description: null,
    category: null,
    logo_url: null,
    phone: null,
    email: null,
    website_url: null,
    status: 'active',
    subscription_tier: 'free',
    created_by: 'actor-1',
    created_at: '2026-07-01T00:00:00.000Z',
    updated_at: '2026-07-01T00:00:00.000Z',
    archived_at: null,
    ...overrides,
  }
}

function createBusinessMembership(
  overrides: Partial<BusinessMembershipRow> = {}
): BusinessMembershipRow {
  return {
    id: 'business-membership-1',
    business_id: 'business-1',
    user_id: 'actor-1',
    membership_role: 'owner',
    status: 'active',
    invited_by: null,
    invited_at: null,
    accepted_at: '2026-07-01T00:00:00.000Z',
    suspended_at: null,
    removed_at: null,
    created_at: '2026-07-01T00:00:00.000Z',
    updated_at: '2026-07-01T00:00:00.000Z',
    ...overrides,
  }
}

function createOrganization(
  overrides: Partial<OrganizationRow> = {}
): OrganizationRow {
  return {
    id: 'organization-1',
    legacy_profile_id: 'legacy-organization-1',
    name: 'Roosevelt Football',
    description: null,
    organization_type: null,
    logo_url: null,
    phone: null,
    email: null,
    website_url: null,
    status: 'active',
    created_by: 'actor-1',
    created_at: '2026-07-01T00:00:00.000Z',
    updated_at: '2026-07-01T00:00:00.000Z',
    archived_at: null,
    ...overrides,
  }
}

function createOrganizationMembership(
  overrides: Partial<OrganizationMembershipRow> = {}
): OrganizationMembershipRow {
  return {
    id: 'organization-membership-1',
    organization_id: 'organization-1',
    user_id: 'actor-1',
    membership_role: 'admin',
    status: 'active',
    display_name: 'Alex Seller',
    invited_by: null,
    invited_at: null,
    accepted_at: '2026-07-01T00:00:00.000Z',
    suspended_at: null,
    removed_at: null,
    created_at: '2026-07-01T00:00:00.000Z',
    updated_at: '2026-07-01T00:00:00.000Z',
    ...overrides,
  }
}

function createCampaignMembership(
  overrides: Partial<CampaignMembershipRow> = {}
): CampaignMembershipRow {
  return {
    id: 'campaign-membership-1',
    campaign_id: 'campaign-1',
    organization_membership_id: 'organization-membership-1',
    referral_code: null,
    personal_goal: 0,
    status: 'active',
    joined_at: '2026-07-01T00:00:00.000Z',
    disabled_at: null,
    created_at: '2026-07-01T00:00:00.000Z',
    updated_at: '2026-07-01T00:00:00.000Z',
    ...overrides,
  }
}

function createEntitlement(
  overrides: Partial<CustomerEntitlementRecord> = {}
): CustomerEntitlementRecord {
  return {
    id: 'entitlement-1',
    user_id: 'actor-1',
    purchase_id: 'purchase-1',
    entitlement_type: 'purchased_pass',
    status: 'active',
    starts_at: '2026-07-01T00:00:00.000Z',
    expires_at: '2026-08-01T00:00:00.000Z',
    granted_by: null,
    revoked_at: null,
    replacement_entitlement_id: null,
    created_at: '2026-07-01T00:00:00.000Z',
    updated_at: '2026-07-01T00:00:00.000Z',
    purchase_payment_status: 'test_paid',
    ...overrides,
  }
}

function createCampaign(
  overrides: Partial<CampaignRow> = {}
): CampaignRow {
  return {
    id: 'campaign-1',
    organization_id: 'legacy-organization-1',
    name: 'Fall Fundraiser',
    description: null,
    goal_amount: 5000,
    pass_price: 25,
    starts_at: '2026-07-01T00:00:00.000Z',
    ends_at: '2026-08-01T00:00:00.000Z',
    status: 'active',
    created_at: '2026-07-01T00:00:00.000Z',
    ...overrides,
  }
}

function createResolver(options?: {
  businessAccess?: BusinessAccessRecord[]
  organizationAccess?: OrganizationAccessRecord[]
  campaignAccess?: CampaignAccessRecord[]
  customerEntitlements?: CustomerEntitlementRecord[]
  hasLegacyCustomerPassAccess?: boolean
  businessById?: BusinessRow | null
  organizationById?: OrganizationRow | null
  organizationByLegacyProfileId?: OrganizationRow | null
  campaignById?: CampaignRow | null
  campaignMembershipById?: CampaignMembershipRow | null
  organizationMembershipById?: OrganizationMembershipRow | null
}) {
  return createCapabilityResolver({
    now: () => new Date('2026-07-15T00:00:00.000Z'),
    loadBusinessAccess: async () => options?.businessAccess ?? [],
    loadOrganizationAccess: async () => options?.organizationAccess ?? [],
    loadCampaignAccess: async () => options?.campaignAccess ?? [],
    loadCustomerEntitlements: async () =>
      options?.customerEntitlements ?? [],
    hasLegacyCustomerPassAccess: async () =>
      options?.hasLegacyCustomerPassAccess ?? false,
    loadBusinessById: async () => options?.businessById ?? null,
    loadOrganizationById: async () =>
      options?.organizationById ?? null,
    loadOrganizationByLegacyProfileId: async () =>
      options?.organizationByLegacyProfileId ?? options?.organizationById ?? null,
    loadCampaignById: async () => options?.campaignById ?? null,
    loadCampaignMembershipById: async () =>
      options?.campaignMembershipById ?? null,
    loadOrganizationMembershipById: async () =>
      options?.organizationMembershipById ?? null,
    loadBusinessAccessForActorAndBusiness: async (actorId, businessId) =>
      (options?.businessAccess ?? []).find(
        ({ business, membership }) =>
          business.id === businessId && membership.user_id === actorId
      ) ?? null,
    loadOrganizationAccessForActorAndOrganization: async (
      actorId,
      organizationId
    ) =>
      (options?.organizationAccess ?? []).find(
        ({ organization, membership }) =>
          organization.id === organizationId && membership.user_id === actorId
      ) ?? null,
    loadOrganizationAccessForActorByLegacyProfileId: async (
      actorId,
      legacyProfileId
    ) =>
      (options?.organizationAccess ?? []).find(
        ({ organization, membership }) =>
          organization.legacy_profile_id === legacyProfileId &&
          membership.user_id === actorId
      ) ?? null,
    loadCampaignAccessForActorAndCampaign: async (actorId, campaignId) =>
      (options?.campaignAccess ?? []).find(
        ({ campaignMembership, organizationMembership }) =>
          campaignMembership.campaign_id === campaignId &&
          organizationMembership.user_id === actorId
      ) ?? null,
  })
}

test('expired customer access does not remove business or organization access', async () => {
  const business = createBusiness()
  const organization = createOrganization()
  const resolver = createResolver({
    businessAccess: [
      {
        business,
        membership: createBusinessMembership(),
      },
    ],
    organizationAccess: [
      {
        organization,
        membership: createOrganizationMembership(),
      },
    ],
    customerEntitlements: [
      createEntitlement({ expires_at: '2026-07-10T00:00:00.000Z' }),
    ],
    businessById: business,
    organizationById: organization,
  })

  const customerResult =
    await resolver.canAccessCustomerBenefitsForActor(actor)
  const businessResult = await resolver.canViewBusinessForActor(
    actor,
    business.id
  )
  const organizationResult =
    await resolver.canViewOrganizationForActor(
      actor,
      organization.id
    )

  assert.equal(customerResult.allowed, false)
  assert.equal(customerResult.reason, 'missing-entitlement')
  assert.equal(businessResult.allowed, true)
  assert.equal(organizationResult.allowed, true)
})

test('owner compatibility continues to allow owner platform access', async () => {
  const ownerActor: AuthenticatedActor = {
    ...actor,
    legacyRole: 'owner',
  }
  const resolver = createResolver()

  const result = await resolver.canAccessOwnerPlatformForActor(
    ownerActor
  )

  assert.equal(result.allowed, true)
  assert.equal(result.source, 'owner-role')
})

test('active membership plus suspended or archived business is denied by lifecycle', async () => {
  const suspendedBusiness = createBusiness({ status: 'suspended' })
  const archivedBusiness = createBusiness({
    archived_at: '2026-07-02T00:00:00.000Z',
  })

  const suspendedResolver = createResolver({
    businessAccess: [
      {
        business: suspendedBusiness,
        membership: createBusinessMembership(),
      },
    ],
    businessById: suspendedBusiness,
  })

  const archivedResolver = createResolver({
    businessAccess: [
      {
        business: archivedBusiness,
        membership: createBusinessMembership(),
      },
    ],
    businessById: archivedBusiness,
  })

  assert.equal(
    (await suspendedResolver.canViewBusinessForActor(actor, suspendedBusiness.id)).reason,
    'workspace-inactive'
  )
  assert.equal(
    (await archivedResolver.canViewBusinessForActor(actor, archivedBusiness.id)).reason,
    'workspace-archived'
  )
})

test('active membership plus suspended or archived organization is denied by lifecycle', async () => {
  const suspendedOrganization = createOrganization({ status: 'suspended' })
  const archivedOrganization = createOrganization({
    archived_at: '2026-07-02T00:00:00.000Z',
  })

  const suspendedResolver = createResolver({
    organizationAccess: [
      {
        organization: suspendedOrganization,
        membership: createOrganizationMembership(),
      },
    ],
    organizationById: suspendedOrganization,
  })

  const archivedResolver = createResolver({
    organizationAccess: [
      {
        organization: archivedOrganization,
        membership: createOrganizationMembership(),
      },
    ],
    organizationById: archivedOrganization,
  })

  assert.equal(
    (await suspendedResolver.canViewOrganizationForActor(actor, suspendedOrganization.id)).reason,
    'workspace-inactive'
  )
  assert.equal(
    (await archivedResolver.canViewOrganizationForActor(actor, archivedOrganization.id)).reason,
    'workspace-archived'
  )
})

test('business role capability matrix stays explicit', async () => {
  const business = createBusiness()
  const resolver = createResolver({
    businessById: business,
    businessAccess: [
      {
        business,
        membership: createBusinessMembership({ membership_role: 'owner' }),
      },
    ],
  })

  assert.equal(
    (await resolver.canManageBusinessMembersForActor(actor, business.id)).allowed,
    true
  )

  const managerResolver = createResolver({
    businessById: business,
    businessAccess: [
      {
        business,
        membership: createBusinessMembership({ membership_role: 'manager' }),
      },
    ],
  })

  assert.equal(
    (await managerResolver.canManageBusinessMembersForActor(actor, business.id)).reason,
    'insufficient-role'
  )

  const staffResolver = createResolver({
    businessById: business,
    businessAccess: [
      {
        business,
        membership: createBusinessMembership({ membership_role: 'staff' }),
      },
    ],
  })

  assert.equal(
    (await staffResolver.canViewBusinessForActor(actor, business.id)).allowed,
    true
  )
  assert.equal(
    (await staffResolver.canManageBusinessForActor(actor, business.id)).reason,
    'insufficient-role'
  )
})

test('organization role capability matrix stays explicit', async () => {
  const organization = createOrganization()

  const adminResolver = createResolver({
    organizationById: organization,
    organizationAccess: [
      {
        organization,
        membership: createOrganizationMembership({ membership_role: 'admin' }),
      },
    ],
  })

  assert.equal(
    (await adminResolver.canManageOrganizationForActor(actor, organization.id)).allowed,
    true
  )

  const managerResolver = createResolver({
    organizationById: organization,
    organizationAccess: [
      {
        organization,
        membership: createOrganizationMembership({ membership_role: 'manager' }),
      },
    ],
  })

  assert.equal(
    (await managerResolver.canManageOrganizationForActor(actor, organization.id)).reason,
    'insufficient-role'
  )
  assert.equal(
    (await managerResolver.canCreateCampaignForActor(actor, organization.id)).allowed,
    true
  )

  const sellerResolver = createResolver({
    organizationById: organization,
    organizationAccess: [
      {
        organization,
        membership: createOrganizationMembership({ membership_role: 'seller' }),
      },
    ],
  })

  assert.equal(
    (await sellerResolver.canViewOrganizationForActor(actor, organization.id)).allowed,
    true
  )
  assert.equal(
    (await sellerResolver.canCreateCampaignForActor(actor, organization.id)).reason,
    'insufficient-role'
  )
})

test('campaign selling requires a sellable campaign and active campaign membership', async () => {
  const organization = createOrganization()
  const organizationMembership = createOrganizationMembership({
    membership_role: 'seller',
  })
  const campaignMembership = createCampaignMembership()
  const campaign = createCampaign()
  const resolver = createResolver({
    organizationById: organization,
    organizationByLegacyProfileId: organization,
    organizationAccess: [
      {
        organization,
        membership: organizationMembership,
      },
    ],
    campaignAccess: [
      {
        campaignMembership,
        organizationMembership,
      },
    ],
    campaignById: campaign,
  })

  const sellResult = await resolver.canSellForCampaignForActor(
    actor,
    campaign.id
  )

  assert.equal(sellResult.allowed, true)
})

test('future, ended, paused, archived, and missing campaigns cannot accept new sales', async () => {
  const organization = createOrganization()
  const organizationMembership = createOrganizationMembership({
    membership_role: 'seller',
  })
  const campaignMembership = createCampaignMembership()

  for (const campaign of [
    createCampaign({ starts_at: '2026-07-20T00:00:00.000Z' }),
    createCampaign({ ends_at: '2026-07-10T00:00:00.000Z' }),
    createCampaign({ status: 'paused' }),
    createCampaign({ status: 'archived' }),
  ]) {
    const resolver = createResolver({
      organizationById: organization,
      organizationByLegacyProfileId: organization,
      organizationAccess: [
        {
          organization,
          membership: organizationMembership,
        },
      ],
      campaignAccess: [
        {
          campaignMembership,
          organizationMembership,
        },
      ],
      campaignById: campaign,
    })

    const result = await resolver.canSellForCampaignForActor(actor, campaign.id)
    assert.equal(result.reason, 'campaign-not-sellable')
  }

  const missingResolver = createResolver()
  assert.equal(
    (await missingResolver.canSellForCampaignForActor(actor, 'missing-campaign')).reason,
    'resource-not-found'
  )
})

test('active campaign membership on a non-sellable campaign is denied while seller progress remains visible after campaign end', async () => {
  const organization = createOrganization()
  const organizationMembership = createOrganizationMembership({
    membership_role: 'seller',
  })
  const campaignMembership = createCampaignMembership()
  const endedCampaign = createCampaign({ ends_at: '2026-07-10T00:00:00.000Z' })

  const resolver = createResolver({
    organizationById: organization,
    organizationByLegacyProfileId: organization,
    organizationAccess: [
      {
        organization,
        membership: organizationMembership,
      },
    ],
    campaignAccess: [
      {
        campaignMembership,
        organizationMembership,
      },
    ],
    campaignById: endedCampaign,
    campaignMembershipById: campaignMembership,
    organizationMembershipById: organizationMembership,
  })

  assert.equal(
    (await resolver.canSellForCampaignForActor(actor, endedCampaign.id)).reason,
    'campaign-not-sellable'
  )
  assert.equal(
    (await resolver.canViewSellerProgressForActor(actor, campaignMembership.id)).allowed,
    true
  )
})

test('cross-organization seller progress access is denied', async () => {
  const organization = createOrganization()
  const foreignOrganizationMembership = createOrganizationMembership({
    id: 'organization-membership-2',
    organization_id: 'organization-2',
    user_id: 'other-user',
    membership_role: 'seller',
  })
  const foreignCampaignMembership = createCampaignMembership({
    id: 'campaign-membership-2',
    organization_membership_id: foreignOrganizationMembership.id,
    campaign_id: 'campaign-2',
  })

  const resolver = createResolver({
    organizationById: organization,
    organizationAccess: [
      {
        organization,
        membership: createOrganizationMembership({ membership_role: 'viewer' }),
      },
    ],
    campaignMembershipById: foreignCampaignMembership,
    organizationMembershipById: foreignOrganizationMembership,
  })

  const result = await resolver.canViewSellerProgressForActor(
    actor,
    foreignCampaignMembership.id
  )

  assert.equal(result.allowed, false)
  assert.equal(result.reason, 'inactive-membership')
})

test('campaign management uses the legacy organization bridge and respects role checks', async () => {
  const organization = createOrganization()
  const organizationMembership = createOrganizationMembership({
    membership_role: 'manager',
  })
  const campaign = createCampaign()

  const resolver = createResolver({
    organizationById: organization,
    organizationByLegacyProfileId: organization,
    organizationAccess: [
      {
        organization,
        membership: organizationMembership,
      },
    ],
    campaignById: campaign,
  })

  assert.equal(
    (await resolver.canManageCampaignForActor(actor, campaign.id)).allowed,
    true
  )

  const viewerResolver = createResolver({
    organizationById: organization,
    organizationByLegacyProfileId: organization,
    organizationAccess: [
      {
        organization,
        membership: createOrganizationMembership({ membership_role: 'viewer' }),
      },
    ],
    campaignById: campaign,
  })

  assert.equal(
    (await viewerResolver.canManageCampaignForActor(actor, campaign.id)).reason,
    'insufficient-role'
  )
})

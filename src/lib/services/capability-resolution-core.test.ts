import assert from 'node:assert/strict'
import test from 'node:test'

import { createCapabilityResolver } from './capability-resolution-core.ts'
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
} from '../types/identity-access.ts'

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
    loadCampaignById: async () => options?.campaignById ?? null,
    loadCampaignMembershipById: async () =>
      options?.campaignMembershipById ?? null,
    loadOrganizationMembershipById: async () =>
      options?.organizationMembershipById ?? null,
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

test('business membership never grants customer entitlement', async () => {
  const business = createBusiness()
  const resolver = createResolver({
    businessAccess: [
      {
        business,
        membership: createBusinessMembership({ membership_role: 'owner' }),
      },
    ],
  })

  const result = await resolver.canAccessCustomerBenefitsForActor(actor)

  assert.equal(result.allowed, false)
  assert.equal(result.reason, 'missing-entitlement')
})

test('customer entitlement never grants organization permissions', async () => {
  const organization = createOrganization()
  const resolver = createResolver({
    customerEntitlements: [createEntitlement()],
    organizationById: organization,
  })

  const result = await resolver.canViewOrganizationForActor(
    actor,
    organization.id
  )

  assert.equal(result.allowed, false)
  assert.equal(result.reason, 'inactive-membership')
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

test('campaign selling requires campaign membership while campaign management can come from org membership', async () => {
  const organization = createOrganization()
  const organizationMembership = createOrganizationMembership({
    membership_role: 'manager',
  })
  const campaignMembership = createCampaignMembership()
  const resolver = createResolver({
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
    campaignById: createCampaign(),
  })

  const manageResult = await resolver.canManageCampaignForActor(
    actor,
    'campaign-1'
  )
  const sellResult = await resolver.canSellForCampaignForActor(
    actor,
    'campaign-1'
  )

  assert.equal(manageResult.allowed, true)
  assert.equal(sellResult.allowed, true)
})

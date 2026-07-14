import assert from 'node:assert/strict'
import test from 'node:test'

import {
  getBusinessLifecycleDenialReason,
  getLegacyWorkspaceRole,
  getOrganizationLifecycleDenialReason,
  hasBusinessCapability,
  hasOrganizationCapability,
  isBusinessOperational,
  isCampaignCurrentlySellable,
  isCustomerEntitlementActive,
  isLegacyPurchaseActive,
  isOrganizationOperational,
} from './identity-access-rules'
import type {
  BusinessRow,
  CampaignRow,
  CustomerEntitlementRecord,
  OrganizationRow,
} from '../types/identity-access'

function createEntitlement(
  overrides: Partial<CustomerEntitlementRecord> = {}
): CustomerEntitlementRecord {
  return {
    id: 'entitlement-1',
    user_id: 'user-1',
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

test('legacy workspace role mapping preserves current routing roles', () => {
  assert.equal(getLegacyWorkspaceRole('business'), 'business')
  assert.equal(getLegacyWorkspaceRole('organization'), 'organization')
  assert.equal(getLegacyWorkspaceRole('customer'), 'customer')
  assert.equal(getLegacyWorkspaceRole('owner'), null)
})

test('business and organization capability rules stay explicit', () => {
  assert.equal(
    hasBusinessCapability('owner', 'canManageBusinessMembers'),
    true
  )
  assert.equal(
    hasBusinessCapability('manager', 'canManageBusinessMembers'),
    false
  )
  assert.equal(
    hasOrganizationCapability('admin', 'canManageOrganization'),
    true
  )
  assert.equal(
    hasOrganizationCapability('manager', 'canManageOrganization'),
    false
  )
  assert.equal(
    hasOrganizationCapability('seller', 'canViewSellerProgress'),
    true
  )
})

test('workspace lifecycle rules detect inactive and archived businesses', () => {
  assert.equal(isBusinessOperational(createBusiness()), true)
  assert.equal(
    getBusinessLifecycleDenialReason(
      createBusiness({ status: 'suspended' })
    ),
    'workspace-inactive'
  )
  assert.equal(
    getBusinessLifecycleDenialReason(
      createBusiness({ archived_at: '2026-07-02T00:00:00.000Z' })
    ),
    'workspace-archived'
  )
})

test('workspace lifecycle rules detect inactive and archived organizations', () => {
  assert.equal(isOrganizationOperational(createOrganization()), true)
  assert.equal(
    getOrganizationLifecycleDenialReason(
      createOrganization({ status: 'suspended' })
    ),
    'workspace-inactive'
  )
  assert.equal(
    getOrganizationLifecycleDenialReason(
      createOrganization({ archived_at: '2026-07-02T00:00:00.000Z' })
    ),
    'workspace-archived'
  )
})

test('campaign sellability checks status and date window', () => {
  const now = new Date('2026-07-15T00:00:00.000Z')

  assert.equal(isCampaignCurrentlySellable(createCampaign(), now), true)
  assert.equal(
    isCampaignCurrentlySellable(
      createCampaign({ starts_at: '2026-07-20T00:00:00.000Z' }),
      now
    ),
    false
  )
  assert.equal(
    isCampaignCurrentlySellable(
      createCampaign({ ends_at: '2026-07-10T00:00:00.000Z' }),
      now
    ),
    false
  )
  assert.equal(
    isCampaignCurrentlySellable(
      createCampaign({ status: 'paused' }),
      now
    ),
    false
  )
  assert.equal(
    isCampaignCurrentlySellable(
      createCampaign({ status: 'archived' }),
      now
    ),
    false
  )
})

test('legacy purchase compatibility matches the current non-failed behavior', () => {
  assert.equal(isLegacyPurchaseActive('test_paid'), true)
  assert.equal(isLegacyPurchaseActive('paid'), true)
  assert.equal(isLegacyPurchaseActive('failed'), false)
  assert.equal(isLegacyPurchaseActive(null), false)
})

test('customer entitlement activity checks status, time, revocation, and purchase state', () => {
  const now = new Date('2026-07-15T00:00:00.000Z')

  assert.equal(isCustomerEntitlementActive(createEntitlement(), now), true)
  assert.equal(
    isCustomerEntitlementActive(
      createEntitlement({ expires_at: '2026-07-10T00:00:00.000Z' }),
      now
    ),
    false
  )
  assert.equal(
    isCustomerEntitlementActive(
      createEntitlement({ revoked_at: '2026-07-05T00:00:00.000Z' }),
      now
    ),
    false
  )
  assert.equal(
    isCustomerEntitlementActive(
      createEntitlement({ purchase_payment_status: 'failed' }),
      now
    ),
    false
  )
})

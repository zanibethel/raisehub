import assert from 'node:assert/strict'
import test from 'node:test'

import {
  getLegacyWorkspaceRole,
  hasBusinessCapability,
  hasOrganizationCapability,
  isCustomerEntitlementActive,
  isLegacyPurchaseActive,
} from './identity-access-rules.ts'
import type { CustomerEntitlementRecord } from '../types/identity-access.ts'

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

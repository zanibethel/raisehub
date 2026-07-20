import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createPurchasePricingSnapshot,
} from '@/lib/services/purchase-pricing-snapshot-core'
import type {
  EffectivePricingResult,
} from '@/lib/services/pricing-resolution-core'

function paidPricing(
  overrides: Partial<EffectivePricingResult> = {}
): EffectivePricingResult {
  return {
    pricingRuleId: 'rule-1',
    pricingScope: 'campaign',
    passPrice: 20,
    platformFeePercent: 20,
    platformFeeAmount: 4,
    organizationPassEarnings: 16,
    donationAmount: 5,
    organizationTotalEarnings: 21,
    totalAmount: 25,
    usedFallback: false,
    ...overrides,
  }
}

test('paid pass snapshots preserve resolved pricing', () => {
  const pricingResolvedAt =
    new Date('2026-07-20T14:30:00.000Z')

  const snapshot = createPurchasePricingSnapshot({
    isDonationOnly: false,
    donationAmount: 5,
    effectivePricing: paidPricing(),
    pricingResolvedAt,
  })

  assert.deepEqual(snapshot, {
    amountPaid: 25,
    platformFee: 4,
    organizationEarnings: 21,
    grantEntitlement: true,
    pricingRuleId: 'rule-1',
    pricingScope: 'campaign',
    passPriceCharged: 20,
    platformFeePercent: 20,
    organizationPassEarnings: 16,
    pricingResolvedAt:
      '2026-07-20T14:30:00.000Z',
  })
})

test('fallback paid snapshots preserve fallback scope', () => {
  const snapshot = createPurchasePricingSnapshot({
    isDonationOnly: false,
    donationAmount: 0,
    effectivePricing: paidPricing({
      pricingRuleId: null,
      pricingScope: 'fallback',
      usedFallback: true,
    }),
    pricingResolvedAt:
      new Date('2026-07-20T14:31:00.000Z'),
  })

  assert.equal(snapshot.pricingRuleId, null)
  assert.equal(snapshot.pricingScope, 'fallback')
  assert.equal(snapshot.grantEntitlement, true)
})

test('donation-only snapshots omit pass pricing', () => {
  const snapshot = createPurchasePricingSnapshot({
    isDonationOnly: true,
    donationAmount: 12.5,
    effectivePricing: null,
    pricingResolvedAt:
      new Date('2026-07-20T14:32:00.000Z'),
  })

  assert.deepEqual(snapshot, {
    amountPaid: 12.5,
    platformFee: 0,
    organizationEarnings: 12.5,
    grantEntitlement: false,
    pricingRuleId: null,
    pricingScope: null,
    passPriceCharged: null,
    platformFeePercent: null,
    organizationPassEarnings: null,
    pricingResolvedAt: null,
  })
})

test('donation-only snapshots ignore resolved pass pricing', () => {
  const snapshot = createPurchasePricingSnapshot({
    isDonationOnly: true,
    donationAmount: 8,
    effectivePricing: paidPricing(),
    pricingResolvedAt:
      new Date('2026-07-20T14:33:00.000Z'),
  })

  assert.equal(snapshot.amountPaid, 8)
  assert.equal(snapshot.platformFee, 0)
  assert.equal(snapshot.grantEntitlement, false)
  assert.equal(snapshot.pricingRuleId, null)
  assert.equal(snapshot.pricingResolvedAt, null)
})

test('paid pass snapshots require resolved pricing', () => {
  assert.throws(
    () =>
      createPurchasePricingSnapshot({
        isDonationOnly: false,
        donationAmount: 0,
        effectivePricing: null,
        pricingResolvedAt:
          new Date('2026-07-20T14:34:00.000Z'),
      }),
    {
      message:
        'Paid pass purchases require resolved pricing.',
    }
  )
})
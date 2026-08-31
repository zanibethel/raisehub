import assert from 'node:assert/strict'
import test from 'node:test'

import {
  calculateCustomerSavings,
  getVerifiedFixedSavings,
} from './customer-savings'

import type { CustomerRedemptionEvent } from './customer-redemption-history'
import type { CustomerDashboardOffer } from '@/types/customer-dashboard'

function createOffer({
  id,
  discount,
}: {
  id: string
  discount: string | null
}): CustomerDashboardOffer {
  return {
    id,
    title: `Offer ${id}`,
    description: null,
    discount,
    starts_at: null,
    ends_at: null,
  } as CustomerDashboardOffer
}

function createRedemption({
  id,
  offerId,
  status = 'confirmed',
  benefitSnapshot,
}: {
  id: string
  offerId: string
  status?: string
  benefitSnapshot?: string | null
}): CustomerRedemptionEvent {
  return {
    id,
    offer_id: offerId,
    created_at: '2026-07-20T12:00:00.000Z',
    status,
    benefit_snapshot: benefitSnapshot,
  }
}

test('parses supported fixed-dollar savings wording', () => {
  assert.equal(getVerifiedFixedSavings('$5 off your purchase'), 5)
  assert.equal(getVerifiedFixedSavings('$12.50 discount'), 12.5)
  assert.equal(getVerifiedFixedSavings('$1,000 savings'), 1000)
  assert.equal(getVerifiedFixedSavings('Save $10 today'), 10)
  assert.equal(getVerifiedFixedSavings('Savings $7.25'), 7.25)
  assert.equal(getVerifiedFixedSavings('Discount of $15'), 15)
  assert.equal(getVerifiedFixedSavings('Offer discount $8.50'), 8.5)
})

test('ignores discounts without a verified fixed-dollar value', () => {
  const unsupportedDiscounts = [
    null,
    '',
    '   ',
    '20% off',
    'Buy one get one free',
    'Free appetizer',
    'Half price',
    '$5 minimum purchase',
    'Spend $25 and receive a gift',
  ]

  for (const discount of unsupportedDiscounts) {
    assert.equal(getVerifiedFixedSavings(discount), null)
  }
})

test('rejects invalid or unreasonable fixed-dollar values', () => {
  const invalidDiscounts = [
    '$0 off',
    '$0.00 discount',
    '$1,001 off',
    '$5000 savings',
    'Save $999999',
    '$-5 off',
    '$5.999 off',
  ]

  for (const discount of invalidDiscounts) {
    assert.equal(getVerifiedFixedSavings(discount), null)
  }
})

test('totals confirmed redemption events with fixed-dollar savings', () => {
  const offers = [
    createOffer({ id: 'offer-1', discount: '$5 off' }),
    createOffer({ id: 'offer-2', discount: 'Save $10' }),
    createOffer({ id: 'offer-3', discount: '20% off' }),
  ]

  const summary = calculateCustomerSavings({
    offers,
    redemptions: [
      createRedemption({ id: 'r1', offerId: 'offer-1' }),
      createRedemption({ id: 'r2', offerId: 'offer-2' }),
      createRedemption({ id: 'r3', offerId: 'offer-3' }),
    ],
  })

  assert.deepEqual(summary, {
    redeemedOfferCount: 3,
    valuedRedemptionCount: 2,
    unvaluedRedemptionCount: 1,
    verifiedSavingsAmount: 15,
  })
})

test('counts every confirmed use of a reusable offer', () => {
  const offers = [createOffer({ id: 'daily-deal', discount: '$4 off' })]

  const summary = calculateCustomerSavings({
    offers,
    redemptions: [
      createRedemption({ id: 'day-1', offerId: 'daily-deal' }),
      createRedemption({ id: 'day-2', offerId: 'daily-deal' }),
      createRedemption({ id: 'day-3', offerId: 'daily-deal' }),
    ],
  })

  assert.equal(summary.redeemedOfferCount, 3)
  assert.equal(summary.valuedRedemptionCount, 3)
  assert.equal(summary.verifiedSavingsAmount, 12)
})

test('uses the historical benefit snapshot instead of a later offer edit', () => {
  const offers = [createOffer({ id: 'offer-1', discount: '$100 off' })]

  const summary = calculateCustomerSavings({
    offers,
    redemptions: [
      createRedemption({
        id: 'r1',
        offerId: 'offer-1',
        benefitSnapshot: '$5 off',
      }),
    ],
  })

  assert.equal(summary.verifiedSavingsAmount, 5)
})

test('does not count pending or rejected redemptions as verified savings', () => {
  const offers = [createOffer({ id: 'offer-1', discount: '$10 off' })]

  const summary = calculateCustomerSavings({
    offers,
    redemptions: [
      createRedemption({ id: 'pending', offerId: 'offer-1', status: 'pending' }),
      createRedemption({ id: 'rejected', offerId: 'offer-1', status: 'rejected' }),
    ],
  })

  assert.deepEqual(summary, {
    redeemedOfferCount: 0,
    valuedRedemptionCount: 0,
    unvaluedRedemptionCount: 0,
    verifiedSavingsAmount: 0,
  })
})

test('returns a zero summary when there are no redemptions', () => {
  const summary = calculateCustomerSavings({
    offers: [createOffer({ id: 'offer-1', discount: '$10 off' })],
    redemptions: [],
  })

  assert.deepEqual(summary, {
    redeemedOfferCount: 0,
    valuedRedemptionCount: 0,
    unvaluedRedemptionCount: 0,
    verifiedSavingsAmount: 0,
  })
})

test('rounds combined decimal savings to two currency places', () => {
  const offers = [
    createOffer({ id: 'offer-1', discount: '$1.10 off' }),
    createOffer({ id: 'offer-2', discount: '$2.20 off' }),
  ]

  const summary = calculateCustomerSavings({
    offers,
    redemptions: [
      createRedemption({ id: 'r1', offerId: 'offer-1' }),
      createRedemption({ id: 'r2', offerId: 'offer-2' }),
    ],
  })

  assert.equal(summary.verifiedSavingsAmount, 3.3)
})

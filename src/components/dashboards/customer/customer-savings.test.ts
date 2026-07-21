import assert from 'node:assert/strict'
import test from 'node:test'

import {
  calculateCustomerSavings,
  getVerifiedFixedSavings,
} from './customer-savings'

import type {
  CustomerDashboardOffer,
} from '@/types/customer-dashboard'

// =============================================================================
// Test helpers
// =============================================================================

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

// =============================================================================
// Fixed-dollar parsing
// =============================================================================

test(
  'parses fixed-dollar savings written before the offer wording',
  () => {
    assert.equal(
      getVerifiedFixedSavings(
        '$5 off your purchase'
      ),
      5
    )

    assert.equal(
      getVerifiedFixedSavings(
        '$12.50 discount'
      ),
      12.5
    )

    assert.equal(
      getVerifiedFixedSavings(
        '$1,000 savings'
      ),
      1000
    )
  }
)

test(
  'parses fixed-dollar savings written after save wording',
  () => {
    assert.equal(
      getVerifiedFixedSavings(
        'Save $10 today'
      ),
      10
    )

    assert.equal(
      getVerifiedFixedSavings(
        'Savings $7.25'
      ),
      7.25
    )

    assert.equal(
      getVerifiedFixedSavings(
        'Saving $3'
      ),
      3
    )
  }
)

test(
  'parses fixed-dollar savings written after discount wording',
  () => {
    assert.equal(
      getVerifiedFixedSavings(
        'Discount of $15'
      ),
      15
    )

    assert.equal(
      getVerifiedFixedSavings(
        'Offer discount $8.50'
      ),
      8.5
    )
  }
)

test(
  'ignores discounts without a verified fixed-dollar value',
  () => {
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

    for (
      const discount
      of unsupportedDiscounts
    ) {
      assert.equal(
        getVerifiedFixedSavings(
          discount
        ),
        null
      )
    }
  }
)

test(
  'rejects invalid or unreasonable fixed-dollar values',
  () => {
    const invalidDiscounts = [
      '$0 off',
      '$0.00 discount',
      '$1,001 off',
      '$5000 savings',
      'Save $999999',
      '$-5 off',
      '$5.999 off',
    ]

    for (
      const discount
      of invalidDiscounts
    ) {
      assert.equal(
        getVerifiedFixedSavings(
          discount
        ),
        null
      )
    }
  }
)

// =============================================================================
// Customer savings summary
// =============================================================================

test(
  'totals only redeemed offers with verified fixed-dollar savings',
  () => {
    const offers = [
      createOffer({
        id: 'offer-1',
        discount: '$5 off',
      }),
      createOffer({
        id: 'offer-2',
        discount: 'Save $10',
      }),
      createOffer({
        id: 'offer-3',
        discount: '20% off',
      }),
      createOffer({
        id: 'offer-4',
        discount: '$25 off',
      }),
    ]

    const summary =
      calculateCustomerSavings({
        offers,
        redeemedOfferIds:
          new Set([
            'offer-1',
            'offer-2',
            'offer-3',
          ]),
      })

    assert.deepEqual(
      summary,
      {
        redeemedOfferCount: 3,
        valuedRedemptionCount: 2,
        unvaluedRedemptionCount: 1,
        verifiedSavingsAmount: 15,
      }
    )
  }
)

test(
  'does not count unredeemed offers toward savings',
  () => {
    const offers = [
      createOffer({
        id: 'redeemed',
        discount: '$4 off',
      }),
      createOffer({
        id: 'not-redeemed',
        discount: '$100 off',
      }),
    ]

    const summary =
      calculateCustomerSavings({
        offers,
        redeemedOfferIds:
          new Set(['redeemed']),
      })

    assert.equal(
      summary.redeemedOfferCount,
      1
    )

    assert.equal(
      summary.valuedRedemptionCount,
      1
    )

    assert.equal(
      summary.unvaluedRedemptionCount,
      0
    )

    assert.equal(
      summary.verifiedSavingsAmount,
      4
    )
  }
)

test(
  'returns a zero summary when there are no redemptions',
  () => {
    const summary =
      calculateCustomerSavings({
        offers: [
          createOffer({
            id: 'offer-1',
            discount: '$10 off',
          }),
        ],
        redeemedOfferIds:
          new Set(),
      })

    assert.deepEqual(
      summary,
      {
        redeemedOfferCount: 0,
        valuedRedemptionCount: 0,
        unvaluedRedemptionCount: 0,
        verifiedSavingsAmount: 0,
      }
    )
  }
)

test(
  'rounds combined decimal savings to two currency places',
  () => {
    const offers = [
      createOffer({
        id: 'offer-1',
        discount: '$1.10 off',
      }),
      createOffer({
        id: 'offer-2',
        discount: '$2.20 off',
      }),
    ]

    const summary =
      calculateCustomerSavings({
        offers,
        redeemedOfferIds:
          new Set([
            'offer-1',
            'offer-2',
          ]),
      })

    assert.equal(
      summary.verifiedSavingsAmount,
      3.3
    )
  }
)
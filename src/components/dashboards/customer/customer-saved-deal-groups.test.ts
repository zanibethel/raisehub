import assert from 'node:assert/strict'
import test from 'node:test'

import {
  getCustomerReadyToUseDealCountLabel,
  getCustomerSavedDealGroupCountLabel,
  getCustomerSavedDealGroups,
  getCustomerUsedDealCountLabel,
} from './customer-saved-deal-groups'

import type {
  CustomerSavedDeal,
} from './customer-saved-deals'
import type {
  CustomerDashboardOffer,
} from '@/types/customer-dashboard'

// =============================================================================
// Test helpers
// =============================================================================

function createDeal({
  id,
  isRedeemed,
}: {
  id: string
  isRedeemed: boolean
}): CustomerSavedDeal {
  return {
    offer: {
      id,
    } as CustomerDashboardOffer,
    isRedeemed,
  }
}

// =============================================================================
// Deal grouping
// =============================================================================

test(
  'separates ready-to-use deals from used deals',
  () => {
    const readyDeal =
      createDeal({
        id: 'ready-deal',
        isRedeemed: false,
      })

    const usedDeal =
      createDeal({
        id: 'used-deal',
        isRedeemed: true,
      })

    const groups =
      getCustomerSavedDealGroups([
        readyDeal,
        usedDeal,
      ])

    assert.deepEqual(
      groups.readyToUse,
      [readyDeal]
    )

    assert.deepEqual(
      groups.used,
      [usedDeal]
    )
  }
)

test(
  'preserves the original order within each deal group',
  () => {
    const groups =
      getCustomerSavedDealGroups([
        createDeal({
          id: 'ready-first',
          isRedeemed: false,
        }),
        createDeal({
          id: 'used-first',
          isRedeemed: true,
        }),
        createDeal({
          id: 'ready-second',
          isRedeemed: false,
        }),
        createDeal({
          id: 'used-second',
          isRedeemed: true,
        }),
      ])

    assert.deepEqual(
      groups.readyToUse.map(
        ({ offer }) => offer.id
      ),
      [
        'ready-first',
        'ready-second',
      ]
    )

    assert.deepEqual(
      groups.used.map(
        ({ offer }) => offer.id
      ),
      [
        'used-first',
        'used-second',
      ]
    )
  }
)

test(
  'returns empty groups when there are no saved deals',
  () => {
    assert.deepEqual(
      getCustomerSavedDealGroups(
        []
      ),
      {
        readyToUse: [],
        used: [],
      }
    )
  }
)

// =============================================================================
// Generic group count wording
// =============================================================================

test(
  'uses singular generic group wording',
  () => {
    assert.equal(
      getCustomerSavedDealGroupCountLabel({
        count: 1,
        singularLabel: 'deal',
        pluralLabel: 'deals',
      }),
      '1 deal'
    )
  }
)

test(
  'uses plural generic group wording',
  () => {
    assert.equal(
      getCustomerSavedDealGroupCountLabel({
        count: 0,
        singularLabel: 'deal',
        pluralLabel: 'deals',
      }),
      '0 deals'
    )

    assert.equal(
      getCustomerSavedDealGroupCountLabel({
        count: 4,
        singularLabel: 'deal',
        pluralLabel: 'deals',
      }),
      '4 deals'
    )
  }
)

// =============================================================================
// Ready-to-use count wording
// =============================================================================

test(
  'formats ready-to-use deal counts',
  () => {
    assert.equal(
      getCustomerReadyToUseDealCountLabel(
        1
      ),
      '1 deal'
    )

    assert.equal(
      getCustomerReadyToUseDealCountLabel(
        3
      ),
      '3 deals'
    )
  }
)

// =============================================================================
// Used-deal count wording
// =============================================================================

test(
  'formats used-deal counts',
  () => {
    assert.equal(
      getCustomerUsedDealCountLabel(
        1
      ),
      '1 used deal'
    )

    assert.equal(
      getCustomerUsedDealCountLabel(
        5
      ),
      '5 used deals'
    )
  }
)
import assert from 'node:assert/strict'
import test from 'node:test'

import {
  getCustomerSavedDealCountLabel,
  getCustomerSavedDealGuidance,
  getCustomerUnusedSavedDealCountLabel,
} from './customer-saved-deal-guidance'

// =============================================================================
// Saved-deal count labels
// =============================================================================

test(
  'uses singular saved-deal wording',
  () => {
    assert.equal(
      getCustomerSavedDealCountLabel(
        1
      ),
      '1 saved deal'
    )
  }
)

test(
  'uses plural saved-deal wording',
  () => {
    assert.equal(
      getCustomerSavedDealCountLabel(
        0
      ),
      '0 saved deals'
    )

    assert.equal(
      getCustomerSavedDealCountLabel(
        5
      ),
      '5 saved deals'
    )
  }
)

// =============================================================================
// Ready-to-use count labels
// =============================================================================

test(
  'uses singular ready-to-use wording',
  () => {
    assert.equal(
      getCustomerUnusedSavedDealCountLabel(
        1
      ),
      '1 ready to use'
    )
  }
)

test(
  'uses plural ready-to-use wording',
  () => {
    assert.equal(
      getCustomerUnusedSavedDealCountLabel(
        0
      ),
      '0 ready to use'
    )

    assert.equal(
      getCustomerUnusedSavedDealCountLabel(
        4
      ),
      '4 ready to use'
    )
  }
)

// =============================================================================
// Empty My Pass guidance
// =============================================================================

test(
  'guides customers to save their first deal',
  () => {
    assert.deepEqual(
      getCustomerSavedDealGuidance({
        savedDealCount: 0,
        unusedSavedDealCount: 0,
      }),
      {
        eyebrow:
          'Nothing Saved Yet',
        title:
          'Save a deal you plan to use',
        description:
          'Browse your available offers and save your favorites. They will appear here so you can find and redeem them quickly.',
      }
    )
  }
)

// =============================================================================
// All-used guidance
// =============================================================================

test(
  'guides customers back to available offers when every saved deal is used',
  () => {
    assert.deepEqual(
      getCustomerSavedDealGuidance({
        savedDealCount: 3,
        unusedSavedDealCount: 0,
      }),
      {
        eyebrow:
          'All Caught Up',
        title:
          'You have used every saved deal',
        description:
          'Browse the available offers below and save another deal whenever you find one you want to use.',
      }
    )
  }
)

// =============================================================================
// Ready-to-use guidance
// =============================================================================

test(
  'provides singular guidance for one unused saved deal',
  () => {
    assert.deepEqual(
      getCustomerSavedDealGuidance({
        savedDealCount: 2,
        unusedSavedDealCount: 1,
      }),
      {
        eyebrow:
          'Ready When You Are',
        title:
          'You have 1 saved deal ready to use',
        description:
          'Open the deal when you arrive at the business, review the details, and redeem it when the business is ready.',
      }
    )
  }
)

test(
  'provides plural guidance for multiple unused saved deals',
  () => {
    assert.deepEqual(
      getCustomerSavedDealGuidance({
        savedDealCount: 5,
        unusedSavedDealCount: 3,
      }),
      {
        eyebrow:
          'Ready When You Are',
        title:
          'You have 3 saved deals ready to use',
        description:
          'Choose the deal you want, review its details, and redeem it when you arrive at the business.',
      }
    )
  }
)
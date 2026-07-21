import assert from 'node:assert/strict'
import test from 'node:test'

import {
  getUseOfferGuidance,
} from './use-offer-guidance'

// =============================================================================
// Redemption labels
// =============================================================================

test(
  'uses clear redemption button labels',
  () => {
    const guidance =
      getUseOfferGuidance()

    assert.equal(
      guidance.buttonLabel,
      'Redeem Offer'
    )

    assert.equal(
      guidance.loadingLabel,
      'Redeeming...'
    )
  }
)

// =============================================================================
// Confirmation safety
// =============================================================================

test(
  'warns the customer to wait for business staff',
  () => {
    const guidance =
      getUseOfferGuidance()

    assert.match(
      guidance.confirmationMessage,
      /staff member is ready/i
    )
  }
)

test(
  'warns that redemption cannot be undone',
  () => {
    const guidance =
      getUseOfferGuidance()

    assert.match(
      guidance.confirmationMessage,
      /cannot be undone/i
    )

    assert.match(
      guidance.confirmationMessage,
      /redeem now\?/i
    )
  }
)

// =============================================================================
// Customer status messages
// =============================================================================

test(
  'provides a successful redemption message',
  () => {
    const guidance =
      getUseOfferGuidance()

    assert.equal(
      guidance.successMessage,
      'Offer redeemed successfully.'
    )
  }
)

test(
  'provides an already-redeemed message',
  () => {
    const guidance =
      getUseOfferGuidance()

    assert.equal(
      guidance.alreadyUsedMessage,
      'This offer has already been redeemed.'
    )
  }
)

test(
  'provides a sign-in-required message',
  () => {
    const guidance =
      getUseOfferGuidance()

    assert.equal(
      guidance.signInRequiredMessage,
      'Please sign in before redeeming this offer.'
    )
  }
)

// =============================================================================
// Returned object isolation
// =============================================================================

test(
  'returns a fresh guidance object each time',
  () => {
    const firstGuidance =
      getUseOfferGuidance()

    const secondGuidance =
      getUseOfferGuidance()

    assert.notEqual(
      firstGuidance,
      secondGuidance
    )

    assert.deepEqual(
      firstGuidance,
      secondGuidance
    )
  }
)
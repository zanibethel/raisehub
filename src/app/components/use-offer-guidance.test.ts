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
      'Recording Redemption...'
    )
  }
)

// =============================================================================
// Confirmation safety
// =============================================================================

test(
  'explains immediate redemption and the business review window',
  () => {
    const guidance =
      getUseOfferGuidance()

    assert.match(
      guidance.confirmationMessage,
      /participating business/i
    )

    assert.match(
      guidance.confirmationMessage,
      /records it immediately/i
    )

    assert.match(
      guidance.confirmationMessage,
      /24 hours/i
    )

    assert.match(
      guidance.confirmationMessage,
      /unauthorized redemption/i
    )

    assert.match(
      guidance.confirmationMessage,
      /confirms automatically/i
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

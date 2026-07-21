// =============================================================================
// Types
// =============================================================================

export type UseOfferGuidance = {
  buttonLabel: string
  loadingLabel: string
  confirmationMessage: string
  successMessage: string
  alreadyUsedMessage: string
  signInRequiredMessage: string
}

// =============================================================================
// Default redemption guidance
// =============================================================================

const DEFAULT_USE_OFFER_GUIDANCE: UseOfferGuidance = {
  buttonLabel: 'Redeem Offer',
  loadingLabel: 'Redeeming...',
  confirmationMessage:
    'Only redeem this offer when you are at the business and a staff member is ready. This action cannot be undone. Redeem now?',
  successMessage:
    'Offer redeemed successfully.',
  alreadyUsedMessage:
    'This offer has already been redeemed.',
  signInRequiredMessage:
    'Please sign in before redeeming this offer.',
}

// =============================================================================
// Guidance access
// =============================================================================

export function getUseOfferGuidance():
  UseOfferGuidance {
  return {
    ...DEFAULT_USE_OFFER_GUIDANCE,
  }
}
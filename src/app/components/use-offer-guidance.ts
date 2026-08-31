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
  loadingLabel: 'Recording Redemption...',
  confirmationMessage:
    'Redeem this offer only when you are using it at the participating business. RaiseHub records it immediately. The business has 24 hours to report an unauthorized redemption; otherwise it confirms automatically. Redeem now?',
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

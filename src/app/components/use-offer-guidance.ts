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
  loadingLabel: 'Creating Code...',
  confirmationMessage:
    'Are you at the business with a staff member ready to confirm this offer? RaiseHub will create a 5-minute confirmation code, but the deal will not count as used until the business confirms it.',
  successMessage:
    'Offer confirmed successfully.',
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

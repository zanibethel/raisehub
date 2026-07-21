import type {
  CustomerDashboardOffer,
} from '@/types/customer-dashboard'

// =============================================================================
// Types
// =============================================================================

type CalculateCustomerSavingsOptions = {
  offers: CustomerDashboardOffer[]
  redeemedOfferIds: Set<string>
}

export type CustomerSavingsSummary = {
  redeemedOfferCount: number
  valuedRedemptionCount: number
  unvaluedRedemptionCount: number
  verifiedSavingsAmount: number
}

// =============================================================================
// Constants
// =============================================================================

const MAX_REASONABLE_FIXED_SAVINGS =
  1000

// =============================================================================
// Currency helpers
// =============================================================================

function normalizeCurrencyAmount(
  value: string
): number | null {
  const normalizedValue = value
    .replace(/,/g, '')
    .trim()

  const amount = Number(
    normalizedValue
  )

  if (
    !Number.isFinite(amount) ||
    amount <= 0 ||
    amount >
      MAX_REASONABLE_FIXED_SAVINGS
  ) {
    return null
  }

  return Math.round(
    amount * 100
  ) / 100
}

// =============================================================================
// Discount parsing
// =============================================================================

export function getVerifiedFixedSavings(
  discount:
    | string
    | null
    | undefined
): number | null {
  if (!discount) {
    return null
  }

  const normalizedDiscount =
    discount.trim()

  if (!normalizedDiscount) {
    return null
  }

  const fixedSavingsPatterns = [
    /\$\s*([\d,]+(?:\.\d{1,2})?)\s*(?:off|discount|savings?)/i,
    /(?:save|saving|savings)\s*\$\s*([\d,]+(?:\.\d{1,2})?)/i,
    /(?:off|discount)\s*(?:of\s*)?\$\s*([\d,]+(?:\.\d{1,2})?)/i,
  ]

  for (
    const pattern
    of fixedSavingsPatterns
  ) {
    const match =
      normalizedDiscount.match(
        pattern
      )

    if (!match?.[1]) {
      continue
    }

    const amount =
      normalizeCurrencyAmount(
        match[1]
      )

    if (amount !== null) {
      return amount
    }
  }

  return null
}

// =============================================================================
// Savings summary
// =============================================================================

export function calculateCustomerSavings({
  offers,
  redeemedOfferIds,
}: CalculateCustomerSavingsOptions):
  CustomerSavingsSummary {
  let valuedRedemptionCount = 0
  let verifiedSavingsAmount = 0

  const redeemedOffers =
    offers.filter((offer) =>
      redeemedOfferIds.has(offer.id)
    )

  for (
    const offer
    of redeemedOffers
  ) {
    const fixedSavings =
      getVerifiedFixedSavings(
        offer.discount
      )

    if (fixedSavings === null) {
      continue
    }

    valuedRedemptionCount += 1
    verifiedSavingsAmount +=
      fixedSavings
  }

  const redeemedOfferCount =
    redeemedOffers.length

  return {
    redeemedOfferCount,
    valuedRedemptionCount,
    unvaluedRedemptionCount:
      redeemedOfferCount -
      valuedRedemptionCount,
    verifiedSavingsAmount:
      Math.round(
        verifiedSavingsAmount *
          100
      ) / 100,
  }
}
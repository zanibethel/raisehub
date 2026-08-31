import type {
  CustomerDashboardOffer,
} from '@/types/customer-dashboard'
import type {
  CustomerRedemptionEvent,
} from './customer-redemption-history'

type CalculateCustomerSavingsOptions = {
  offers: CustomerDashboardOffer[]
  redemptions: CustomerRedemptionEvent[]
}

export type CustomerSavingsSummary = {
  redeemedOfferCount: number
  valuedRedemptionCount: number
  unvaluedRedemptionCount: number
  verifiedSavingsAmount: number
}

const MAX_REASONABLE_FIXED_SAVINGS = 1000

function normalizeCurrencyAmount(
  value: string
): number | null {
  const normalizedValue = value
    .replace(/,/g, '')
    .trim()

  const amount = Number(normalizedValue)

  if (
    !Number.isFinite(amount) ||
    amount <= 0 ||
    amount > MAX_REASONABLE_FIXED_SAVINGS
  ) {
    return null
  }

  return Math.round(amount * 100) / 100
}

export function getVerifiedFixedSavings(
  discount: string | null | undefined
): number | null {
  if (!discount) return null

  const normalizedDiscount = discount.trim()
  if (!normalizedDiscount) return null

  const fixedSavingsPatterns = [
    /\$\s*([\d,]+(?:\.\d{1,2})?)\s*(?:off|discount|savings?)/i,
    /(?:save|saving|savings)\s*\$\s*([\d,]+(?:\.\d{1,2})?)/i,
    /(?:off|discount)\s*(?:of\s*)?\$\s*([\d,]+(?:\.\d{1,2})?)/i,
  ]

  for (const pattern of fixedSavingsPatterns) {
    const match = normalizedDiscount.match(pattern)
    if (!match?.[1]) continue

    const amount = normalizeCurrencyAmount(match[1])
    if (amount !== null) return amount
  }

  return null
}

export function calculateCustomerSavings({
  offers,
  redemptions,
}: CalculateCustomerSavingsOptions): CustomerSavingsSummary {
  const offerById = new Map(offers.map((offer) => [offer.id, offer]))
  const confirmedRedemptions = redemptions.filter(
    (redemption) => redemption.status === 'confirmed'
  )

  let valuedRedemptionCount = 0
  let verifiedSavingsAmount = 0

  for (const redemption of confirmedRedemptions) {
    const offer = offerById.get(redemption.offer_id)
    const benefitSnapshot = redemption.benefit_snapshot?.trim()
    const fixedSavings = getVerifiedFixedSavings(
      benefitSnapshot || offer?.discount
    )

    if (fixedSavings === null) continue

    valuedRedemptionCount += 1
    verifiedSavingsAmount += fixedSavings
  }

  const redeemedOfferCount = confirmedRedemptions.length

  return {
    redeemedOfferCount,
    valuedRedemptionCount,
    unvaluedRedemptionCount:
      redeemedOfferCount - valuedRedemptionCount,
    verifiedSavingsAmount:
      Math.round(verifiedSavingsAmount * 100) / 100,
  }
}

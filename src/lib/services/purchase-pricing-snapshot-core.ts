import type {
  EffectivePricingResult,
} from '@/lib/services/pricing-resolution-core'

export type PurchasePricingSnapshotInput = {
  isDonationOnly: boolean
  donationAmount: number
  effectivePricing: EffectivePricingResult | null
  pricingResolvedAt: Date
}

export type PurchasePricingSnapshot = {
  amountPaid: number
  platformFee: number
  organizationEarnings: number
  grantEntitlement: boolean
  pricingRuleId: string | null
  pricingScope: string | null
  passPriceCharged: number | null
  platformFeePercent: number | null
  organizationPassEarnings: number | null
  pricingResolvedAt: string | null
}

export function createPurchasePricingSnapshot({
  isDonationOnly,
  donationAmount,
  effectivePricing,
  pricingResolvedAt,
}: PurchasePricingSnapshotInput): PurchasePricingSnapshot {
  if (isDonationOnly) {
    return {
      amountPaid: donationAmount,
      platformFee: 0,
      organizationEarnings: donationAmount,
      grantEntitlement: false,
      pricingRuleId: null,
      pricingScope: null,
      passPriceCharged: null,
      platformFeePercent: null,
      organizationPassEarnings: null,
      pricingResolvedAt: null,
    }
  }

  if (!effectivePricing) {
    throw new Error(
      'Paid pass purchases require resolved pricing.'
    )
  }

  return {
    amountPaid: effectivePricing.totalAmount,
    platformFee:
      effectivePricing.platformFeeAmount,
    organizationEarnings:
      effectivePricing.organizationTotalEarnings,
    grantEntitlement: true,
    pricingRuleId:
      effectivePricing.pricingRuleId,
    pricingScope:
      effectivePricing.pricingScope,
    passPriceCharged:
      effectivePricing.passPrice,
    platformFeePercent:
      effectivePricing.platformFeePercent,
    organizationPassEarnings:
      effectivePricing.organizationPassEarnings,
    pricingResolvedAt:
      pricingResolvedAt.toISOString(),
  }
}
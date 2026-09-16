import { scoreOffer } from '@/lib/ai/scoring'
import type { OfferQualityInput, OfferQualityScore } from '@/lib/ai/offer-quality'

export const PARTNER_REWARDS_RULE_VERSION = 'partner_rewards_v1' as const
export const PARTNER_REWARDS_SCORING_VERSION = 'offer_quality_v1' as const

export const PARTNER_POINTS_DISCLOSURE =
  'Partner Points have no fixed cash value. They determine a business’s proportional share of the quarterly Partner Rewards Pool.'

export type PartnerOfferScoreBand =
  | 'poor'
  | 'developing'
  | 'recommended'
  | 'high_value'
  | 'exceptional'

export type PartnerOfferRewardScore = {
  quality: OfferQualityScore
  band: PartnerOfferScoreBand
  dailyWeight: number
  earnsDailyPoints: boolean
}

export function getPartnerOfferRewardBand(score: number): PartnerOfferScoreBand {
  if (score >= 95) return 'exceptional'
  if (score >= 85) return 'high_value'
  if (score >= 70) return 'recommended'
  if (score >= 50) return 'developing'
  return 'poor'
}

export function getPartnerOfferDailyWeight(score: number) {
  const band = getPartnerOfferRewardBand(score)

  switch (band) {
    case 'exceptional':
      return 1.5
    case 'high_value':
      return 1.25
    case 'recommended':
      return 1
    case 'developing':
      return 0.5
    case 'poor':
      return 0
  }
}

/**
 * Reuses the existing RaiseHub offer-quality scorer, then derives the rewards
 * weight from the same score. This avoids creating a second competing offer
 * score while keeping rewards logic additive.
 */
export function scoreOfferForPartnerRewards(
  input: OfferQualityInput
): PartnerOfferRewardScore {
  const quality = scoreOffer(input)
  const band = getPartnerOfferRewardBand(quality.total)
  const dailyWeight = getPartnerOfferDailyWeight(quality.total)

  return {
    quality,
    band,
    dailyWeight,
    earnsDailyPoints: dailyWeight > 0,
  }
}

export function calculatePartnerPoolShare(
  businessEligiblePoints: number,
  networkEligiblePoints: number
) {
  if (businessEligiblePoints <= 0 || networkEligiblePoints <= 0) return 0

  return businessEligiblePoints / networkEligiblePoints
}

export function calculateWeightedOfferPoints(
  qualifyingDays: number,
  dailyWeight: number
) {
  if (qualifyingDays <= 0 || dailyWeight <= 0) return 0

  return Number((qualifyingDays * dailyWeight).toFixed(4))
}

import {
  OFFER_QUALITY_STANDARD,
  normalizeOfferText,
  type OfferQualityInput,
  type OfferQualityScore,
} from './offer-quality'

// =============================================================================
// Helpers
// =============================================================================

function clampScore(score: number) {
  return Math.max(1, Math.min(5, score))
}

function containsAny(text: string, patterns: readonly string[]) {
  return patterns.some((pattern) => text.includes(pattern))
}

// =============================================================================
// Offer scoring
// =============================================================================

export function scoreOffer(
  input: OfferQualityInput
): OfferQualityScore {
  const text = normalizeOfferText(input)
  const feedback: string[] = []

  let memberValue = 3
  let businessSustainability = 3
  let exclusivity = input.isExclusive ? 4 : 2
  let growthPotential = 3

  const weakOffer = containsAny(
    text,
    OFFER_QUALITY_STANDARD.weakOfferPatterns
  )

  const preferredSignal = containsAny(
    text,
    OFFER_QUALITY_STANDARD.preferredOfferSignals
  )

  if (weakOffer) {
    memberValue -= 2
    growthPotential -= 1

    feedback.push(
      'The customer value may feel too small for a paid RaiseHub membership.'
    )
  }

  if (preferredSignal) {
    memberValue += 1
    growthPotential += 1

    feedback.push(
      'This offer uses a high-perceived-value structure that is easy for customers to understand.'
    )
  }

  if (input.isExclusive) {
    exclusivity += 1

    feedback.push(
      'The offer is clearly reserved for RaiseHub members.'
    )
  } else {
    feedback.push(
      'Make this offer exclusive to RaiseHub so members receive something unavailable elsewhere.'
    )
  }

  if (
    typeof input.estimatedRetailValue === 'number' &&
    input.estimatedRetailValue >= 8
  ) {
    memberValue += 1

    feedback.push(
      'The estimated customer value is meaningful enough to support the value of the pass.'
    )
  }

  if (
    typeof input.estimatedBusinessCost === 'number' &&
    typeof input.estimatedRetailValue === 'number' &&
    input.estimatedRetailValue > 0
  ) {
    const costRatio =
      input.estimatedBusinessCost / input.estimatedRetailValue

    if (costRatio <= 0.35) {
      businessSustainability += 2

      feedback.push(
        'The customer receives strong value while the estimated business cost remains controlled.'
      )
    } else if (costRatio <= 0.6) {
      businessSustainability += 1
    } else {
      businessSustainability -= 1

      feedback.push(
        'Consider replacing part of the discount with a lower-cost add-on, upgrade, or bundle.'
      )
    }
  }

  if (input.requiresPurchase) {
    businessSustainability += 1
    growthPotential += 1

    feedback.push(
      'The qualifying purchase helps protect business revenue and can increase the average transaction.'
    )
  }

  memberValue = clampScore(memberValue)
  businessSustainability = clampScore(businessSustainability)
  exclusivity = clampScore(exclusivity)
  growthPotential = clampScore(growthPotential)

  const total = Math.round(
    ((memberValue +
      businessSustainability +
      exclusivity +
      growthPotential) /
      20) *
      100
  )

  let recommendation: OfferQualityScore['recommendation']

  if (total >= 85) {
    recommendation = 'Highly Recommended'
  } else if (total >= 70) {
    recommendation = 'Recommended'
  } else if (total >= 50) {
    recommendation = 'Needs Improvement'
  } else {
    recommendation = 'Not Recommended'
  }

  return {
    memberValue,
    businessSustainability,
    exclusivity,
    growthPotential,
    total,
    recommendation,
    feedback,
  }
}

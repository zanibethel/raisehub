/**
 * RaiseHub Offer Health Engine
 *
 * Scores offers using deterministic rules.
 */

export type OfferHealth = {
  score: number
  label: string
}

type OfferHealthInput = {
  hasDescription: boolean
  hasTerms: boolean
  hasImage: boolean
  redemptionCount: number
  reviewNeeded: boolean
}

export function calculateOfferHealth(
  input: OfferHealthInput
): OfferHealth {
  let score = 100

  if (!input.hasDescription) score -= 15

  if (!input.hasTerms) score -= 10

  if (!input.hasImage) score -= 10

  if (input.redemptionCount === 0) score -= 10

  if (input.reviewNeeded) score -= 15

  if (score >= 90)
    return { score, label: 'Excellent' }

  if (score >= 75)
    return { score, label: 'Good' }

  if (score >= 60)
    return { score, label: 'Needs Attention' }

  return {
    score,
    label: 'Poor',
  }
}
/**
 * RaiseHub Offer Health Engine
 *
 * Calculates offer quality using deterministic, explainable rules.
 * Unknown data is not treated as missing data.
 * No AI is required.
 */

// =============================================================================
// Types
// =============================================================================

export type OfferHealthLabel =
  | 'Excellent'
  | 'Good'
  | 'Needs Attention'
  | 'Poor'

export type OfferHealthTone =
  | 'green'
  | 'blue'
  | 'yellow'
  | 'red'

export type OfferHealthIssue = {
  id: string
  message: string
  deduction: number
}

export type OfferHealth = {
  score: number
  label: OfferHealthLabel
  tone: OfferHealthTone
  summary: string
  issues: OfferHealthIssue[]
  recommendations: string[]
}

export type OfferHealthInput = {
  hasTitle?: boolean | null
  hasDescription?: boolean | null
  hasTerms?: boolean | null
  hasImage?: boolean | null
  hasDiscount?: boolean | null
  redemptionCount?: number | null
  daysActive?: number | null
  reviewNeeded?: boolean | null
  isPaused?: boolean | null
  isExpired?: boolean | null
}

// =============================================================================
// Helpers
// =============================================================================

function clampScore(score: number) {
  return Math.max(0, Math.min(100, score))
}

function getHealthPresentation(score: number): {
  label: OfferHealthLabel
  tone: OfferHealthTone
  summary: string
} {
  if (score >= 90) {
    return {
      label: 'Excellent',
      tone: 'green',
      summary:
        'This offer is complete, active, and positioned to provide strong member value.',
    }
  }

  if (score >= 75) {
    return {
      label: 'Good',
      tone: 'blue',
      summary:
        'This offer is healthy, but a small improvement could make it stronger.',
    }
  }

  if (score >= 60) {
    return {
      label: 'Needs Attention',
      tone: 'yellow',
      summary:
        'This offer has clear opportunities to improve visibility or performance.',
    }
  }

  return {
    label: 'Poor',
    tone: 'red',
    summary:
      'This offer needs meaningful updates before it can perform at its best.',
  }
}

// =============================================================================
// Health calculation
// =============================================================================

export function calculateOfferHealth(
  input: OfferHealthInput
): OfferHealth {
  let score = 100

  const issues: OfferHealthIssue[] = []
  const recommendations: string[] = []

  function deduct(
    id: string,
    deduction: number,
    message: string,
    recommendation: string
  ) {
    score -= deduction

    issues.push({
      id,
      message,
      deduction,
    })

    recommendations.push(recommendation)
  }

  // Only evaluate fields when their value is actually known.

  if (input.hasTitle === false) {
    deduct(
      'missing-title',
      20,
      'The offer does not have a clear title.',
      'Add a short title that immediately explains the member benefit.'
    )
  }

  if (input.hasDescription === false) {
    deduct(
      'missing-description',
      15,
      'The offer does not include a useful description.',
      'Explain what members receive and why the offer is valuable.'
    )
  }

  if (input.hasDiscount === false) {
    deduct(
      'missing-benefit',
      15,
      'The member benefit is not clearly stated.',
      'State the exact discount, free item, upgrade, or exclusive benefit.'
    )
  }

  if (input.hasTerms === false) {
    deduct(
      'missing-terms',
      10,
      'The offer does not include redemption terms.',
      'Add simple terms so members and staff know how the offer works.'
    )
  }

  if (input.hasImage === false) {
    deduct(
      'missing-image',
      5,
      'The offer does not include supporting imagery.',
      'Add a business or offer image to improve trust and recognition.'
    )
  }

  if (input.isPaused === true) {
    deduct(
      'paused',
      20,
      'The offer is paused and unavailable to members.',
      'Resume the offer when the business is ready to honor it again.'
    )
  }

  if (input.isExpired === true) {
    deduct(
      'expired',
      30,
      'The offer has expired and is no longer available.',
      'Extend, duplicate, or archive the expired offer.'
    )
  }

  if (input.reviewNeeded === true) {
    deduct(
      'review-needed',
      15,
      'The offer has reached a rule-based review trigger.',
      'Review the offer value, terms, dates, and recent performance.'
    )
  }

  const redemptionCount = input.redemptionCount
  const daysActive = input.daysActive

  if (
    redemptionCount !== null &&
    redemptionCount !== undefined &&
    daysActive !== null &&
    daysActive !== undefined &&
    daysActive >= 30 &&
    redemptionCount === 0 &&
    input.isPaused !== true &&
    input.isExpired !== true
  ) {
    deduct(
      'no-redemptions',
      15,
      'The offer has been active for at least 30 days without a redemption.',
      'Improve the member value, wording, placement, or promotion of this offer.'
    )
  }

  const finalScore = clampScore(score)
  const presentation = getHealthPresentation(finalScore)

  return {
    score: finalScore,
    label: presentation.label,
    tone: presentation.tone,
    summary: presentation.summary,
    issues,
    recommendations,
  }
}
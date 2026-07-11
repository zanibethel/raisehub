/**
 * RaiseHub Offer Review Engine
 *
 * Review reminders are intentionally separate from expiration.
 * Businesses should review offers because performance changed,
 * not simply because time passed.
 */

export type OfferDuration =
  | 'ongoing'
  | 'one-year'
  | 'seasonal'
  | 'custom'

export type ReviewRecommendation = {
  shouldReview: boolean
  priority: 'low' | 'medium' | 'high'
  title: string
  description: string
  recommendedAction: string
}

export type ReviewInput = {
  duration: OfferDuration
  createdAt: string
  lastReviewedAt?: string | null
  redemptionCount: number
  daysSinceLastRedemption?: number
}

const DAY = 1000 * 60 * 60 * 24

function daysBetween(a: Date, b: Date) {
  return Math.floor(
    (a.getTime() - b.getTime()) / DAY
  )
}

export function getOfferReviewRecommendation(
  input: ReviewInput
): ReviewRecommendation {
  const today = new Date()

  const reviewDate = input.lastReviewedAt
    ? new Date(input.lastReviewedAt)
    : new Date(input.createdAt)

  const days = daysBetween(today, reviewDate)

  if (input.daysSinceLastRedemption !== undefined &&
      input.daysSinceLastRedemption > 60) {
    return {
      shouldReview: true,
      priority: 'high',
      title: 'No recent redemptions',
      description:
        'This offer has not been redeemed recently and should be evaluated.',
      recommendedAction: 'Review Offer',
    }
  }

  if (days >= 365) {
    return {
      shouldReview: true,
      priority: 'medium',
      title: 'Annual review recommended',
      description:
        'Review this long-running offer to keep it fresh.',
      recommendedAction: 'Review Offer',
    }
  }

  if (
    input.duration === 'seasonal' &&
    days >= 90
  ) {
    return {
      shouldReview: true,
      priority: 'medium',
      title: 'Seasonal review',
      description:
        'Seasonal offers should be reviewed before the next season.',
      recommendedAction: 'Review Offer',
    }
  }

  if (
    input.redemptionCount === 0 &&
    days >= 30
  ) {
    return {
      shouldReview: true,
      priority: 'high',
      title: 'No redemptions yet',
      description:
        'Consider improving the value or visibility of this offer.',
      recommendedAction: 'Improve Offer',
    }
  }

  return {
    shouldReview: false,
    priority: 'low',
    title: 'No review needed',
    description:
      'This offer appears healthy based on current rules.',
    recommendedAction: '',
  }
}
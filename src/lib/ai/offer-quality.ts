// =============================================================================
// RaiseHub Offer Quality Standard
// =============================================================================

export const OFFER_QUALITY_STANDARD = {
  minimumRecommendedScore: 70,
  minimumMemberValueScore: 3,
  minimumExclusivityScore: 3,

  weakOfferPatterns: [
    '5% off',
    '10% off',
    '$1 off',
    '$2 off',
    '$3 off',
    'small discount',
    'generic discount',
  ],

  preferredOfferSignals: [
    'buy one get one',
    'bogo',
    'free upgrade',
    'free add-on',
    'free side',
    'free treatment',
    'bundle',
    'vip',
    'members only',
    'exclusive',
    'limited time',
    'complimentary',
  ],
} as const

export type OfferQualityInput = {
  title: string
  discount: string
  description: string
  estimatedRetailValue?: number
  estimatedBusinessCost?: number
  isExclusive?: boolean
  requiresPurchase?: boolean
}

export type OfferQualityScore = {
  memberValue: number
  businessSustainability: number
  exclusivity: number
  growthPotential: number
  total: number
  recommendation:
    | 'Highly Recommended'
    | 'Recommended'
    | 'Needs Improvement'
    | 'Not Recommended'
  feedback: string[]
}

export function normalizeOfferText(input: OfferQualityInput) {
  return [
    input.title,
    input.discount,
    input.description,
  ]
    .join(' ')
    .trim()
    .toLowerCase()
}

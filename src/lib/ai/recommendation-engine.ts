import type { OfferGoal } from '@/app/dashboard/offers/new/components/goal-step'
import { getBusinessStrategy } from './business-strategies'
import { scoreOffer } from './scoring'

export type RecommendedOffer = {
  id: string
  title: string
  discount: string
  description: string
  finePrint: string
  estimatedRetailValue: number
  estimatedBusinessCost: number
  requiresPurchase: boolean
  isExclusive: true
  coachNote: string
  score: ReturnType<typeof scoreOffer>
}

type RecommendationInput = {
  businessCategory: string
  goal: OfferGoal
}

export function buildRecommendedOffers({
  businessCategory,
  goal,
}: RecommendationInput): RecommendedOffer[] {
  const strategy = getBusinessStrategy(businessCategory)

  const ideas = strategy.highPerceivedValueIdeas.slice(0, 3)

  return ideas.map((idea, index) => {
    const estimatedRetailValue = 8 + index * 3
    const estimatedBusinessCost = 2 + index
    const requiresPurchase = true

    const offer = {
      id: `${businessCategory}-${goal}-${index}`,
      title: idea,
      discount: idea,
      description:
        `${idea}. This offer is available exclusively through RaiseHub and is designed to support ${formatGoal(
          goal
        )}.`,
      finePrint:
        'RaiseHub members only. One redemption per member. Qualifying purchase may be required. Cannot be combined with other promotions.',
      estimatedRetailValue,
      estimatedBusinessCost,
      requiresPurchase,
      isExclusive: true as const,
      coachNote:
        strategy.businessProtectionNotes[index] ??
        strategy.businessProtectionNotes[0],
    }

    return {
      ...offer,
      score: scoreOffer(offer),
    }
  })
}

function formatGoal(goal: OfferGoal) {
  const labels: Record<OfferGoal, string> = {
    'new-customers': 'new customer growth',
    'repeat-customers': 'repeat visits',
    'slow-day': 'slow-day traffic',
    'new-product': 'product or service promotion',
    'average-purchase': 'larger customer purchases',
    appointments: 'appointment demand',
    'event-traffic': 'event and location traffic',
  }

  return labels[goal]
}

import type { OfferGoal } from '@/app/dashboard/offers/new/components/goal-step'
import { getBusinessOfferTemplates } from './business-offer-templates'
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

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function buildRecommendedOffers({
  businessCategory,
  goal,
}: RecommendationInput): RecommendedOffer[] {
  const templates = getBusinessOfferTemplates(businessCategory)
  const matching = templates.filter((template) => template.goals.includes(goal))
  const fallback = templates.filter((template) => !template.goals.includes(goal))
  const selected = [...matching, ...fallback].slice(0, 3)

  return selected.map((template) => {
    const offer = {
      id: `${slugify(businessCategory || 'other')}-${goal}-${slugify(template.title)}`,
      title: template.title,
      discount: template.memberBenefit,
      description: `${template.description} This recommendation is tuned for ${formatGoal(goal)}.`,
      finePrint: template.finePrint,
      estimatedRetailValue: template.estimatedRetailValue,
      estimatedBusinessCost: template.estimatedBusinessCost,
      requiresPurchase: template.requiresPurchase,
      isExclusive: true as const,
      coachNote: template.coachNote,
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

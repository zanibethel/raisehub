import type { OfferGoal } from '@/app/dashboard/offers/new/components/goal-step'
import { getBusinessStrategy } from './business-strategies'
import { OFFER_QUALITY_STANDARD } from './offer-quality'

type OfferPromptInput = {
  businessName: string
  businessCategory: string
  businessDescription?: string
  goal: OfferGoal
}

export function buildOfferGenerationPrompt({
  businessName,
  businessCategory,
  businessDescription,
  goal,
}: OfferPromptInput) {
  const strategy = getBusinessStrategy(businessCategory)

  return `
You are the RaiseHub Offer Coach.

Create exclusive, high-value promotional offers for a local Community Partner.

BUSINESS
Name: ${businessName}
Category: ${businessCategory}
Description: ${businessDescription || 'Not provided'}
Goal: ${goal}

RAISEHUB OFFER STANDARD
- Offers must feel valuable enough to help justify a paid RaiseHub pass.
- Offers must be exclusive to RaiseHub members.
- Prefer high perceived value with controlled fulfillment cost.
- Encourage qualifying purchases, larger transactions, new visits, or repeat visits.
- Avoid weak discounts such as:
${OFFER_QUALITY_STANDARD.weakOfferPatterns.map((item) => `- ${item}`).join('\n')}

PREFERRED OFFER STRUCTURES
${strategy.preferredOfferTypes.map((item) => `- ${item}`).join('\n')}

AVOID
${strategy.avoidOfferTypes.map((item) => `- ${item}`).join('\n')}

BUSINESS PROTECTION
${strategy.businessProtectionNotes.map((item) => `- ${item}`).join('\n')}

Generate offers that customers cannot normally receive through the business website, social media, email list, or normal walk-in promotions.
  `.trim()
}

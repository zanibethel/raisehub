export type EventPromotionFundingSource =
  | 'partner_points'
  | 'paid'
  | 'demo_paid'

export type EventPromotionStripeMode =
  | 'demo'
  | 'unconfigured'
  | 'test'
  | 'live-disabled'
  | 'live'

export type EventPromotionPriceOption = {
  durationDays: number
  priceCents: number
  isDefault: boolean
}

export type EventPromotionHistoryItem = {
  id: string
  source: EventPromotionFundingSource
  startsAt: string
  endsAt: string
  createdAt: string
}

export type EventPromotionPurchaseHistoryItem = {
  id: string
  durationDays: number
  amountCents: number
  currency: string
  status:
    | 'created'
    | 'open'
    | 'paid'
    | 'simulated'
    | 'failed'
    | 'canceled'
    | 'expired'
  createdAt: string
  fulfilledAt: string | null
}

export type EventPromotionEventState = {
  paidEnabled: boolean
  partnerPointsEnabled: boolean
  partnerPointCost: number
  partnerPointDurationDays: number
  defaultPaidDurationDays: number | null
  supporterSpotlightEnabled: boolean
  localEventsFeaturedEnabled: boolean
  priceOptions: EventPromotionPriceOption[]
  stripeMode: EventPromotionStripeMode
  activePromotion: EventPromotionHistoryItem | null
  promotionHistory: EventPromotionHistoryItem[]
  purchaseHistory: EventPromotionPurchaseHistoryItem[]
}

export type StartPaidEventPromotionResult =
  | { status: 'checkout-ready'; url: string }
  | { status: 'demo-complete'; message: string }
  | { status: 'error'; message: string }

export type RedeemEventPromotionResult =
  | { success: true; message: string }
  | { success: false; error: string }

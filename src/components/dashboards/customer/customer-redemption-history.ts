import type {
  CustomerDashboardOffer,
} from '@/types/customer-dashboard'

export type CustomerRedemptionEvent = {
  id: string
  offer_id: string
  created_at: string
  status: string | null
  offer_title_snapshot?: string | null
  benefit_snapshot?: string | null
  customer_value_snapshot?: number | string | null
  usage_rule_snapshot?: string | null
  confirmation_method?: string | null
}

export type CustomerRedemptionHistoryItem = {
  redemption: CustomerRedemptionEvent
  offer: CustomerDashboardOffer | null
  redeemedAt: string
  redemptionTimestamp: number
}

type GetCustomerRedemptionHistoryOptions = {
  offers: CustomerDashboardOffer[]
  redemptions: CustomerRedemptionEvent[]
}

export function getCustomerRedemptionTimestamp(
  value: string
): number | null {
  const timestamp = new Date(value).getTime()

  return Number.isNaN(timestamp)
    ? null
    : timestamp
}

export function formatCustomerRedemptionDate(
  value: string,
  locale?: string
): string {
  const timestamp = getCustomerRedemptionTimestamp(value)

  if (timestamp === null) {
    return 'Date unavailable'
  }

  return new Date(timestamp).toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function formatCustomerRedemptionTime(
  value: string,
  locale?: string
): string | null {
  const timestamp = getCustomerRedemptionTimestamp(value)

  if (timestamp === null) {
    return null
  }

  return new Date(timestamp).toLocaleTimeString(locale, {
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function getCustomerRedemptionHistory({
  offers,
  redemptions,
}: GetCustomerRedemptionHistoryOptions): CustomerRedemptionHistoryItem[] {
  const offerById = new Map(offers.map((offer) => [offer.id, offer]))

  return redemptions
    .map((redemption) => {
      const redemptionTimestamp = getCustomerRedemptionTimestamp(
        redemption.created_at
      )

      if (redemptionTimestamp === null) {
        return null
      }

      return {
        redemption,
        offer: offerById.get(redemption.offer_id) ?? null,
        redeemedAt: redemption.created_at,
        redemptionTimestamp,
      }
    })
    .filter(
      (item): item is CustomerRedemptionHistoryItem => item !== null
    )
    .sort(
      (firstRedemption, secondRedemption) =>
        secondRedemption.redemptionTimestamp -
        firstRedemption.redemptionTimestamp ||
        getCustomerRedemptionBusinessName(firstRedemption.offer).localeCompare(
          getCustomerRedemptionBusinessName(secondRedemption.offer)
        ) ||
        getCustomerRedemptionOfferTitle(
          firstRedemption.offer,
          firstRedemption.redemption
        ).localeCompare(
          getCustomerRedemptionOfferTitle(
            secondRedemption.offer,
            secondRedemption.redemption
          )
        )
    )
}

export function getCustomerRedemptionBusinessName(
  offer: CustomerDashboardOffer | null
): string {
  return (
    offer?.business_name?.trim() ||
    offer?.google_business_name?.trim() ||
    'Local Business'
  )
}

export function getCustomerRedemptionOfferTitle(
  offer: CustomerDashboardOffer | null,
  redemption?: CustomerRedemptionEvent
): string {
  return (
    redemption?.offer_title_snapshot?.trim() ||
    offer?.title?.trim() ||
    'Local offer'
  )
}

export function getCustomerRedemptionBenefitLabel(
  offer: CustomerDashboardOffer | null,
  redemption?: CustomerRedemptionEvent
): string {
  return (
    redemption?.benefit_snapshot?.trim() ||
    offer?.discount?.trim() ||
    'RaiseHub member benefit'
  )
}

export function getCustomerRedemptionMapUrl(
  offer: CustomerDashboardOffer | null
): string | null {
  const googleMapsUrl = offer?.google_maps_url?.trim()

  if (googleMapsUrl) {
    return googleMapsUrl.startsWith('http')
      ? googleMapsUrl
      : `https://${googleMapsUrl}`
  }

  const address = offer?.address?.trim()

  if (!address) {
    return null
  }

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    address
  )}`
}

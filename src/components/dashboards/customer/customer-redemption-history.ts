import type {
  CustomerDashboardOffer,
} from '@/types/customer-dashboard'

// =============================================================================
// Types
// =============================================================================

export type CustomerRedemptionHistoryItem = {
  offer: CustomerDashboardOffer
  redeemedAt: string
  redemptionTimestamp: number
}

type GetCustomerRedemptionHistoryOptions = {
  offers: CustomerDashboardOffer[]
  redemptionDateByOfferId: Map<
    string,
    string
  >
}

// =============================================================================
// Date helpers
// =============================================================================

export function getCustomerRedemptionTimestamp(
  value: string
): number | null {
  const timestamp =
    new Date(value).getTime()

  return Number.isNaN(timestamp)
    ? null
    : timestamp
}

export function formatCustomerRedemptionDate(
  value: string,
  locale?: string
): string {
  const timestamp =
    getCustomerRedemptionTimestamp(
      value
    )

  if (timestamp === null) {
    return 'Date unavailable'
  }

  return new Date(
    timestamp
  ).toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function formatCustomerRedemptionTime(
  value: string,
  locale?: string
): string | null {
  const timestamp =
    getCustomerRedemptionTimestamp(
      value
    )

  if (timestamp === null) {
    return null
  }

  return new Date(
    timestamp
  ).toLocaleTimeString(locale, {
    hour: 'numeric',
    minute: '2-digit',
  })
}

// =============================================================================
// History construction
// =============================================================================

export function getCustomerRedemptionHistory({
  offers,
  redemptionDateByOfferId,
}: GetCustomerRedemptionHistoryOptions):
  CustomerRedemptionHistoryItem[] {
  const history:
    CustomerRedemptionHistoryItem[] = []

  for (const offer of offers) {
    const redeemedAt =
      redemptionDateByOfferId.get(
        offer.id
      )

    if (!redeemedAt) {
      continue
    }

    const redemptionTimestamp =
      getCustomerRedemptionTimestamp(
        redeemedAt
      )

    if (redemptionTimestamp === null) {
      continue
    }

    history.push({
      offer,
      redeemedAt,
      redemptionTimestamp,
    })
  }

  return history.sort(
    (
      firstRedemption,
      secondRedemption
    ) =>
      secondRedemption.redemptionTimestamp -
      firstRedemption.redemptionTimestamp ||
      getCustomerRedemptionBusinessName(
        firstRedemption.offer
      ).localeCompare(
        getCustomerRedemptionBusinessName(
          secondRedemption.offer
        )
      ) ||
      getCustomerRedemptionOfferTitle(
        firstRedemption.offer
      ).localeCompare(
        getCustomerRedemptionOfferTitle(
          secondRedemption.offer
        )
      )
  )
}

// =============================================================================
// Display helpers
// =============================================================================

export function getCustomerRedemptionBusinessName(
  offer: CustomerDashboardOffer
): string {
  return (
    offer.business_name?.trim() ||
    offer.google_business_name?.trim() ||
    'Local Business'
  )
}

export function getCustomerRedemptionOfferTitle(
  offer: CustomerDashboardOffer
): string {
  return (
    offer.title?.trim() ||
    'Local offer'
  )
}

export function getCustomerRedemptionBenefitLabel(
  offer: CustomerDashboardOffer
): string {
  return (
    offer.discount?.trim() ||
    'RaiseHub member benefit'
  )
}

export function getCustomerRedemptionMapUrl(
  offer: CustomerDashboardOffer
): string | null {
  const googleMapsUrl =
    offer.google_maps_url?.trim()

  if (googleMapsUrl) {
    return googleMapsUrl.startsWith(
      'http'
    )
      ? googleMapsUrl
      : `https://${googleMapsUrl}`
  }

  const address =
    offer.address?.trim()

  if (!address) {
    return null
  }

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    address
  )}`
}
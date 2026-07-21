import type {
  CustomerDashboardOffer,
} from '@/types/customer-dashboard'

// =============================================================================
// Types
// =============================================================================

type GetCustomerSavedDealsOptions = {
  offers: CustomerDashboardOffer[]
  savedOfferIds: Set<string>
  redeemedOfferIds: Set<string>
}

export type CustomerSavedDeal = {
  offer: CustomerDashboardOffer
  isRedeemed: boolean
}

// =============================================================================
// Date helpers
// =============================================================================

function getDateTimestamp(
  value: string | null | undefined
): number | null {
  if (!value) {
    return null
  }

  const timestamp =
    new Date(value).getTime()

  return Number.isNaN(timestamp)
    ? null
    : timestamp
}

export function formatCustomerSavedDealRedemptionDate(
  value: string | undefined,
  locale?: string
): string {
  const timestamp =
    getDateTimestamp(value)

  if (timestamp === null) {
    return 'Date unavailable'
  }

  return new Date(
    timestamp
  ).toLocaleString(locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function formatCustomerSavedDealEndDate(
  value: string | null | undefined,
  locale?: string
): string {
  if (!value) {
    return 'No listed end date'
  }

  const timestamp =
    getDateTimestamp(value)

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

// =============================================================================
// Display helpers
// =============================================================================

export function getCustomerSavedDealTitle(
  offer: CustomerDashboardOffer
): string {
  return (
    offer.title?.trim() ||
    'Local offer'
  )
}

export function getCustomerSavedDealBusinessName(
  offer: CustomerDashboardOffer
): string {
  return (
    offer.business_name?.trim() ||
    offer.google_business_name?.trim() ||
    'Local Business'
  )
}

export function getCustomerSavedDealBenefitLabel(
  offer: CustomerDashboardOffer
): string {
  return (
    offer.discount?.trim() ||
    'Member benefit available'
  )
}

export function getCustomerSavedDealDescription(
  offer: CustomerDashboardOffer
): string {
  return (
    offer.description?.trim() ||
    'Offer details are available through your RaiseHub Pass.'
  )
}

export function getCustomerSavedDealPhone(
  offer: CustomerDashboardOffer
): string | null {
  return (
    offer.phone?.trim() ||
    null
  )
}

export function getCustomerSavedDealAddress(
  offer: CustomerDashboardOffer
): string | null {
  return (
    offer.address?.trim() ||
    null
  )
}

export function getCustomerSavedDealMapUrl(
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
    getCustomerSavedDealAddress(
      offer
    )

  if (!address) {
    return null
  }

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    address
  )}`
}

// =============================================================================
// Saved-deal construction
// =============================================================================

export function getCustomerSavedDeals({
  offers,
  savedOfferIds,
  redeemedOfferIds,
}: GetCustomerSavedDealsOptions):
  CustomerSavedDeal[] {
  return offers
    .filter((offer) =>
      savedOfferIds.has(offer.id)
    )
    .map((offer) => ({
      offer,
      isRedeemed:
        redeemedOfferIds.has(
          offer.id
        ),
    }))
    .sort(
      (
        firstDeal,
        secondDeal
      ) => {
        if (
          firstDeal.isRedeemed !==
          secondDeal.isRedeemed
        ) {
          return firstDeal.isRedeemed
            ? 1
            : -1
        }

        const firstEndTimestamp =
          getDateTimestamp(
            firstDeal.offer.ends_at
          )

        const secondEndTimestamp =
          getDateTimestamp(
            secondDeal.offer.ends_at
          )

        if (
          firstEndTimestamp !== null ||
          secondEndTimestamp !== null
        ) {
          if (
            firstEndTimestamp === null
          ) {
            return 1
          }

          if (
            secondEndTimestamp === null
          ) {
            return -1
          }

          if (
            firstEndTimestamp !==
            secondEndTimestamp
          ) {
            return (
              firstEndTimestamp -
              secondEndTimestamp
            )
          }
        }

        return (
          getCustomerSavedDealBusinessName(
            firstDeal.offer
          ).localeCompare(
            getCustomerSavedDealBusinessName(
              secondDeal.offer
            )
          ) ||
          getCustomerSavedDealTitle(
            firstDeal.offer
          ).localeCompare(
            getCustomerSavedDealTitle(
              secondDeal.offer
            )
          )
        )
      }
    )
}
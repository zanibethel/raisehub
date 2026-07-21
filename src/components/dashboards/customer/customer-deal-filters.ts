import type {
  CustomerDashboardOffer,
} from '@/types/customer-dashboard'

// =============================================================================
// Types
// =============================================================================

export type CustomerDealFilter =
  | 'nearby'
  | 'saved'
  | 'expiring'
  | 'all'

export type CustomerDealFilterOption = {
  id: CustomerDealFilter
  label: string
  description: string
  icon: string
}

type FilterCustomerDealsOptions = {
  offers: CustomerDashboardOffer[]
  filter: CustomerDealFilter
  savedOfferIds: Set<string>
  now?: Date
  expiringSoonDays?: number
}

// =============================================================================
// Constants
// =============================================================================

export const CUSTOMER_DEAL_FILTER_OPTIONS:
  CustomerDealFilterOption[] = [
    {
      id: 'nearby',
      label: 'Nearby Offers',
      description:
        'Show location-ready businesses, with highly rated options first.',
      icon: '📍',
    },
    {
      id: 'saved',
      label: 'My Pass',
      description:
        'Show offers saved for quick access.',
      icon: '🎟️',
    },
    {
      id: 'expiring',
      label: 'Expiring Soon',
      description:
        'Show the most urgent offers ending within the next 14 days.',
      icon: '⏳',
    },
    {
      id: 'all',
      label: 'Available Offers',
      description:
        'Show every active local offer.',
      icon: '🏷️',
    },
  ]

export const DEFAULT_CUSTOMER_DEAL_FILTER:
  CustomerDealFilter = 'all'

export const CUSTOMER_EXPIRING_SOON_DAYS = 14

// =============================================================================
// Validation
// =============================================================================

export function isCustomerDealFilter(
  value: string
): value is CustomerDealFilter {
  return (
    value === 'nearby' ||
    value === 'saved' ||
    value === 'expiring' ||
    value === 'all'
  )
}

// =============================================================================
// Offer-state helpers
// =============================================================================

export function hasCustomerOfferLocation(
  offer: CustomerDashboardOffer
): boolean {
  const hasCoordinates =
    typeof offer.business_latitude ===
      'number' &&
    typeof offer.business_longitude ===
      'number'

  const hasAddress =
    Boolean(offer.address?.trim())

  const hasGoogleLocation =
    Boolean(
      offer.google_maps_url?.trim() ||
        offer.google_place_id?.trim()
    )

  return (
    hasCoordinates ||
    hasAddress ||
    hasGoogleLocation
  )
}

export function isCustomerOfferExpiringSoon(
  offer: CustomerDashboardOffer,
  now: Date = new Date(),
  days: number =
    CUSTOMER_EXPIRING_SOON_DAYS
): boolean {
  if (!offer.ends_at) {
    return false
  }

  const expirationDate =
    new Date(offer.ends_at)

  if (
    Number.isNaN(
      expirationDate.getTime()
    )
  ) {
    return false
  }

  const expirationWindow =
    new Date(now)

  expirationWindow.setDate(
    expirationWindow.getDate() +
      days
  )

  return (
    expirationDate >= now &&
    expirationDate <=
      expirationWindow
  )
}

// =============================================================================
// Sorting helpers
// =============================================================================

function getOfferExpirationTimestamp(
  offer: CustomerDashboardOffer
): number {
  if (!offer.ends_at) {
    return Number.MAX_SAFE_INTEGER
  }

  const timestamp =
    new Date(offer.ends_at).getTime()

  return Number.isNaN(timestamp)
    ? Number.MAX_SAFE_INTEGER
    : timestamp
}

function getOfferRating(
  offer: CustomerDashboardOffer
): number {
  if (
    offer.google_rating === null ||
    offer.google_rating === undefined
  ) {
    return 0
  }

  const rating = Number(
    offer.google_rating
  )

  return Number.isFinite(rating)
    ? rating
    : 0
}

function getBusinessSortName(
  offer: CustomerDashboardOffer
): string {
  return (
    offer.business_name ||
    offer.title ||
    ''
  ).trim()
}

function sortExpiringOffers(
  offers: CustomerDashboardOffer[]
): CustomerDashboardOffer[] {
  return [...offers].sort(
    (firstOffer, secondOffer) =>
      getOfferExpirationTimestamp(
        firstOffer
      ) -
        getOfferExpirationTimestamp(
          secondOffer
        ) ||
      getBusinessSortName(
        firstOffer
      ).localeCompare(
        getBusinessSortName(
          secondOffer
        )
      )
  )
}

function sortNearbyOffers(
  offers: CustomerDashboardOffer[]
): CustomerDashboardOffer[] {
  return [...offers].sort(
    (firstOffer, secondOffer) =>
      getOfferRating(secondOffer) -
        getOfferRating(firstOffer) ||
      getBusinessSortName(
        firstOffer
      ).localeCompare(
        getBusinessSortName(
          secondOffer
        )
      )
  )
}

// =============================================================================
// Counts
// =============================================================================

export function getCustomerDealFilterCount({
  offers,
  filter,
  savedOfferIds,
  now = new Date(),
  expiringSoonDays =
    CUSTOMER_EXPIRING_SOON_DAYS,
}: FilterCustomerDealsOptions): number {
  return filterCustomerDeals({
    offers,
    filter,
    savedOfferIds,
    now,
    expiringSoonDays,
  }).length
}

export function getCustomerDealFilterCounts({
  offers,
  savedOfferIds,
  now = new Date(),
  expiringSoonDays =
    CUSTOMER_EXPIRING_SOON_DAYS,
}: Omit<
  FilterCustomerDealsOptions,
  'filter'
>): Record<CustomerDealFilter, number> {
  return {
    nearby: getCustomerDealFilterCount({
      offers,
      filter: 'nearby',
      savedOfferIds,
      now,
      expiringSoonDays,
    }),
    saved: getCustomerDealFilterCount({
      offers,
      filter: 'saved',
      savedOfferIds,
      now,
      expiringSoonDays,
    }),
    expiring:
      getCustomerDealFilterCount({
        offers,
        filter: 'expiring',
        savedOfferIds,
        now,
        expiringSoonDays,
      }),
    all: offers.length,
  }
}

// =============================================================================
// Filtering
// =============================================================================

export function filterCustomerDeals({
  offers,
  filter,
  savedOfferIds,
  now = new Date(),
  expiringSoonDays =
    CUSTOMER_EXPIRING_SOON_DAYS,
}: FilterCustomerDealsOptions):
  CustomerDashboardOffer[] {
  switch (filter) {
    case 'nearby': {
      const nearbyOffers =
        offers.filter(
          hasCustomerOfferLocation
        )

      return sortNearbyOffers(
        nearbyOffers
      )
    }

    case 'saved':
      return offers.filter((offer) =>
        savedOfferIds.has(offer.id)
      )

    case 'expiring': {
      const expiringOffers =
        offers.filter((offer) =>
          isCustomerOfferExpiringSoon(
            offer,
            now,
            expiringSoonDays
          )
        )

      return sortExpiringOffers(
        expiringOffers
      )
    }

    case 'all':
      return offers
  }
}

// =============================================================================
// Labels
// =============================================================================

export function getCustomerDealFilterLabel(
  filter: CustomerDealFilter
): string {
  return (
    CUSTOMER_DEAL_FILTER_OPTIONS.find(
      (option) =>
        option.id === filter
    )?.label ?? 'Available Offers'
  )
}

export function getCustomerDealEmptyMessage(
  filter: CustomerDealFilter
): {
  title: string
  description: string
} {
  switch (filter) {
    case 'nearby':
      return {
        title:
          'No location-ready offers found',
        description:
          'Participating businesses have not added enough location information for nearby discovery yet.',
      }

    case 'saved':
      return {
        title: 'No saved offers yet',
        description:
          'Save offers you plan to use and they will appear in My Pass.',
      }

    case 'expiring':
      return {
        title:
          'No offers are expiring soon',
        description:
          'None of the available offers end within the next 14 days.',
      }

    case 'all':
      return {
        title:
          'No offers are available',
        description:
          'New offers will appear here as participating businesses publish them.',
      }
  }
}
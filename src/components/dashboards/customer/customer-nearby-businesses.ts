import type {
  CustomerDashboardOffer,
} from '@/types/customer-dashboard'

// =============================================================================
// Types
// =============================================================================

export type CustomerNearbyBusiness = {
  id: string
  name: string
  category: string | null
  address: string | null
  phone: string | null
  googleMapsUrl: string | null
  websiteUrl: string | null
  rating: number | null
  reviewCount: number | null
  latitude: number | null
  longitude: number | null
  offerCount: number
  offerIds: string[]
}

type NearbyBusinessAccumulator = {
  business: CustomerNearbyBusiness
  offerIds: Set<string>
}

// =============================================================================
// Normalization helpers
// =============================================================================

function normalizeText(
  value: string | null | undefined
): string | null {
  const normalizedValue =
    value?.trim()

  return normalizedValue
    ? normalizedValue
    : null
}

function normalizeNumber(
  value: number | null | undefined
): number | null {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value)
  ) {
    return null
  }

  return value
}

function normalizeRating(
  value: number | null | undefined
): number | null {
  const rating =
    normalizeNumber(value)

  if (
    rating === null ||
    rating < 0 ||
    rating > 5
  ) {
    return null
  }

  return rating
}

function normalizeReviewCount(
  value: number | null | undefined
): number | null {
  const reviewCount =
    normalizeNumber(value)

  if (
    reviewCount === null ||
    reviewCount < 0
  ) {
    return null
  }

  return Math.floor(reviewCount)
}

// =============================================================================
// Business identity
// =============================================================================

function getNearbyBusinessId(
  offer: CustomerDashboardOffer
): string {
  const placeId =
    normalizeText(
      offer.google_place_id
    )

  if (placeId) {
    return `place:${placeId}`
  }

  const coordinates =
    normalizeNumber(
      offer.business_latitude
    ) !== null &&
    normalizeNumber(
      offer.business_longitude
    ) !== null
      ? `${offer.business_latitude},${offer.business_longitude}`
      : null

  if (coordinates) {
    return `coordinates:${coordinates}`
  }

  const address =
    normalizeText(offer.address)

  if (address) {
    return `address:${address.toLowerCase()}`
  }

  const businessName =
    normalizeText(
      offer.business_name
    ) ??
    normalizeText(
      offer.google_business_name
    ) ??
    'local-business'

  return `business:${businessName.toLowerCase()}`
}

// =============================================================================
// Location validation
// =============================================================================

export function hasNearbyBusinessLocation(
  offer: CustomerDashboardOffer
): boolean {
  const hasCoordinates =
    normalizeNumber(
      offer.business_latitude
    ) !== null &&
    normalizeNumber(
      offer.business_longitude
    ) !== null

  const hasAddress =
    normalizeText(offer.address) !==
    null

  const hasGoogleLocation =
    normalizeText(
      offer.google_maps_url
    ) !== null ||
    normalizeText(
      offer.google_place_id
    ) !== null

  return (
    hasCoordinates ||
    hasAddress ||
    hasGoogleLocation
  )
}

// =============================================================================
// Business conversion
// =============================================================================

function createNearbyBusiness(
  offer: CustomerDashboardOffer
): CustomerNearbyBusiness {
  const name =
    normalizeText(
      offer.business_name
    ) ??
    normalizeText(
      offer.google_business_name
    ) ??
    'Local Business'

  return {
    id: getNearbyBusinessId(offer),
    name,
    category:
      normalizeText(
        offer.google_primary_category
      ),
    address:
      normalizeText(offer.address),
    phone:
      normalizeText(offer.phone),
    googleMapsUrl:
      normalizeText(
        offer.google_maps_url
      ),
    websiteUrl:
      normalizeText(
        offer.google_website_url
      ),
    rating:
      normalizeRating(
        offer.google_rating
      ),
    reviewCount:
      normalizeReviewCount(
        offer.google_review_count
      ),
    latitude:
      normalizeNumber(
        offer.business_latitude
      ),
    longitude:
      normalizeNumber(
        offer.business_longitude
      ),
    offerCount: 1,
    offerIds: [offer.id],
  }
}

// =============================================================================
// Sorting
// =============================================================================

function getSortableRating(
  business: CustomerNearbyBusiness
): number {
  return business.rating ?? 0
}

function getSortableReviewCount(
  business: CustomerNearbyBusiness
): number {
  return business.reviewCount ?? 0
}

function sortNearbyBusinesses(
  businesses:
    CustomerNearbyBusiness[]
): CustomerNearbyBusiness[] {
  return [...businesses].sort(
    (
      firstBusiness,
      secondBusiness
    ) =>
      getSortableRating(
        secondBusiness
      ) -
        getSortableRating(
          firstBusiness
        ) ||
      getSortableReviewCount(
        secondBusiness
      ) -
        getSortableReviewCount(
          firstBusiness
        ) ||
      secondBusiness.offerCount -
        firstBusiness.offerCount ||
      firstBusiness.name.localeCompare(
        secondBusiness.name
      )
  )
}

// =============================================================================
// Public grouping helper
// =============================================================================

export function getCustomerNearbyBusinesses(
  offers: CustomerDashboardOffer[]
): CustomerNearbyBusiness[] {
  const businessById =
    new Map<
      string,
      NearbyBusinessAccumulator
    >()

  for (const offer of offers) {
    if (
      !hasNearbyBusinessLocation(
        offer
      )
    ) {
      continue
    }

    const businessId =
      getNearbyBusinessId(offer)

    const existingBusiness =
      businessById.get(businessId)

    if (existingBusiness) {
      existingBusiness.offerIds.add(
        offer.id
      )

      existingBusiness.business.offerCount =
        existingBusiness.offerIds.size

      existingBusiness.business.offerIds =
        [
          ...existingBusiness.offerIds,
        ]

      continue
    }

    const business =
      createNearbyBusiness(offer)

    businessById.set(
      businessId,
      {
        business,
        offerIds:
          new Set([offer.id]),
      }
    )
  }

  return sortNearbyBusinesses(
    [...businessById.values()].map(
      ({ business, offerIds }) => ({
        ...business,
        offerCount: offerIds.size,
        offerIds: [...offerIds],
      })
    )
  )
}
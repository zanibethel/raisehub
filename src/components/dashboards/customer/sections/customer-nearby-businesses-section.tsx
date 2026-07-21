import Link from 'next/link'

import {
  getCustomerNearbyBusinesses,
} from '../customer-nearby-businesses'

import type {
  CustomerDashboardOffer,
} from '@/types/customer-dashboard'

// =============================================================================
// Types
// =============================================================================

type Props = {
  enrichedOffers:
    CustomerDashboardOffer[]
  hasActivePass: boolean
}

// =============================================================================
// Display helpers
// =============================================================================

function formatRating({
  rating,
  reviewCount,
}: {
  rating: number | null
  reviewCount: number | null
}): string | null {
  if (rating === null) {
    return null
  }

  if (
    reviewCount === null ||
    reviewCount === 0
  ) {
    return `${rating.toFixed(1)} rating`
  }

  return `${rating.toFixed(
    1
  )} rating · ${reviewCount.toLocaleString()} ${
    reviewCount === 1
      ? 'review'
      : 'reviews'
  }`
}

function getMapUrl({
  googleMapsUrl,
  address,
}: {
  googleMapsUrl: string | null
  address: string | null
}): string | null {
  if (googleMapsUrl) {
    return googleMapsUrl
  }

  if (!address) {
    return null
  }

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    address
  )}`
}

// =============================================================================
// Component
// =============================================================================

export default function CustomerNearbyBusinessesSection({
  enrichedOffers,
  hasActivePass,
}: Props) {
  const nearbyBusinesses =
    getCustomerNearbyBusinesses(
      enrichedOffers
    )

  return (
    <section
      aria-labelledby="customer-nearby-businesses-heading"
      className="overflow-hidden rounded-3xl border border-green-100 bg-white/90 p-5 shadow-xl backdrop-blur sm:p-8"
    >
      <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-green-700">
            Local Discovery
          </p>

          <h2
            id="customer-nearby-businesses-heading"
            className="mt-2 break-words text-2xl font-bold leading-tight text-gray-900"
          >
            Nearby Businesses
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
            Explore participating
            businesses with usable location
            details. Higher-rated businesses
            appear first until customer
            distance is available.
          </p>
        </div>

        <span className="w-fit shrink-0 rounded-full bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700">
          {nearbyBusinesses.length}{' '}
          {nearbyBusinesses.length === 1
            ? 'business'
            : 'businesses'}
        </span>
      </div>

      {nearbyBusinesses.length > 0 ? (
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {nearbyBusinesses.map(
            (business) => {
              const ratingLabel =
                formatRating({
                  rating:
                    business.rating,
                  reviewCount:
                    business.reviewCount,
                })

              const mapUrl =
                getMapUrl({
                  googleMapsUrl:
                    business.googleMapsUrl,
                  address:
                    business.address,
                })

              const firstOfferId =
                business.offerIds[0]

              return (
                <article
                  key={business.id}
                  className="flex min-w-0 h-full flex-col overflow-hidden rounded-2xl border border-green-100 bg-white p-5 shadow-sm sm:p-6"
                >
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-wide text-green-700">
                        {business.category ??
                          'Local Business'}
                      </p>

                      <h3 className="mt-2 break-words text-lg font-bold leading-snug text-gray-900">
                        {business.name}
                      </h3>
                    </div>

                    <span className="shrink-0 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                      {
                        business.offerCount
                      }{' '}
                      {business.offerCount ===
                      1
                        ? 'offer'
                        : 'offers'}
                    </span>
                  </div>

                  {ratingLabel ? (
                    <p className="mt-3 break-words text-sm font-semibold leading-6 text-yellow-700">
                      ★ {ratingLabel}
                    </p>
                  ) : (
                    <p className="mt-3 text-sm leading-6 text-gray-500">
                      Rating not yet
                      available
                    </p>
                  )}

                  <dl className="mt-4 space-y-4 rounded-2xl bg-gray-50 p-4 text-sm">
                    {business.address ? (
                      <div>
                        <dt className="font-semibold text-gray-900">
                          Location
                        </dt>

                        <dd className="mt-1 break-words leading-6 text-gray-600">
                          {
                            business.address
                          }
                        </dd>
                      </div>
                    ) : (
                      <div>
                        <dt className="font-semibold text-gray-900">
                          Location
                        </dt>

                        <dd className="mt-1 leading-6 text-gray-600">
                          Map location
                          available
                        </dd>
                      </div>
                    )}

                    {hasActivePass &&
                    business.phone ? (
                      <div>
                        <dt className="font-semibold text-gray-900">
                          Phone
                        </dt>

                        <dd className="mt-1">
                          <a
                            href={`tel:${business.phone}`}
                            className="break-words font-medium text-blue-700 underline underline-offset-4"
                          >
                            {
                              business.phone
                            }
                          </a>
                        </dd>
                      </div>
                    ) : null}
                  </dl>

                  <div className="mt-auto grid gap-3 pt-5 sm:grid-cols-2">
                    {mapUrl ? (
                      <a
                        href={mapUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-center text-sm font-semibold text-green-700 transition hover:bg-green-100"
                      >
                        Open Map
                      </a>
                    ) : null}

                    {business.websiteUrl ? (
                      <a
                        href={
                          business.websiteUrl
                        }
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-center text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
                      >
                        Visit Website
                      </a>
                    ) : null}

                    {firstOfferId ? (
                      <Link
                        href={
                          hasActivePass
                            ? `/offers/${firstOfferId}`
                            : '/campaigns'
                        }
                        className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-green-700 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-green-800 sm:col-span-2"
                      >
                        {hasActivePass
                          ? business.offerCount === 1
                            ? 'View Available Offer'
                            : 'View a Business Offer'
                          : 'Unlock Offers With a Pass'}
                      </Link>
                    ) : null}
                  </div>
                </article>
              )
            }
          )}
        </div>
      ) : (
        <div className="mt-6 rounded-3xl border border-green-100 bg-gradient-to-br from-green-50 via-white to-blue-50 p-5 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-wide text-green-700">
            No Location-Ready Businesses
          </p>

          <h3 className="mt-2 break-words text-xl font-bold leading-snug text-gray-900">
            Nearby discovery is still
            growing
          </h3>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-600">
            Participating businesses will
            appear here once they add an
            address, map link, Google
            location, or verified
            coordinates.
          </p>

          <Link
            href="/dashboard#available-offers"
            className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-green-700 px-5 py-3 text-center text-sm font-semibold text-white transition hover:bg-green-800 sm:w-auto"
          >
            Browse All Available Deals
          </Link>
        </div>
      )}
    </section>
  )
}
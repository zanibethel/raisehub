import Link from 'next/link'

import {
  formatCustomerNearbyBusinessRating,
  getCustomerNearbyBusinesses,
  getCustomerNearbyBusinessMapUrl,
} from '../customer-nearby-businesses'

import type { CustomerDashboardOffer } from '@/types/customer-dashboard'

type Props = {
  enrichedOffers: CustomerDashboardOffer[]
  hasActivePass: boolean
}

export default function CustomerNearbyBusinessesSection({
  enrichedOffers,
  hasActivePass,
}: Props) {
  const nearbyBusinesses = getCustomerNearbyBusinesses(enrichedOffers)

  return (
    <section
      aria-labelledby="customer-nearby-businesses-heading"
      className="overflow-hidden rounded-3xl border border-green-100 bg-white/90 p-4 shadow-lg backdrop-blur sm:p-6"
    >
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-green-700">
            Local Discovery
          </p>
          <h2
            id="customer-nearby-businesses-heading"
            className="mt-1 break-words text-xl font-bold leading-tight text-gray-900 sm:text-2xl"
          >
            Nearby Businesses
          </h2>
          <p className="mt-1 text-xs leading-5 text-gray-600 sm:text-sm">
            Participating businesses with usable location details.
          </p>
        </div>

        <span className="shrink-0 rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700">
          {nearbyBusinesses.length}
        </span>
      </div>

      {nearbyBusinesses.length > 0 ? (
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {nearbyBusinesses.map((business) => {
            const ratingLabel = formatCustomerNearbyBusinessRating({
              rating: business.rating,
              reviewCount: business.reviewCount,
            })
            const mapUrl = getCustomerNearbyBusinessMapUrl({
              googleMapsUrl: business.googleMapsUrl,
              address: business.address,
            })
            const firstOfferId = business.offerIds[0]

            return (
              <article
                key={business.id}
                className="flex min-w-0 flex-col rounded-2xl border border-green-100 bg-white p-4 shadow-sm"
              >
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-green-700">
                      {business.category ?? 'Local Business'}
                    </p>
                    <h3 className="mt-1 break-words text-base font-bold leading-snug text-gray-900 sm:text-lg">
                      {business.name}
                    </h3>
                  </div>

                  <span className="shrink-0 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                    {business.offerCount} {business.offerCount === 1 ? 'offer' : 'offers'}
                  </span>
                </div>

                <div className="mt-3 space-y-1.5 text-sm">
                  <p className={ratingLabel ? 'font-medium text-yellow-700' : 'text-gray-500'}>
                    {ratingLabel ? `★ ${ratingLabel}` : 'Rating unavailable'}
                  </p>

                  <p className="break-words text-gray-600">
                    {business.address || 'Map location available'}
                  </p>

                  {hasActivePass && business.phone ? (
                    <a
                      href={`tel:${business.phone}`}
                      className="inline-block break-words font-medium text-blue-700 underline underline-offset-4"
                    >
                      {business.phone}
                    </a>
                  ) : null}
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {mapUrl ? (
                    <a
                      href={mapUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex min-h-10 flex-1 items-center justify-center rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-center text-xs font-semibold text-green-700 transition hover:bg-green-100"
                    >
                      Map
                    </a>
                  ) : null}

                  {business.websiteUrl ? (
                    <a
                      href={business.websiteUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex min-h-10 flex-1 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-center text-xs font-semibold text-blue-700 transition hover:bg-blue-100"
                    >
                      Website
                    </a>
                  ) : null}

                  {firstOfferId ? (
                    <Link
                      href={hasActivePass ? `/offers/${firstOfferId}` : '/campaigns'}
                      className="inline-flex min-h-10 w-full items-center justify-center rounded-lg bg-green-700 px-3 py-2 text-center text-xs font-semibold text-white transition hover:bg-green-800"
                    >
                      {hasActivePass
                        ? business.offerCount === 1
                          ? 'View Offer'
                          : 'View Offers'
                        : 'Unlock Offers'}
                    </Link>
                  ) : null}
                </div>
              </article>
            )
          })}
        </div>
      ) : (
        <div className="mt-4 rounded-2xl border border-green-100 bg-gradient-to-br from-green-50 via-white to-blue-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-green-700">
            No Location-Ready Businesses
          </p>
          <h3 className="mt-1 break-words text-lg font-bold leading-snug text-gray-900">
            Nearby discovery is still growing
          </h3>
          <p className="mt-2 text-sm leading-6 text-gray-600">
            Businesses will appear here once usable location details are available.
          </p>
          <Link
            href="/dashboard#available-offers"
            className="mt-4 inline-flex min-h-10 w-full items-center justify-center rounded-lg bg-green-700 px-4 py-2 text-center text-sm font-semibold text-white transition hover:bg-green-800 sm:w-auto"
          >
            Browse All Deals
          </Link>
        </div>
      )}
    </section>
  )
}

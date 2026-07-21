import Link from 'next/link'

import type {
  CustomerDashboardOffer,
} from '@/types/customer-dashboard'

// =============================================================================
// Types
// =============================================================================

type Props = {
  enrichedOffers:
    CustomerDashboardOffer[]
  savedOfferIds: Set<string>
  redeemedOfferIds: Set<string>
}

type RecommendedOffer = {
  offer: CustomerDashboardOffer
  reason: string
}

// =============================================================================
// Constants
// =============================================================================

const MAX_RECOMMENDATIONS = 3

// =============================================================================
// Helpers
// =============================================================================

function getRecommendationReason(
  offer: CustomerDashboardOffer,
  index: number
): string {
  if (
    offer.google_rating !== null &&
    offer.google_rating !== undefined
  ) {
    const rating = Number(
      offer.google_rating
    )

    if (
      Number.isFinite(rating) &&
      rating >= 4
    ) {
      return `${rating.toFixed(
        1
      )}-star local business`
    }
  }

  if (
    offer.address ||
    offer.google_maps_url
  ) {
    return index === 0
      ? 'A nearby local option'
      : 'Available near you'
  }

  return 'Available with your RaiseHub Pass'
}

function getRecommendedOffers({
  enrichedOffers,
  savedOfferIds,
  redeemedOfferIds,
}: Props): RecommendedOffer[] {
  return enrichedOffers
    .filter(
      (offer) =>
        !savedOfferIds.has(offer.id) &&
        !redeemedOfferIds.has(
          offer.id
        )
    )
    .slice(0, MAX_RECOMMENDATIONS)
    .map((offer, index) => ({
      offer,
      reason:
        getRecommendationReason(
          offer,
          index
        ),
    }))
}

// =============================================================================
// Component
// =============================================================================

export default function CustomerRecommendationsSection({
  enrichedOffers,
  savedOfferIds,
  redeemedOfferIds,
}: Props) {
  const recommendations =
    getRecommendedOffers({
      enrichedOffers,
      savedOfferIds,
      redeemedOfferIds,
    })

  return (
    <section
      aria-labelledby="customer-recommendations-heading"
      className="overflow-hidden rounded-3xl border border-green-100 bg-white/90 p-5 shadow-xl backdrop-blur sm:p-6"
    >
      <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-green-700">
            Suggested for You
          </p>

          <h2
            id="customer-recommendations-heading"
            className="mt-2 break-words text-2xl font-bold leading-tight text-gray-900"
          >
            Local Deals to Discover
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
            Explore available offers you
            have not already saved or
            redeemed.
          </p>
        </div>

        {recommendations.length > 0 ? (
          <Link
            href="#available-offers"
            className="inline-flex min-h-12 w-full shrink-0 items-center justify-center rounded-xl border border-green-200 bg-white px-4 py-3 text-center text-sm font-semibold text-green-700 transition hover:bg-green-50 sm:w-auto"
          >
            View All Available Deals
          </Link>
        ) : null}
      </div>

      {recommendations.length > 0 ? (
        <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {recommendations.map(
            ({ offer, reason }) => {
              const businessName =
                offer.business_name ||
                'Local Business'

              const offerTitle =
                offer.title ||
                'Local offer'

              const offerHref =
                `/offers/${offer.id}`

              return (
                <article
                  key={offer.id}
                  className="flex min-w-0 h-full flex-col overflow-hidden rounded-2xl border border-green-100 bg-gradient-to-br from-green-50 via-white to-blue-50 p-5"
                >
                  <div className="min-w-0">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <span className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-semibold text-green-700 shadow-sm">
                        Recommended
                      </span>

                      <span className="min-w-0 break-words text-xs font-semibold uppercase tracking-wide text-gray-500">
                        {businessName}
                      </span>
                    </div>

                    <h3 className="mt-4 break-words text-lg font-bold leading-snug text-gray-900">
                      {offerTitle}
                    </h3>

                    <p className="mt-2 break-words font-semibold leading-6 text-green-700">
                      {offer.discount ||
                        'RaiseHub member benefit'}
                    </p>

                    <p className="mt-3 text-sm leading-6 text-gray-600">
                      {reason}
                    </p>

                    {offer.description ? (
                      <p className="mt-2 break-words text-sm leading-6 text-gray-600">
                        {
                          offer.description
                        }
                      </p>
                    ) : null}
                  </div>

                  <div className="mt-auto pt-5">
                    {offer.address ? (
                      <div className="mb-4 rounded-xl bg-white/80 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                          Location
                        </p>

                        <p className="mt-1 break-words text-sm leading-6 text-gray-600">
                          {offer.address}
                        </p>
                      </div>
                    ) : null}

                    <Link
                      href={offerHref}
                      className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-green-700 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-green-800"
                    >
                      View Deal Details
                    </Link>
                  </div>
                </article>
              )
            }
          )}
        </div>
      ) : (
        <div className="mt-5 rounded-2xl border border-green-100 bg-green-50 p-5">
          <p className="break-words font-semibold text-green-800">
            You have reviewed the current
            deal selection
          </p>

          <p className="mt-2 text-sm leading-6 text-green-700">
            New recommendations will appear
            here when additional local
            offers become available.
          </p>

          <Link
            href="#my-pass"
            className="mt-4 inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-green-200 bg-white px-4 py-3 text-center text-sm font-semibold text-green-800 transition hover:bg-green-100 sm:w-auto"
          >
            Review My Saved Deals
          </Link>
        </div>
      )}
    </section>
  )
}
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
      className="rounded-3xl border border-green-100 bg-white/90 p-5 shadow-xl backdrop-blur sm:p-6"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-green-700">
            Suggested for You
          </p>

          <h2
            id="customer-recommendations-heading"
            className="mt-2 text-2xl font-bold text-gray-900"
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
            className="inline-flex min-h-11 w-fit items-center justify-center text-sm font-semibold text-green-700 underline underline-offset-4 transition hover:text-green-800"
          >
            View All Available Deals
          </Link>
        ) : null}
      </div>

      {recommendations.length > 0 ? (
        <div className="mt-5 grid gap-4 lg:grid-cols-3">
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
                  className="flex h-full flex-col rounded-2xl border border-green-100 bg-gradient-to-br from-green-50 via-white to-blue-50 p-5"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-green-700 shadow-sm">
                        Recommended
                      </span>

                      <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                        {businessName}
                      </span>
                    </div>

                    <h3 className="mt-4 text-lg font-bold text-gray-900">
                      {offerTitle}
                    </h3>

                    <p className="mt-1 font-semibold text-green-700">
                      {offer.discount ||
                        'RaiseHub member benefit'}
                    </p>

                    <p className="mt-3 text-sm leading-6 text-gray-600">
                      {reason}
                    </p>

                    {offer.description ? (
                      <p className="mt-2 line-clamp-3 text-sm leading-6 text-gray-600">
                        {
                          offer.description
                        }
                      </p>
                    ) : null}
                  </div>

                  <div className="mt-auto pt-5">
                    {offer.address ? (
                      <p className="mb-4 text-sm text-gray-500">
                        📍 {offer.address}
                      </p>
                    ) : null}

                    <Link
                      href={offerHref}
                      className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-green-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-green-800"
                    >
                      View Deal
                    </Link>
                  </div>
                </article>
              )
            }
          )}
        </div>
      ) : (
        <div className="mt-5 rounded-2xl border border-green-100 bg-green-50 p-5">
          <p className="font-semibold text-green-800">
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
            className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-green-800 underline underline-offset-4"
          >
            Review My Saved Deals
          </Link>
        </div>
      )}
    </section>
  )
}
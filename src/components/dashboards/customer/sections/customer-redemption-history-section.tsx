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
  redemptionDateByOfferId: Map<
    string,
    string
  >
}

type RedemptionHistoryItem = {
  offer: CustomerDashboardOffer
  redeemedAt: string
}

// =============================================================================
// Date helpers
// =============================================================================

function getDateTimestamp(
  value: string
): number {
  const timestamp =
    new Date(value).getTime()

  return Number.isNaN(timestamp)
    ? 0
    : timestamp
}

function formatRedemptionDate(
  value: string
): string {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return 'Date unavailable'
  }

  return date.toLocaleDateString(
    undefined,
    {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }
  )
}

function formatRedemptionTime(
  value: string
): string {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  return date.toLocaleTimeString(
    undefined,
    {
      hour: 'numeric',
      minute: '2-digit',
    }
  )
}

// =============================================================================
// History helpers
// =============================================================================

function getRedemptionHistory({
  enrichedOffers,
  redemptionDateByOfferId,
}: Props): RedemptionHistoryItem[] {
  return enrichedOffers
    .flatMap((offer) => {
      const redeemedAt =
        redemptionDateByOfferId.get(
          offer.id
        )

      if (!redeemedAt) {
        return []
      }

      return [
        {
          offer,
          redeemedAt,
        },
      ]
    })
    .sort(
      (
        firstRedemption,
        secondRedemption
      ) =>
        getDateTimestamp(
          secondRedemption.redeemedAt
        ) -
        getDateTimestamp(
          firstRedemption.redeemedAt
        )
    )
}

// =============================================================================
// Component
// =============================================================================

export default function CustomerRedemptionHistorySection({
  enrichedOffers,
  redemptionDateByOfferId,
}: Props) {
  const redemptionHistory =
    getRedemptionHistory({
      enrichedOffers,
      redemptionDateByOfferId,
    })

  return (
    <section
      aria-labelledby="customer-redemption-history-heading"
    >
      <div className="rounded-3xl border border-purple-100 bg-white/90 p-6 shadow-xl backdrop-blur sm:p-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-purple-700">
              Pass Activity
            </p>

            <h2
              id="customer-redemption-history-heading"
              className="mt-2 text-2xl font-bold text-gray-900"
            >
              Redemption History
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
              Review the local offers you
              have already used through
              your RaiseHub Pass.
            </p>
          </div>

          <span className="w-fit rounded-full bg-purple-50 px-3 py-1.5 text-xs font-semibold text-purple-700">
            {redemptionHistory.length}{' '}
            {redemptionHistory.length === 1
              ? 'redemption'
              : 'redemptions'}
          </span>
        </div>
      </div>

      <div className="mt-6">
        {redemptionHistory.length > 0 ? (
          <div className="space-y-4">
            {redemptionHistory.map(
              ({
                offer,
                redeemedAt,
              }) => {
                const businessName =
                  offer.business_name ||
                  'Local Business'

                const offerTitle =
                  offer.title ||
                  'Local offer'

                const redemptionTime =
                  formatRedemptionTime(
                    redeemedAt
                  )

                return (
                  <article
                    key={offer.id}
                    className="rounded-2xl border border-purple-100 bg-white p-5 shadow-sm sm:p-6"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                            Redeemed
                          </span>

                          <span className="text-xs font-semibold uppercase tracking-wide text-purple-700">
                            {businessName}
                          </span>
                        </div>

                        <h3 className="mt-3 text-lg font-bold text-gray-900">
                          {offerTitle}
                        </h3>

                        <p className="mt-1 font-semibold text-green-700">
                          {offer.discount ||
                            'RaiseHub member benefit'}
                        </p>

                        {offer.description ? (
                          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
                            {
                              offer.description
                            }
                          </p>
                        ) : null}
                      </div>

                      <div className="shrink-0 rounded-2xl bg-purple-50 px-4 py-3 text-left sm:text-right">
                        <p className="text-xs font-semibold uppercase tracking-wide text-purple-700">
                          Used
                        </p>

                        <p className="mt-1 font-semibold text-gray-900">
                          {formatRedemptionDate(
                            redeemedAt
                          )}
                        </p>

                        {redemptionTime ? (
                          <p className="mt-1 text-xs text-gray-600">
                            {redemptionTime}
                          </p>
                        ) : null}
                      </div>
                    </div>

                    {offer.address ||
                    offer.google_maps_url ? (
                      <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-gray-100 pt-4 text-sm">
                        {offer.address ? (
                          <p className="text-gray-600">
                            📍 {offer.address}
                          </p>
                        ) : null}

                        {offer.google_maps_url ? (
                          <a
                            href={
                              offer.google_maps_url
                            }
                            target="_blank"
                            rel="noreferrer"
                            className="font-semibold text-purple-700 underline underline-offset-2"
                          >
                            View Business Map
                          </a>
                        ) : null}
                      </div>
                    ) : null}
                  </article>
                )
              }
            )}
          </div>
        ) : (
          <div className="rounded-3xl border border-purple-100 bg-gradient-to-br from-purple-50 via-white to-blue-50 p-6 shadow-lg sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-wide text-purple-700">
              No Redemptions Yet
            </p>

            <h3 className="mt-2 text-xl font-bold text-gray-900">
              Your used offers will appear
              here
            </h3>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-600">
              When you redeem a saved local
              offer, RaiseHub will keep the
              date and business information
              here for easy reference.
            </p>

            <Link
              href="#available-offers"
              className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-purple-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-purple-800"
            >
              Browse Available Deals
            </Link>
          </div>
        )}
      </div>
    </section>
  )
}
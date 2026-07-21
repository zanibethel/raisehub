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

function normalizeExternalUrl(
  value: string
): string {
  return value.startsWith('http')
    ? value
    : `https://${value}`
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
      <div className="overflow-hidden rounded-3xl border border-purple-100 bg-white/90 p-5 shadow-xl backdrop-blur sm:p-8">
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-purple-700">
              Pass Activity
            </p>

            <h2
              id="customer-redemption-history-heading"
              className="mt-2 break-words text-2xl font-bold leading-tight text-gray-900"
            >
              Redemption History
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
              Review the local offers you
              have already used through
              your RaiseHub Pass.
            </p>
          </div>

          <span className="w-fit shrink-0 rounded-full bg-purple-50 px-3 py-1.5 text-xs font-semibold text-purple-700">
            {redemptionHistory.length}{' '}
            {redemptionHistory.length === 1
              ? 'redemption'
              : 'redemptions'}
          </span>
        </div>
      </div>

      <div className="mt-5 sm:mt-6">
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
                    className="min-w-0 overflow-hidden rounded-2xl border border-purple-100 bg-white p-5 shadow-sm sm:p-6"
                  >
                    <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                          <span className="shrink-0 rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                            Redeemed
                          </span>

                          <span className="min-w-0 break-words text-xs font-semibold uppercase tracking-wide text-purple-700">
                            {businessName}
                          </span>
                        </div>

                        <h3 className="mt-3 break-words text-lg font-bold leading-snug text-gray-900">
                          {offerTitle}
                        </h3>

                        <p className="mt-2 break-words font-semibold leading-6 text-green-700">
                          {offer.discount ||
                            'RaiseHub member benefit'}
                        </p>

                        {offer.description ? (
                          <p className="mt-2 max-w-2xl break-words text-sm leading-6 text-gray-600">
                            {
                              offer.description
                            }
                          </p>
                        ) : null}
                      </div>

                      <div className="w-full shrink-0 rounded-2xl bg-purple-50 px-4 py-3 text-left sm:w-auto sm:text-right">
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

                    {offer.address ? (
                      <div className="mt-4 rounded-2xl bg-gray-50 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                          Location
                        </p>

                        <p className="mt-1 break-words text-sm leading-6 text-gray-600">
                          {offer.address}
                        </p>
                      </div>
                    ) : null}

                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      <Link
                        href={`/offers/${offer.id}`}
                        className="inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-purple-200 bg-white px-4 py-3 text-center text-sm font-semibold text-purple-700 transition hover:bg-purple-50"
                      >
                        View Deal Details
                      </Link>

                      {offer.google_maps_url ? (
                        <a
                          href={normalizeExternalUrl(
                            offer.google_maps_url
                          )}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-purple-700 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-purple-800"
                        >
                          View Business Map
                        </a>
                      ) : null}
                    </div>
                  </article>
                )
              }
            )}
          </div>
        ) : (
          <div className="rounded-3xl border border-purple-100 bg-gradient-to-br from-purple-50 via-white to-blue-50 p-5 shadow-lg sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-wide text-purple-700">
              No Redemptions Yet
            </p>

            <h3 className="mt-2 break-words text-xl font-bold leading-snug text-gray-900">
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
              className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-purple-700 px-5 py-3 text-center text-sm font-semibold text-white transition hover:bg-purple-800 sm:w-auto"
            >
              Browse Available Deals
            </Link>
          </div>
        )}
      </div>
    </section>
  )
}
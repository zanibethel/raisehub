import Link from 'next/link'

import type {
  CustomerDashboardOffer,
} from '@/types/customer-dashboard'

// =============================================================================
// Types
// =============================================================================

type Props = {
  hasPurchasedPass: boolean
  enrichedOffers:
    CustomerDashboardOffer[]
  savedOfferIds: Set<string>
}

// =============================================================================
// Helpers
// =============================================================================

function formatOfferDate(
  value: string | null | undefined
): string {
  if (!value) {
    return 'No listed end date'
  }

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

// =============================================================================
// Component
// =============================================================================

export default function CustomerAvailableDealsSection({
  hasPurchasedPass,
  enrichedOffers,
  savedOfferIds,
}: Props) {
  return (
    <section
      id="available-deals"
      aria-labelledby="customer-available-deals-heading"
    >
      <div className="overflow-hidden rounded-3xl border border-blue-100 bg-white/90 p-5 shadow-xl backdrop-blur sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
          Local Benefits
        </p>

        <div className="mt-2 flex min-w-0 flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h2
              id="customer-available-deals-heading"
              className="break-words text-2xl font-bold leading-tight text-gray-900"
            >
              Available Local Deals
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
              Browse participating
              business offers available
              through the RaiseHub
              community.
            </p>
          </div>

          <span className="w-fit shrink-0 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
            {enrichedOffers.length}{' '}
            {enrichedOffers.length === 1
              ? 'offer'
              : 'offers'}
          </span>
        </div>
      </div>

      {!hasPurchasedPass ? (
        <div className="mt-5 rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-sm sm:mt-6 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
            Active Pass Required
          </p>

          <h3 className="mt-2 break-words text-xl font-bold leading-snug text-gray-900">
            Support a fundraiser to
            unlock full deal access
          </h3>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-600">
            You can preview participating
            offers below, but an active
            RaiseHub Pass is required to
            access complete offer details
            and save deals.
          </p>

          <Link
            href="/campaigns"
            className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-green-700 px-5 py-3 text-center text-sm font-semibold text-white transition hover:bg-green-800 sm:w-auto"
          >
            Find a Fundraiser
          </Link>
        </div>
      ) : null}

      <div className="mt-5 sm:mt-6">
        {enrichedOffers.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {enrichedOffers.map(
              (offer) => {
                const isSaved =
                  savedOfferIds.has(
                    offer.id
                  )

                const businessName =
                  offer.business_name ||
                  'Local Business'

                const offerTitle =
                  offer.title ||
                  'Local offer'

                return (
                  <article
                    key={offer.id}
                    className="flex min-w-0 h-full flex-col overflow-hidden rounded-2xl border border-blue-100 bg-white p-5 shadow-sm sm:p-6"
                  >
                    <div className="flex min-w-0 items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="break-words text-xs font-semibold uppercase tracking-wide text-blue-700">
                          {businessName}
                        </p>

                        <h3 className="mt-2 break-words text-lg font-bold leading-snug text-gray-900">
                          {offerTitle}
                        </h3>
                      </div>

                      {isSaved ? (
                        <span className="shrink-0 rounded-full bg-yellow-50 px-3 py-1 text-xs font-semibold text-yellow-700">
                          Saved
                        </span>
                      ) : null}
                    </div>

                    <p className="mt-3 break-words font-semibold leading-6 text-green-700">
                      {hasPurchasedPass
                        ? offer.discount ||
                          'Member benefit available'
                        : 'Exclusive pass benefit'}
                    </p>

                    <p className="mt-2 break-words text-sm leading-6 text-gray-600">
                      {hasPurchasedPass
                        ? offer.description ||
                          'Offer details are available through your RaiseHub Pass.'
                        : 'Activate a RaiseHub Pass to view the complete offer details.'}
                    </p>

                    <dl className="mt-4 space-y-4 rounded-2xl bg-gray-50 p-4 text-sm">
                      {offer.address ? (
                        <div>
                          <dt className="font-semibold text-gray-900">
                            Location
                          </dt>

                          <dd className="mt-1 break-words leading-6 text-gray-600">
                            {offer.address}
                          </dd>
                        </div>
                      ) : null}

                      {hasPurchasedPass &&
                      offer.phone ? (
                        <div>
                          <dt className="font-semibold text-gray-900">
                            Phone
                          </dt>

                          <dd className="mt-1">
                            <a
                              href={`tel:${offer.phone}`}
                              className="break-words font-medium text-blue-700 underline underline-offset-4"
                            >
                              {offer.phone}
                            </a>
                          </dd>
                        </div>
                      ) : null}

                      <div>
                        <dt className="font-semibold text-gray-900">
                          Offer ends
                        </dt>

                        <dd className="mt-1 text-gray-600">
                          {formatOfferDate(
                            offer.ends_at
                          )}
                        </dd>
                      </div>
                    </dl>

                    <div className="mt-auto pt-5">
                      {hasPurchasedPass ? (
                        <Link
                          href={`/offers/${offer.id}`}
                          className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-blue-700 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-blue-800"
                        >
                          View Deal Details
                        </Link>
                      ) : (
                        <Link
                          href="/campaigns"
                          className="inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-center text-sm font-semibold text-amber-800 transition hover:bg-amber-100"
                        >
                          Unlock With a Pass
                        </Link>
                      )}
                    </div>
                  </article>
                )
              }
            )}
          </div>
        ) : (
          <div className="rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-green-50 p-5 shadow-lg sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
              No Offers Available
            </p>

            <h3 className="mt-2 break-words text-xl font-bold text-gray-900">
              New local deals are coming
            </h3>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-600">
              Participating businesses
              have not published any
              active offers yet. Check
              back as more community
              partners join RaiseHub.
            </p>
          </div>
        )}
      </div>
    </section>
  )
}
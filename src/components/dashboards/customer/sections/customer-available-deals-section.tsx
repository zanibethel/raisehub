import Link from 'next/link'

import type { CustomerDashboardOffer } from '@/types/customer-dashboard'

// =============================================================================
// Types
// =============================================================================

type Props = {
  hasPurchasedPass: boolean
  enrichedOffers: CustomerDashboardOffer[]
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

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
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
      <div className="rounded-3xl border border-blue-100 bg-white/90 p-6 shadow-xl backdrop-blur sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
          Local Benefits
        </p>

        <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2
              id="customer-available-deals-heading"
              className="text-2xl font-bold text-gray-900"
            >
              Available Local Deals
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
              Browse participating business offers
              available through the RaiseHub
              community.
            </p>
          </div>

          <span className="w-fit rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
            {enrichedOffers.length}{' '}
            {enrichedOffers.length === 1
              ? 'offer'
              : 'offers'}
          </span>
        </div>
      </div>

      {!hasPurchasedPass ? (
        <div className="mt-6 rounded-3xl border border-amber-200 bg-amber-50 p-6 shadow-sm sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
            Active Pass Required
          </p>

          <h3 className="mt-2 text-xl font-bold text-gray-900">
            Support a fundraiser to unlock full deal
            access
          </h3>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-600">
            You can preview participating offers
            below, but an active RaiseHub Pass is
            required to access complete offer details
            and save deals.
          </p>

          <Link
            href="/campaigns"
            className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-green-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-green-800"
          >
            Find a Fundraiser
          </Link>
        </div>
      ) : null}

      <div className="mt-6">
        {enrichedOffers.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {enrichedOffers.map((offer) => {
              const isSaved =
                savedOfferIds.has(offer.id)

              return (
                <article
                  key={offer.id}
                  className="flex h-full flex-col rounded-2xl border border-blue-100 bg-white p-6 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                        {offer.business_name ||
                          'Local Business'}
                      </p>

                      <h3 className="mt-2 text-lg font-bold text-gray-900">
                        {offer.title ||
                          'Local offer'}
                      </h3>
                    </div>

                    {isSaved ? (
                      <span className="rounded-full bg-yellow-50 px-3 py-1 text-xs font-semibold text-yellow-700">
                        Saved
                      </span>
                    ) : null}
                  </div>

                  <p className="mt-3 font-semibold text-green-700">
                    {offer.discount ||
                      'Member benefit available'}
                  </p>

                  <p className="mt-2 line-clamp-3 text-sm leading-6 text-gray-600">
                    {hasPurchasedPass
                      ? offer.description ||
                        'Offer details are available through your RaiseHub Pass.'
                      : 'Activate a RaiseHub Pass to view the complete offer details.'}
                  </p>

                  <div className="mt-4 space-y-2 text-sm text-gray-600">
                    {offer.address ? (
                      <p>📍 {offer.address}</p>
                    ) : null}

                    {hasPurchasedPass &&
                    offer.phone ? (
                      <p>📞 {offer.phone}</p>
                    ) : null}

                    <p>
                      Ends:{' '}
                      {formatOfferDate(
                        offer.ends_at
                      )}
                    </p>
                  </div>

                  <div className="mt-auto pt-5">
                    {hasPurchasedPass ? (
                      <Link
                        href={`/offers#${offer.id}`}
                        className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800"
                      >
                        View Offer
                      </Link>
                    ) : (
                      <Link
                        href="/campaigns"
                        className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-800 transition hover:bg-amber-100"
                      >
                        Unlock With a Pass
                      </Link>
                    )}
                  </div>
                </article>
              )
            })}
          </div>
        ) : (
          <div className="rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-green-50 p-6 shadow-lg sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
              No Offers Available
            </p>

            <h3 className="mt-2 text-xl font-bold text-gray-900">
              New local deals are coming
            </h3>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-600">
              Participating businesses have not
              published any active offers yet. Check
              back as more community partners join
              RaiseHub.
            </p>
          </div>
        )}
      </div>
    </section>
  )
}
import Link from 'next/link'

import UseOfferButton from '@/app/components/use-offer-button'
import type { CustomerDashboardOffer } from '@/types/customer-dashboard'

// =============================================================================
// Types
// =============================================================================

type Props = {
  enrichedOffers: CustomerDashboardOffer[]
  savedOfferIds: Set<string>
  redeemedOfferIds: Set<string>
  redemptionDateByOfferId: Map<
    string,
    string
  >
}

// =============================================================================
// Component
// =============================================================================

export default function CustomerSavedDealsSection({
  enrichedOffers,
  savedOfferIds,
  redeemedOfferIds,
  redemptionDateByOfferId,
}: Props) {
  const savedOffers =
    enrichedOffers.filter((offer) =>
      savedOfferIds.has(offer.id)
    )

  return (
    <section>
      <div className="rounded-3xl border border-green-100 bg-white/90 p-8 shadow-xl backdrop-blur">
        <p className="text-xs font-semibold uppercase tracking-wide text-green-700">
          Quick Access
        </p>

        <h2 className="mt-2 text-2xl font-semibold text-green-700">
          My Saved Deals
        </h2>

        <p className="mt-2 text-sm text-gray-600">
          Offers you&apos;ve saved for quick
          access.
        </p>
      </div>

      <div className="mt-6">
        {savedOffers.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-3">
            {savedOffers.map((offer) => (
              <div
                key={offer.id}
                className="rounded-2xl border border-green-100 bg-white/90 p-6 shadow-xl backdrop-blur"
              >
                <p className="text-xs font-medium uppercase tracking-wide text-green-700">
                  {offer.business_name ??
                    'Local Business'}
                </p>

                <h3 className="mt-2 text-lg font-semibold text-green-700">
                  {offer.title}
                </h3>

                <p className="mt-1 text-sm text-gray-500">
                  {offer.discount}
                </p>

                <p className="mt-2 text-sm text-gray-600">
                  {offer.description}
                </p>

                <div className="mt-3 space-y-1 text-xs text-gray-500">
                  {offer.phone ? (
                    <p>📞 {offer.phone}</p>
                  ) : null}

                  {offer.address ? (
                    <p>📍 {offer.address}</p>
                  ) : null}

                  {offer.google_maps_url ? (
                    <a
                      href={offer.google_maps_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-green-700 underline"
                    >
                      View Map
                    </a>
                  ) : null}
                </div>

                <div className="mt-4 space-y-1 text-xs text-gray-500">
                  <p>
                    Ends:{' '}
                    {offer.ends_at
                      ? new Date(
                          offer.ends_at
                        ).toLocaleDateString()
                      : 'No listed end date'}
                  </p>
                </div>

                {redeemedOfferIds.has(
                  offer.id
                ) ? (
                  <div className="mt-4 rounded-lg bg-gray-100 px-4 py-3 text-center">
                    <p className="text-sm font-medium text-gray-700">
                      ✅ Used
                    </p>

                    <p className="mt-1 text-xs text-gray-500">
                      Used on{' '}
                      {new Date(
                        redemptionDateByOfferId.get(
                          offer.id
                        ) ?? ''
                      ).toLocaleString()}
                    </p>
                  </div>
                ) : (
                  <UseOfferButton
                    offerId={offer.id}
                  />
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-green-100 bg-gradient-to-br from-green-50 via-white to-blue-50 p-6 shadow-lg sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-wide text-green-700">
              Nothing Saved Yet
            </p>

            <h3 className="mt-2 text-xl font-bold text-gray-900">
              Keep your favorite local deals
              within reach
            </h3>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-600">
              Browse the deals available through
              your RaiseHub Pass and save the ones
              you plan to use. They will appear
              here for quick access.
            </p>

            <Link
              href="#available-deals"
              className="mt-5 inline-flex items-center justify-center rounded-xl bg-green-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-green-700"
            >
              View Available Deals
            </Link>
          </div>
        )}
      </div>
    </section>
  )
}
'use client'

import { useMemo, useState } from 'react'

import SaveOfferButton from './save-offer-button'

// =============================================================================
// Types
// =============================================================================

type Offer = {
  id: string
  title: string | null
  description: string | null
  discount: string | null
  starts_at: string | null
  ends_at: string | null
  business_name?: string
  phone?: string
  address?: string
  google_maps_url?: string
}

type AvailableOffersSectionProps = {
  offers: Offer[]
  savedOfferIds: string[]
}

// =============================================================================
// Component
// =============================================================================

export default function AvailableOffersSection({
  offers,
  savedOfferIds,
}: AvailableOffersSectionProps) {
  const [hideSaved, setHideSaved] = useState(false)

  const visibleOffers = useMemo(() => {
    if (!hideSaved) {
      return offers
    }

    return offers.filter(
      (offer) => !savedOfferIds.includes(offer.id)
    )
  }, [offers, savedOfferIds, hideSaved])

  const hasSavedOffers = savedOfferIds.length > 0

  return (
    <section aria-label="Available local deals">
      <div className="flex flex-col gap-3 rounded-2xl border border-yellow-100 bg-white/90 px-5 py-4 shadow-sm backdrop-blur sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-gray-600">
          Showing{' '}
          <span className="font-semibold text-gray-900">
            {visibleOffers.length}
          </span>{' '}
          {visibleOffers.length === 1 ? 'deal' : 'deals'}
        </p>

        {hasSavedOffers ? (
          <label className="flex items-center gap-2 text-sm font-medium text-gray-600">
            <input
              type="checkbox"
              checked={hideSaved}
              onChange={(event) =>
                setHideSaved(event.target.checked)
              }
              className="h-4 w-4 rounded border-gray-300"
            />

            Hide deals already saved
          </label>
        ) : (
          <p className="text-xs text-gray-500">
            Save a deal to keep it in My Saved Deals.
          </p>
        )}
      </div>

      <div className="mt-6">
        {visibleOffers.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-3">
            {visibleOffers.map((offer) => (
              <article
                key={offer.id}
                className="rounded-2xl border border-yellow-100 bg-white/90 p-6 shadow-xl backdrop-blur"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-yellow-700">
                      {offer.business_name || 'Local Business'}
                    </p>

                    <h3 className="mt-2 text-lg font-semibold text-yellow-600">
                      {offer.title || 'Local Deal'}
                    </h3>
                  </div>

                  <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
                    Active
                  </span>
                </div>

                {offer.discount ? (
                  <p className="mt-1 text-sm font-medium text-gray-500">
                    {offer.discount}
                  </p>
                ) : null}

                {offer.description ? (
                  <p className="mt-2 text-sm leading-6 text-gray-600">
                    {offer.description}
                  </p>
                ) : null}

                <div className="mt-3 space-y-1 text-xs text-gray-500">
                  {offer.phone ? <p>📞 {offer.phone}</p> : null}

                  {offer.address ? <p>📍 {offer.address}</p> : null}

                  {offer.google_maps_url ? (
                    <a
                      href={offer.google_maps_url}
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium text-yellow-700 underline"
                    >
                      View Map
                    </a>
                  ) : null}
                </div>

                <div className="mt-4 space-y-1 text-xs text-gray-500">
                  <p>
                    Starts:{' '}
                    {offer.starts_at
                      ? new Date(
                          offer.starts_at
                        ).toLocaleDateString()
                      : 'Available now'}
                  </p>

                  <p>
                    Ends:{' '}
                    {offer.ends_at
                      ? new Date(
                          offer.ends_at
                        ).toLocaleDateString()
                      : 'No listed end date'}
                  </p>
                </div>

                {savedOfferIds.includes(offer.id) ? (
                  <div className="mt-4 rounded-lg bg-green-50 px-4 py-2 text-center text-sm font-medium text-green-700">
                    Saved to My Pass
                  </div>
                ) : (
                  <SaveOfferButton offerId={offer.id} />
                )}
              </article>
            ))}
          </div>
        ) : hideSaved && hasSavedOffers ? (
          <div className="rounded-3xl border border-green-100 bg-green-50 p-6 text-center shadow-sm">
            <p className="text-sm font-semibold text-green-800">
              All currently available deals are already saved.
            </p>

            <p className="mt-2 text-sm text-gray-600">
              Show your saved deals again or find them in My Saved Deals.
            </p>

            <button
              type="button"
              onClick={() => setHideSaved(false)}
              className="mt-4 inline-flex items-center justify-center rounded-xl bg-green-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-green-700"
            >
              Show Saved Deals
            </button>
          </div>
        ) : (
          <div className="rounded-3xl border border-yellow-100 bg-yellow-50 p-6 text-center shadow-sm">
            <p className="text-sm font-semibold text-yellow-800">
              No active local deals are available right now.
            </p>

            <p className="mt-2 text-sm text-gray-600">
              New participating-business offers will appear here automatically.
            </p>
          </div>
        )}
      </div>
    </section>
  )
}
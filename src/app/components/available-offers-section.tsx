'use client'

import { useMemo, useState } from 'react'
import SaveOfferButton from './save-offer-button'

type Offer = {
  id: string
  title: string | null
  description: string | null
  discount: string | null
  starts_at: string | null
  ends_at: string | null
  business_name?: string
}

type AvailableOffersSectionProps = {
  offers: Offer[]
  savedOfferIds: string[]
}

export default function AvailableOffersSection({
  offers,
  savedOfferIds,
}: AvailableOffersSectionProps) {
  const [hideSaved, setHideSaved] = useState(false)

  const visibleOffers = useMemo(() => {
    if (!hideSaved) return offers
    return offers.filter((offer) => !savedOfferIds.includes(offer.id))
  }, [offers, savedOfferIds, hideSaved])

  return (
    <section>
      <div className="rounded-3xl border border-yellow-100 bg-white/90 p-8 shadow-xl backdrop-blur">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-yellow-600">
              Available Offers
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Browse active local offers available through RaiseHub.
            </p>
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={hideSaved}
              onChange={(e) => setHideSaved(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            Hide saved offers
          </label>
        </div>
      </div>

      <div className="mt-6">
        {visibleOffers.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-3">
            {visibleOffers.map((offer) => (
              <div
                key={offer.id}
                className="rounded-2xl border border-yellow-100 bg-white/90 p-6 shadow-xl backdrop-blur"
              >
                <div className="flex items-center justify-between">
                  <div>
  <p className="text-xs font-medium uppercase tracking-wide text-yellow-700">
    {offer.business_name || 'Local Business'}
  </p>
  <h3 className="mt-2 text-lg font-semibold text-yellow-600">
    {offer.title}
  </h3>
</div>

                  <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-600">
                    Active
                  </span>
                </div>

                <p className="mt-1 text-sm text-gray-500">{offer.discount}</p>

                <p className="mt-2 text-sm text-gray-600">
                  {offer.description}
                </p>

                <div className="mt-4 space-y-1 text-xs text-gray-500">
                  <p>
                    Starts:{' '}
                    {offer.starts_at
                      ? new Date(offer.starts_at).toLocaleDateString()
                      : '—'}
                  </p>
                  <p>
                    Ends:{' '}
                    {offer.ends_at
                      ? new Date(offer.ends_at).toLocaleDateString()
                      : '—'}
                  </p>
                </div>

                {savedOfferIds.includes(offer.id) ? (
                  <div className="mt-4 rounded-lg bg-green-50 px-4 py-2 text-center text-sm font-medium text-green-700">
                    Saved to your pass
                  </div>
                ) : (
                  <SaveOfferButton offerId={offer.id} />
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-yellow-100 bg-white/90 p-6 shadow-xl backdrop-blur">
            <p className="text-sm text-gray-600">
              {hideSaved
                ? 'No unsaved active offers are available right now.'
                : 'No active offers are available right now.'}
            </p>
          </div>
        )}
      </div>
    </section>
  )
}
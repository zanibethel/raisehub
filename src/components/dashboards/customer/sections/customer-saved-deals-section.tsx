import UseOfferButton from '@/app/components/use-offer-button'
import type { CustomerDashboardOffer } from '@/types/customer-dashboard'

type Props = {
  enrichedOffers: CustomerDashboardOffer[]
  savedOfferIds: Set<string>
  redeemedOfferIds: Set<string>
  redemptionDateByOfferId: Map<string, string>
  savedOffersCount: number
}

export default function CustomerSavedDealsSection({
  enrichedOffers,
  savedOfferIds,
  redeemedOfferIds,
  redemptionDateByOfferId,
  savedOffersCount,
}: Props) {
  return (
    <section>
      <div className="rounded-3xl border border-green-100 bg-white/90 p-8 shadow-xl backdrop-blur">
        <h2 className="text-2xl font-semibold text-green-700">
          My Saved Deals
        </h2>

        <p className="mt-2 text-sm text-gray-600">
          Offers you&apos;ve saved for quick access.
        </p>
      </div>

      <div className="mt-6">
        {savedOffersCount > 0 ? (
          <div className="grid gap-4 md:grid-cols-3">
            {enrichedOffers
              .filter((offer) => savedOfferIds.has(offer.id))
              .map((offer) => (
                <div
                  key={offer.id}
                  className="rounded-2xl border border-green-100 bg-white/90 p-6 shadow-xl backdrop-blur"
                >
                  <p className="text-xs font-medium uppercase tracking-wide text-green-700">
                    {offer.business_name ?? 'Local Business'}
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
                    {offer.phone && <p>📞 {offer.phone}</p>}
                    {offer.address && <p>📍 {offer.address}</p>}
                    {offer.google_maps_url && (
                      <a
                        href={offer.google_maps_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-green-700 underline"
                      >
                        View Map
                      </a>
                    )}
                  </div>

                  <div className="mt-4 space-y-1 text-xs text-gray-500">
                    <p>
                      Ends:{' '}
                      {offer.ends_at
                        ? new Date(offer.ends_at).toLocaleDateString()
                        : '—'}
                    </p>
                  </div>

                  {redeemedOfferIds.has(offer.id) ? (
                    <div className="mt-4 rounded-lg bg-gray-100 px-4 py-3 text-center">
                      <p className="text-sm font-medium text-gray-700">
                        ✅ Used
                      </p>

                      <p className="mt-1 text-xs text-gray-500">
                        Used on{' '}
                        {new Date(
                          redemptionDateByOfferId.get(offer.id) ?? ''
                        ).toLocaleString()}
                      </p>
                    </div>
                  ) : (
                    <UseOfferButton offerId={offer.id} />
                  )}
                </div>
              ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-green-100 bg-white/90 p-6 shadow-xl backdrop-blur">
            <p className="text-sm text-gray-600">
              You haven&apos;t saved any offers yet.
            </p>
          </div>
        )}
      </div>
    </section>
  )
}
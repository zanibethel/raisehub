import Link from 'next/link'

import AvailableOffersSection from '@/app/components/available-offers-section'

type EnrichedOffer = {
  id: string
  business_name: string
  title: string
  discount: string
  description: string
  phone: string
  address: string
  google_maps_url: string
  ends_at: string | null
}

type Props = {
  hasPurchasedPass: boolean
  enrichedOffers: EnrichedOffer[]
  savedOfferIds: Set<string>
}

export default function CustomerAvailableDealsSection({
  hasPurchasedPass,
  enrichedOffers,
  savedOfferIds,
}: Props) {
  if (hasPurchasedPass) {
    return (
      <>
        <section
          id="available-deals"
          className="rounded-3xl border border-green-100 bg-white/90 p-8 shadow-xl backdrop-blur"
        >
          <h2 className="text-2xl font-semibold text-green-700">
            Available Deals
          </h2>

          <p className="mt-2 text-sm text-gray-600">
            Your fundraiser pass gives you access to these participating local
            offers.
          </p>
        </section>

        <AvailableOffersSection
          offers={enrichedOffers}
          savedOfferIds={[...savedOfferIds]}
        />
      </>
    )
  }

  return (
    <div className="rounded-2xl border border-yellow-100 bg-yellow-50 p-6 text-center">
      <p className="text-sm font-medium text-yellow-800">
        Buy a fundraiser pass to unlock local deals.
      </p>

      <Link
        href="/campaigns"
        className="mt-4 inline-flex rounded-lg bg-yellow-600 px-4 py-2 text-sm font-medium text-white hover:bg-yellow-700"
      >
        Browse Fundraisers
      </Link>
    </div>
  )
}
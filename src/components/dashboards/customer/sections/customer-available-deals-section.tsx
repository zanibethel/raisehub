import Link from 'next/link'

import AvailableOffersSection from '@/app/components/available-offers-section'

// =============================================================================
// Types
// =============================================================================

type AvailableOffersProps = React.ComponentProps<
  typeof AvailableOffersSection
>

type Props = {
  hasPurchasedPass: boolean
  enrichedOffers: AvailableOffersProps['offers']
  savedOfferIds: Set<string>
}

// =============================================================================
// Component
// =============================================================================

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
          <p className="text-xs font-semibold uppercase tracking-wide text-green-700">
            Your Pass Benefits
          </p>

          <h2 className="mt-2 text-2xl font-semibold text-green-700">
            Available Deals
          </h2>

          <p className="mt-2 text-sm text-gray-600">
            Your active RaiseHub Pass gives you access to these participating
            local offers.
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
    <section
      id="available-deals"
      className="rounded-3xl border border-yellow-200 bg-gradient-to-br from-yellow-50 via-white to-blue-50 p-6 shadow-lg sm:p-8"
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-yellow-700">
        Deals Locked
      </p>

      <h2 className="mt-2 text-2xl font-bold text-gray-900">
        Unlock local savings with a RaiseHub Pass
      </h2>

      <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-600">
        Support a participating fundraiser to activate your pass. Once your
        purchase is complete, return to My Pass to browse, save, and redeem
        offers from participating local businesses.
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-yellow-100 bg-white p-4">
          <p className="text-sm font-bold text-yellow-700">1. Choose</p>
          <p className="mt-1 text-sm text-gray-600">
            Select a school, team, or organization you want to support.
          </p>
        </div>

        <div className="rounded-2xl border border-blue-100 bg-white p-4">
          <p className="text-sm font-bold text-blue-700">2. Support</p>
          <p className="mt-1 text-sm text-gray-600">
            Purchase a RaiseHub Pass through that fundraiser.
          </p>
        </div>

        <div className="rounded-2xl border border-green-100 bg-white p-4">
          <p className="text-sm font-bold text-green-700">3. Save</p>
          <p className="mt-1 text-sm text-gray-600">
            Return here to explore and use your unlocked local deals.
          </p>
        </div>
      </div>

      <Link
        href="/campaigns"
        className="mt-6 inline-flex items-center justify-center rounded-xl bg-yellow-500 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-yellow-600"
      >
        Choose a Fundraiser
      </Link>
    </section>
  )
}
import CustomerAvailableDealsSection from './sections/customer-available-deals-section'
import CustomerPassesSection from './sections/customer-passes-section'
import CustomerSavedDealsSection from './sections/customer-saved-deals-section'

// =============================================================================
// Infer section prop types
// =============================================================================

type PassesProps = React.ComponentProps<
  typeof CustomerPassesSection
>

type SavedDealsProps = React.ComponentProps<
  typeof CustomerSavedDealsSection
>

type AvailableDealsProps = React.ComponentProps<
  typeof CustomerAvailableDealsSection
>

// =============================================================================
// Component props
// =============================================================================

type Props = {
  purchasedPasses: PassesProps['purchasedPasses']
  organizationById: PassesProps['organizationById']

  enrichedOffers: AvailableDealsProps['enrichedOffers']

  savedOfferIds: SavedDealsProps['savedOfferIds']
  redeemedOfferIds: SavedDealsProps['redeemedOfferIds']
  redemptionDateByOfferId:
    SavedDealsProps['redemptionDateByOfferId']

  hasPurchasedPass:
    AvailableDealsProps['hasPurchasedPass']
}

// =============================================================================
// Deal discovery helpers
// =============================================================================

const EXPIRING_SOON_DAYS = 14

function isExpiringSoon(
  endsAt: string | null | undefined,
  now: Date
): boolean {
  if (!endsAt) {
    return false
  }

  const expirationDate = new Date(endsAt)

  if (Number.isNaN(expirationDate.getTime())) {
    return false
  }

  const expirationWindow = new Date(now)

  expirationWindow.setDate(
    expirationWindow.getDate() +
      EXPIRING_SOON_DAYS
  )

  return (
    expirationDate >= now &&
    expirationDate <= expirationWindow
  )
}

// =============================================================================
// Component
// =============================================================================

export default function CustomerDashboardContent({
  purchasedPasses,
  organizationById,
  enrichedOffers,
  savedOfferIds,
  redeemedOfferIds,
  redemptionDateByOfferId,
  hasPurchasedPass,
}: Props) {
  const now = new Date()

  const savedOffersCount =
    enrichedOffers.filter((offer) =>
      savedOfferIds.has(offer.id)
    ).length

  const expiringSoonCount =
    enrichedOffers.filter((offer) =>
      isExpiringSoon(offer.ends_at, now)
    ).length

  const availableOffersCount =
    enrichedOffers.length

  return (
    <div className="mt-8 space-y-8">
      <section
        aria-labelledby="customer-deal-shortcuts-heading"
        className="rounded-3xl border border-blue-100 bg-white/90 p-5 shadow-xl backdrop-blur sm:p-6"
      >
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
            Quick Access
          </p>

          <h2
            id="customer-deal-shortcuts-heading"
            className="mt-2 text-2xl font-bold text-gray-900"
          >
            Find the deals you need
          </h2>

          <p className="mt-2 text-sm text-gray-600">
            Choose a shortcut to open the deal
            list with the right view already
            selected.
          </p>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <a
            href="#offers-all"
            className="group rounded-2xl border border-green-100 bg-green-50 p-5 transition hover:-translate-y-0.5 hover:border-green-200 hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-3">
              <span
                aria-hidden="true"
                className="text-2xl"
              >
                📍
              </span>

              <span className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-green-700">
                Location next
              </span>
            </div>

            <h3 className="mt-4 font-semibold text-gray-900 group-hover:text-green-700">
              Nearby Offers
            </h3>

            <p className="mt-1 text-sm text-gray-600">
              Open the local offer list now.
              Distance sorting will follow location
              support.
            </p>
          </a>

          <a
            href="#offers-saved"
            className="group rounded-2xl border border-yellow-100 bg-yellow-50 p-5 transition hover:-translate-y-0.5 hover:border-yellow-200 hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-3">
              <span
                aria-hidden="true"
                className="text-2xl"
              >
                🎟️
              </span>

              <span className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-yellow-700">
                {savedOffersCount}
              </span>
            </div>

            <h3 className="mt-4 font-semibold text-gray-900 group-hover:text-yellow-700">
              My Pass
            </h3>

            <p className="mt-1 text-sm text-gray-600">
              {savedOffersCount > 0
                ? `Show ${savedOffersCount} saved ${
                    savedOffersCount === 1
                      ? 'deal'
                      : 'deals'
                  } in the deal browser.`
                : 'Save favorite deals for quick access here.'}
            </p>
          </a>

          <a
            href="#offers-expiring"
            className="group rounded-2xl border border-orange-100 bg-orange-50 p-5 transition hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-3">
              <span
                aria-hidden="true"
                className="text-2xl"
              >
                ⏳
              </span>

              <span className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-orange-700">
                {expiringSoonCount}
              </span>
            </div>

            <h3 className="mt-4 font-semibold text-gray-900 group-hover:text-orange-700">
              Expiring Soon
            </h3>

            <p className="mt-1 text-sm text-gray-600">
              {expiringSoonCount > 0
                ? `Show ${expiringSoonCount} ${
                    expiringSoonCount === 1
                      ? 'deal ending'
                      : 'deals ending'
                  } within ${EXPIRING_SOON_DAYS} days.`
                : `No deals end within the next ${EXPIRING_SOON_DAYS} days.`}
            </p>
          </a>

          <a
            href="#offers-all"
            className="group rounded-2xl border border-blue-100 bg-blue-50 p-5 transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-3">
              <span
                aria-hidden="true"
                className="text-2xl"
              >
                🏷️
              </span>

              <span className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-blue-700">
                {availableOffersCount}
              </span>
            </div>

            <h3 className="mt-4 font-semibold text-gray-900 group-hover:text-blue-700">
              Available Offers
            </h3>

            <p className="mt-1 text-sm text-gray-600">
              Browse all {availableOffersCount}{' '}
              active local{' '}
              {availableOffersCount === 1
                ? 'offer'
                : 'offers'}.
            </p>
          </a>
        </div>
      </section>

      <div
        id="my-pass"
        className="scroll-mt-6"
      >
        <CustomerSavedDealsSection
          enrichedOffers={enrichedOffers}
          savedOfferIds={savedOfferIds}
          redeemedOfferIds={redeemedOfferIds}
          redemptionDateByOfferId={
            redemptionDateByOfferId
          }
        />
      </div>

      <div
        id="available-offers"
        className="scroll-mt-6"
      >
        <span
          id="offers-all"
          className="block scroll-mt-6"
          aria-hidden="true"
        />

        <span
          id="offers-saved"
          className="block scroll-mt-6"
          aria-hidden="true"
        />

        <span
          id="offers-expiring"
          className="block scroll-mt-6"
          aria-hidden="true"
        />

        <CustomerAvailableDealsSection
          hasPurchasedPass={hasPurchasedPass}
          enrichedOffers={enrichedOffers}
          savedOfferIds={savedOfferIds}
        />
      </div>

      <div
        id="support-history"
        className="scroll-mt-6"
      >
        <CustomerPassesSection
          purchasedPasses={purchasedPasses}
          organizationById={organizationById}
        />
      </div>
    </div>
  )
}
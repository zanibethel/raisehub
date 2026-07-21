import Link from 'next/link'

import {
  calculateCustomerSavings,
} from '../customer-savings'

import type {
  CustomerDashboardOffer,
} from '@/types/customer-dashboard'

// =============================================================================
// Types
// =============================================================================

type Props = {
  enrichedOffers:
    CustomerDashboardOffer[]
  redeemedOfferIds: Set<string>
}

// =============================================================================
// Currency helpers
// =============================================================================

function formatCurrency(
  value: number
): string {
  return new Intl.NumberFormat(
    undefined,
    {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  ).format(value)
}

// =============================================================================
// Component
// =============================================================================

export default function CustomerSavingsSection({
  enrichedOffers,
  redeemedOfferIds,
}: Props) {
  const savings =
    calculateCustomerSavings({
      offers: enrichedOffers,
      redeemedOfferIds,
    })

  const hasRedemptions =
    savings.redeemedOfferCount > 0

  const hasVerifiedSavings =
    savings.verifiedSavingsAmount > 0

  return (
    <section
      aria-labelledby="customer-savings-heading"
      className="overflow-hidden rounded-3xl border border-green-100 bg-white/90 p-5 shadow-xl backdrop-blur sm:p-8"
    >
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-green-700">
            Pass Value
          </p>

          <h2
            id="customer-savings-heading"
            className="mt-2 break-words text-2xl font-bold leading-tight text-gray-900"
          >
            Your Savings Tracker
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
            Track confirmed fixed-dollar
            savings from offers you have
            redeemed through RaiseHub.
          </p>
        </div>

        <span className="w-fit shrink-0 rounded-full bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700">
          {savings.redeemedOfferCount}{' '}
          {savings.redeemedOfferCount === 1
            ? 'redemption'
            : 'redemptions'}
        </span>
      </div>

      {hasRedemptions ? (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="min-w-0 rounded-2xl border border-green-100 bg-green-50 p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-green-700">
                Verified Savings
              </p>

              <p className="mt-2 break-words text-3xl font-bold leading-tight text-gray-900">
                {formatCurrency(
                  savings.verifiedSavingsAmount
                )}
              </p>

              <p className="mt-2 text-sm leading-6 text-gray-600">
                Based only on redeemed
                offers with a confirmed
                fixed-dollar discount.
              </p>
            </div>

            <div className="min-w-0 rounded-2xl border border-blue-100 bg-blue-50 p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                Valued Redemptions
              </p>

              <p className="mt-2 text-3xl font-bold leading-tight text-gray-900">
                {
                  savings.valuedRedemptionCount
                }
              </p>

              <p className="mt-2 text-sm leading-6 text-gray-600">
                Redemptions with a clear
                dollar amount RaiseHub
                could count safely.
              </p>
            </div>

            <div className="min-w-0 rounded-2xl border border-yellow-100 bg-yellow-50 p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-yellow-800">
                Not Yet Valued
              </p>

              <p className="mt-2 text-3xl font-bold leading-tight text-gray-900">
                {
                  savings.unvaluedRedemptionCount
                }
              </p>

              <p className="mt-2 text-sm leading-6 text-gray-600">
                Redemptions using
                percentage, BOGO, or other
                offers without a verified
                dollar value.
              </p>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-gray-100 bg-gray-50 p-5">
            <p className="break-words font-semibold text-gray-900">
              Why some savings may not be
              included
            </p>

            <p className="mt-2 text-sm leading-6 text-gray-600">
              RaiseHub only totals savings
              when an offer states a clear
              fixed amount such as
              “$10 off.” It does not guess
              the value of percentage
              discounts, free items, BOGO
              offers, or variable-price
              purchases.
            </p>

            {hasVerifiedSavings ? (
              <p className="mt-3 text-sm font-semibold leading-6 text-green-700">
                Your verified total may
                increase as more redeemed
                offers include clear dollar
                values.
              </p>
            ) : (
              <p className="mt-3 text-sm font-semibold leading-6 text-yellow-800">
                Your redemptions are
                recorded, but none currently
                include a fixed-dollar value
                that can be totaled safely.
              </p>
            )}
          </div>

          <Link
            href="#redemption-history"
            className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-green-200 bg-white px-5 py-3 text-center text-sm font-semibold text-green-700 transition hover:bg-green-50 sm:w-auto"
          >
            View Redemption History
          </Link>
        </>
      ) : (
        <div className="mt-6 rounded-3xl border border-green-100 bg-gradient-to-br from-green-50 via-white to-blue-50 p-5 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-wide text-green-700">
            No Savings Recorded Yet
          </p>

          <h3 className="mt-2 break-words text-xl font-bold leading-snug text-gray-900">
            Redeem your first local offer
          </h3>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-600">
            Once you use a RaiseHub offer,
            your redemption will appear
            here. Offers with a clear
            fixed-dollar discount will also
            be added to your verified
            savings total.
          </p>

          <Link
            href="#available-offers"
            className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-green-700 px-5 py-3 text-center text-sm font-semibold text-white transition hover:bg-green-800 sm:w-auto"
          >
            Browse Available Deals
          </Link>
        </div>
      )}
    </section>
  )
}
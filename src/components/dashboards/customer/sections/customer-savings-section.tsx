import Link from 'next/link'

import {
  calculateCustomerSavings,
} from '../customer-savings'

import type {
  CustomerRedemptionEvent,
} from '../customer-redemption-history'
import type {
  CustomerDashboardOffer,
} from '@/types/customer-dashboard'

type Props = {
  enrichedOffers: CustomerDashboardOffer[]
  redemptions: CustomerRedemptionEvent[]
}

function formatCurrency(
  value: number
): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export default function CustomerSavingsSection({
  enrichedOffers,
  redemptions,
}: Props) {
  const savings = calculateCustomerSavings({
    offers: enrichedOffers,
    redemptions,
  })

  const hasRedemptions = savings.redeemedOfferCount > 0
  const hasVerifiedSavings = savings.verifiedSavingsAmount > 0

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
            Track confirmed fixed-dollar savings from every redemption event, including repeat uses of reusable offers.
          </p>
        </div>

        <span className="w-fit shrink-0 rounded-full bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700">
          {savings.redeemedOfferCount} {savings.redeemedOfferCount === 1 ? 'confirmed redemption' : 'confirmed redemptions'}
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
                {formatCurrency(savings.verifiedSavingsAmount)}
              </p>
              <p className="mt-2 text-sm leading-6 text-gray-600">
                Based on each confirmed redemption whose saved benefit states a clear fixed-dollar discount.
              </p>
            </div>

            <div className="min-w-0 rounded-2xl border border-blue-100 bg-blue-50 p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                Valued Redemptions
              </p>
              <p className="mt-2 text-3xl font-bold leading-tight text-gray-900">
                {savings.valuedRedemptionCount}
              </p>
              <p className="mt-2 text-sm leading-6 text-gray-600">
                Confirmed redemption events with a clear dollar amount RaiseHub can count safely.
              </p>
            </div>

            <div className="min-w-0 rounded-2xl border border-yellow-100 bg-yellow-50 p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-yellow-800">
                Not Yet Valued
              </p>
              <p className="mt-2 text-3xl font-bold leading-tight text-gray-900">
                {savings.unvaluedRedemptionCount}
              </p>
              <p className="mt-2 text-sm leading-6 text-gray-600">
                Confirmed uses of percentage, BOGO, free-item, or variable-price offers without a fixed savings amount.
              </p>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-gray-100 bg-gray-50 p-5">
            <p className="break-words font-semibold text-gray-900">
              Why some savings may not be included
            </p>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              RaiseHub only totals savings when the benefit states a clear fixed amount such as “$10 off.” It does not guess the realized savings from percentage discounts, free items, BOGO offers, or variable-price purchases.
            </p>

            {hasVerifiedSavings ? (
              <p className="mt-3 text-sm font-semibold leading-6 text-green-700">
                Reusable deals add another savings event each time a new use is confirmed.
              </p>
            ) : (
              <p className="mt-3 text-sm font-semibold leading-6 text-yellow-800">
                Your confirmed redemptions are recorded, but none currently include a fixed-dollar savings amount that can be totaled safely.
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
            No Confirmed Savings Yet
          </p>
          <h3 className="mt-2 break-words text-xl font-bold leading-snug text-gray-900">
            Redeem your first local offer
          </h3>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-600">
            New redemptions enter the 24-hour review window first. Once confirmed, fixed-dollar benefits are added to your verified savings total.
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

'use client'

import Link from 'next/link'
import InsightCard from '@/components/dashboard/insight-card'

// =============================================================================
// Types
// =============================================================================

type BusinessDashboardCreateOfferProps = {
  activeOffersCount: number
  activeOfferLimit: number
  hasReachedLimit: boolean
  onViewUpgrade: () => void
}

// =============================================================================
// Component
// =============================================================================

export default function BusinessDashboardCreateOffer({
  activeOffersCount,
  activeOfferLimit,
  hasReachedLimit,
  onViewUpgrade,
}: BusinessDashboardCreateOfferProps) {
  const remainingOfferSlots = Math.max(
    activeOfferLimit - activeOffersCount,
    0
  )

  if (hasReachedLimit) {
    return (
      <section className="rounded-2xl border border-yellow-200 bg-yellow-50 p-6">
        <h2 className="font-bold text-yellow-900">
          You are using all {activeOfferLimit} free active offers
        </h2>

        <p className="mt-2 text-sm leading-6 text-yellow-800">
          You can pause an existing offer to create another one. Paid plans
          will later support additional active offers, priority placement, and
          AI marketing credits.
        </p>

        <button
          type="button"
          onClick={onViewUpgrade}
          className="mt-4 rounded-xl bg-yellow-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-yellow-700"
        >
          View Future Upgrade Options
        </button>
      </section>
    )
  }

  return (
    <section>
      <InsightCard
        title={
          activeOffersCount === 0
            ? 'Create your first exclusive offer'
            : `You can publish ${remainingOfferSlots} more free offer${
                remainingOfferSlots === 1 ? '' : 's'
              }`
        }
        description={
          activeOffersCount === 0
            ? 'Use the guided RaiseHub wizard to choose a business goal, review tailored ideas, protect your margins, and publish a members-only offer.'
            : 'A broader mix of strong exclusive offers gives members more reasons to visit your business and increases the value of every fundraiser pass.'
        }
        recommendation={
          activeOffersCount === 0
            ? 'Start with one high-perceived-value offer that costs relatively little to fulfill.'
            : 'Create an offer aimed at a different customer goal than your existing promotions.'
        }
        tone="green"
      />

      <div className="mt-4">
        <Link
          href="/dashboard/offers/new"
          className="inline-flex w-full items-center justify-center rounded-xl bg-green-600 px-6 py-4 font-bold text-white shadow-md transition hover:bg-green-700 sm:w-auto"
        >
          {activeOffersCount === 0
            ? 'Create My First Offer'
            : 'Create Another Exclusive Offer'}
        </Link>
      </div>
    </section>
  )
}
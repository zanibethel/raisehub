'use client'

import Link from 'next/link'
import { useState } from 'react'

// =============================================================================
// Types
// =============================================================================

type BusinessDashboardSnapshotProps = {
  activeOffersCount: number
  activeOfferLimit: number
  totalRedemptions: number
  topOfferTitle: string
  topOfferCount: number
  publishedOffersCount: number
}

// =============================================================================
// Report helpers
// =============================================================================

function formatPercentage(value: number): string {
  return `${Math.round(value)}%`
}

function getPerformanceSummary({
  activeOffersCount,
  publishedOffersCount,
  totalRedemptions,
}: {
  activeOffersCount: number
  publishedOffersCount: number
  totalRedemptions: number
}): {
  title: string
  description: string
  toneClasses: string
} {
  if (publishedOffersCount === 0) {
    return {
      title: 'Publish your first offer',
      description:
        'Performance reporting will begin as soon as this business publishes an offer.',
      toneClasses: 'border-amber-200 bg-amber-50 text-amber-950',
    }
  }

  if (activeOffersCount === 0) {
    return {
      title: 'No offers are currently active',
      description:
        'Review paused or expired offers and reactivate one to keep customer activity moving.',
      toneClasses: 'border-amber-200 bg-amber-50 text-amber-950',
    }
  }

  if (totalRedemptions === 0) {
    return {
      title: 'Offers are active and ready',
      description:
        'No redemptions have been recorded yet. Continue sharing the offers and review their customer visibility.',
      toneClasses: 'border-blue-200 bg-blue-50 text-blue-950',
    }
  }

  return {
    title: 'Customer activity is being recorded',
    description:
      'Use the leading offer and redemption averages below to guide future promotions.',
    toneClasses: 'border-green-200 bg-green-50 text-green-950',
  }
}

// =============================================================================
// Component
// =============================================================================

export default function BusinessDashboardSnapshot({
  activeOffersCount,
  activeOfferLimit,
  totalRedemptions,
  topOfferTitle,
  topOfferCount,
  publishedOffersCount,
}: BusinessDashboardSnapshotProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const offerSlotUtilization =
    activeOfferLimit > 0
      ? Math.min((activeOffersCount / activeOfferLimit) * 100, 100)
      : 0

  const averageRedemptions =
    publishedOffersCount > 0
      ? totalRedemptions / publishedOffersCount
      : 0

  const performanceSummary = getPerformanceSummary({
    activeOffersCount,
    publishedOffersCount,
    totalRedemptions,
  })

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">
            Business performance
          </p>
          <h2 className="mt-1 text-lg font-bold text-gray-950">
            Offer activity at a glance
          </h2>
        </div>

        <button
          type="button"
          onClick={() => setIsExpanded((current) => !current)}
          className="shrink-0 rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200"
          aria-expanded={isExpanded}
        >
          {isExpanded ? 'Hide' : 'Details'}
        </button>
      </div>

      <div className="mt-5 rounded-xl border border-amber-100 bg-amber-50/70 p-4">
        <p className="text-[10px] font-bold uppercase tracking-wide text-amber-700 sm:text-xs">
          Top offer
        </p>
        <div className="mt-1 flex items-end justify-between gap-4">
          <p className="min-w-0 flex-1 break-words text-base font-bold leading-6 text-amber-900 sm:text-lg">
            {topOfferTitle || 'No leading offer yet'}
          </p>
          <p className="shrink-0 text-sm font-semibold text-amber-800">
            {topOfferTitle
              ? `${topOfferCount} use${topOfferCount === 1 ? '' : 's'}`
              : '0 uses'}
          </p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 divide-x divide-gray-200 rounded-xl border border-gray-200 bg-slate-50/70 py-3 text-center">
        <div className="px-2">
          <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500 sm:text-xs">
            Active
          </p>
          <p className="mt-1 text-lg font-bold text-green-700 sm:text-2xl">
            {activeOffersCount}/{activeOfferLimit}
          </p>
        </div>

        <div className="px-2">
          <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500 sm:text-xs">
            Uses
          </p>
          <p className="mt-1 text-lg font-bold text-blue-700 sm:text-2xl">
            {totalRedemptions}
          </p>
        </div>

        <div className="px-2">
          <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500 sm:text-xs">
            Published
          </p>
          <p className="mt-1 text-lg font-bold text-gray-900 sm:text-2xl">
            {publishedOffersCount}
          </p>
        </div>
      </div>

      {isExpanded ? (
        <div className="mt-5 space-y-4 border-t border-gray-200 pt-5">
          <div>
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="font-semibold text-gray-800">Offer capacity</span>
              <span className="text-gray-500">
                {activeOffersCount} of {activeOfferLimit} active
              </span>
            </div>
            <div
              aria-label={`${formatPercentage(offerSlotUtilization)} of active offer capacity used`}
              className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(offerSlotUtilization)}
            >
              <div
                className="h-full rounded-full bg-green-600"
                style={{ width: `${offerSlotUtilization}%` }}
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
                Redemption average
              </p>
              <p className="mt-1 text-xl font-bold text-gray-900">
                {averageRedemptions.toFixed(1)}
              </p>
              <p className="text-sm text-gray-600">per published offer</p>
            </div>

            <div className={`rounded-xl border p-4 ${performanceSummary.toneClasses}`}>
              <p className="text-xs font-bold uppercase tracking-wide opacity-70">
                Recommended focus
              </p>
              <h3 className="mt-1 font-bold">{performanceSummary.title}</h3>
              <p className="mt-1 text-sm leading-6 opacity-80">
                {performanceSummary.description}
              </p>
              <Link
                href="#business-offers"
                className="mt-3 inline-flex text-sm font-semibold underline-offset-4 hover:underline"
              >
                Review business offers
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}

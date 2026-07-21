import Link from 'next/link'

import MetricCard from '@/components/dashboard/metric-card'
import SectionHeader from '@/components/dashboard/section-header'

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
      toneClasses:
        'border-amber-200 bg-amber-50 text-amber-950',
    }
  }

  if (activeOffersCount === 0) {
    return {
      title: 'No offers are currently active',
      description:
        'Review paused or expired offers and reactivate one to keep customer activity moving.',
      toneClasses:
        'border-amber-200 bg-amber-50 text-amber-950',
    }
  }

  if (totalRedemptions === 0) {
    return {
      title: 'Offers are active and ready',
      description:
        'No redemptions have been recorded yet. Continue sharing the offers and review their customer visibility.',
      toneClasses:
        'border-blue-200 bg-blue-50 text-blue-950',
    }
  }

  return {
    title: 'Customer activity is being recorded',
    description:
      'Use the leading offer and redemption averages below to guide future promotions.',
    toneClasses:
      'border-green-200 bg-green-50 text-green-950',
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
  const remainingOfferSlots = Math.max(
    activeOfferLimit - activeOffersCount,
    0
  )

  const offerSlotUtilization =
    activeOfferLimit > 0
      ? Math.min(
          (activeOffersCount / activeOfferLimit) *
            100,
          100
        )
      : 0

  const averageRedemptions =
    publishedOffersCount > 0
      ? totalRedemptions /
        publishedOffersCount
      : 0

  const performanceSummary =
    getPerformanceSummary({
      activeOffersCount,
      publishedOffersCount,
      totalRedemptions,
    })

  return (
    <section>
      <SectionHeader
        title="Business Performance"
        description="Review offer activity, customer usage, and the strongest current promotion."
      />

      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Active Offers"
          value={`${activeOffersCount} / ${activeOfferLimit}`}
          description={
            remainingOfferSlots > 0
              ? `${remainingOfferSlots} free offer slot${
                  remainingOfferSlots === 1
                    ? ''
                    : 's'
                } remaining`
              : 'Free active-offer limit reached'
          }
          tone="green"
        />

        <MetricCard
          label="Total Redemptions"
          value={totalRedemptions}
          description="Verified uses across this business’s offers"
          tone="blue"
        />

        <MetricCard
          label="Top Offer"
          value={topOfferTitle || 'No data yet'}
          description={
            topOfferTitle
              ? `${topOfferCount} redemption${
                  topOfferCount === 1
                    ? ''
                    : 's'
                }`
              : 'A leader will appear after activity begins'
          }
          tone="yellow"
        />

        <MetricCard
          label="Published Offers"
          value={publishedOffersCount}
          description="Includes active, paused, and expired offers"
          tone="slate"
        />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Offer capacity
          </p>

          <div className="mt-3 flex items-end justify-between gap-3">
            <p className="text-2xl font-bold text-gray-900">
              {formatPercentage(
                offerSlotUtilization
              )}
            </p>

            <p className="text-xs text-gray-500">
              {activeOffersCount} of{' '}
              {activeOfferLimit} active
            </p>
          </div>

          <div
            aria-label={`${formatPercentage(
              offerSlotUtilization
            )} of active offer capacity used`}
            className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(
              offerSlotUtilization
            )}
          >
            <div
              className="h-full rounded-full bg-green-600"
              style={{
                width: `${offerSlotUtilization}%`,
              }}
            />
          </div>

          <p className="mt-3 text-sm leading-6 text-gray-600">
            This shows how much of the current
            active-offer allowance is being used.
          </p>
        </article>

        <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Redemption average
          </p>

          <p className="mt-3 text-2xl font-bold text-gray-900">
            {averageRedemptions.toFixed(1)}
          </p>

          <p className="mt-1 text-sm font-medium text-gray-700">
            Redemptions per published offer
          </p>

          <p className="mt-3 text-sm leading-6 text-gray-600">
            Use this as a simple benchmark when
            comparing current and future offers.
          </p>
        </article>

        <article
          className={`rounded-2xl border p-5 ${performanceSummary.toneClasses}`}
        >
          <p className="text-xs font-semibold uppercase tracking-wide opacity-70">
            Recommended focus
          </p>

          <h3 className="mt-3 text-lg font-bold">
            {performanceSummary.title}
          </h3>

          <p className="mt-2 text-sm leading-6 opacity-80">
            {performanceSummary.description}
          </p>

          <Link
            href="#business-offers"
            className="mt-4 inline-flex text-sm font-semibold underline-offset-4 hover:underline"
          >
            Review business offers
          </Link>
        </article>
      </div>
    </section>
  )
}
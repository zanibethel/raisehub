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

  return (
    <section>
      <SectionHeader
        title="Business Snapshot"
        description="A quick view of your active offers and member activity."
      />

      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Active Offers"
          value={`${activeOffersCount} / ${activeOfferLimit}`}
          description={
            remainingOfferSlots > 0
              ? `${remainingOfferSlots} free offer slot${
                  remainingOfferSlots === 1 ? '' : 's'
                } remaining`
              : 'Free active-offer limit reached'
          }
          tone="green"
        />

        <MetricCard
          label="Total Redemptions"
          value={totalRedemptions}
          description="Verified uses across all of your offers"
          tone="blue"
        />

        <MetricCard
          label="Top Offer"
          value={topOfferTitle || 'No data yet'}
          description={`${topOfferCount} redemption${
            topOfferCount === 1 ? '' : 's'
          }`}
          tone="yellow"
        />

        <MetricCard
          label="Published Offers"
          value={publishedOffersCount}
          description="Includes active, paused, and expired offers"
          tone="slate"
        />
      </div>
    </section>
  )
}
import MetricCard from '@/components/dashboard/metric-card'
import SectionHeader from '@/components/dashboard/section-header'
import type { PlatformMetrics } from '@/lib/repositories/platform-analytics-repository'

// =============================================================================
// Types
// =============================================================================

type OwnerAnalyticsSectionProps = {
  metrics: PlatformMetrics | null
}

// =============================================================================
// Component
// =============================================================================

export default function OwnerAnalyticsSection({
  metrics,
}: OwnerAnalyticsSectionProps) {
  return (
    <section>
      <SectionHeader
        title="Platform Overview"
        description="Live totals across all registered accounts and active content."
      />

      {metrics === null ? (
        <p className="mt-4 text-sm text-slate-500">
          Platform metrics could not be loaded.
        </p>
      ) : (
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label="Businesses"
            value={metrics.businessCount}
            description="Registered business accounts"
            tone="green"
          />

          <MetricCard
            label="Organizations"
            value={metrics.organizationCount}
            description="Registered fundraising organizations"
            tone="blue"
          />

          <MetricCard
            label="Active Campaigns"
            value={metrics.activeCampaignCount}
            description="Currently running fundraising campaigns"
            tone="yellow"
          />

          <MetricCard
            label="Active Offers"
            value={metrics.activeOfferCount}
            description="Live business offers available to customers"
            tone="slate"
          />
        </div>
      )}
    </section>
  )
}

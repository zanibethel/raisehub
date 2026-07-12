import MetricCard from '@/components/dashboard/metric-card'
import SectionHeader from '@/components/dashboard/section-header'

// =============================================================================
// Types
// =============================================================================

type OrganizationAnalyticsSectionProps = {
  totalCampaigns: number
  activeSellerCount: number
}

// =============================================================================
// Component
// =============================================================================

export default function OrganizationAnalyticsSection({
  totalCampaigns,
  activeSellerCount,
}: OrganizationAnalyticsSectionProps) {
  return (
    <section>
      <SectionHeader
        title="Fundraising Activity"
        description="Campaign and seller engagement across your organization."
      />

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <MetricCard
          label="Total Campaigns"
          value={totalCampaigns}
          description="All campaigns created by your organization"
          tone="blue"
        />

        <MetricCard
          label="Active Sellers"
          value={activeSellerCount}
          description={
            activeSellerCount === 0
              ? 'No sellers have sold passes yet'
              : `${activeSellerCount} seller${activeSellerCount === 1 ? '' : 's'} with at least one pass sold`
          }
          tone="green"
        />
      </div>
    </section>
  )
}

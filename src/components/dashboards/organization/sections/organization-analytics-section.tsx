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
// Helpers
// =============================================================================

function getSellerDescription(activeSellerCount: number): string {
  if (activeSellerCount === 0) {
    return 'No sellers have recorded purchases yet'
  }

  return `Distinct sellers with at least one recorded purchase`
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
          label="Sellers With Sales"
          value={activeSellerCount}
          description={getSellerDescription(activeSellerCount)}
          tone="green"
        />
      </div>
    </section>
  )
}

import MetricCard from '@/components/dashboard/metric-card'

// =============================================================================
// Types
// =============================================================================

type OrganizationSummarySectionProps = {
  activeCampaigns: number
  totalFundsRaised: number
  totalSellers: number
  totalSupporters: number
}

// =============================================================================
// Component
// =============================================================================

export default function OrganizationSummarySection({
  activeCampaigns,
  totalFundsRaised,
  totalSellers,
  totalSupporters,
}: OrganizationSummarySectionProps) {
  return (
    <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <MetricCard
        label="Active Campaigns"
        value={activeCampaigns}
        description="Running now"
        tone="blue"
      />

      <MetricCard
        label="Recorded Earnings"
        value={`$${totalFundsRaised.toLocaleString()}`}
        description="Across recorded purchases"
        tone="green"
      />

      <MetricCard
        label="Active Sellers"
        value={totalSellers}
        description="With recorded sales"
        tone="yellow"
      />

      <MetricCard
        label="Supporters"
        value={totalSupporters}
        description="Distinct recorded buyers"
      />
    </section>
  )
}

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
    <section className="grid gap-4 md:grid-cols-4">
      <MetricCard
        label="Active Campaigns"
        value={activeCampaigns}
        description="Currently running campaigns"
        tone="blue"
      />

      <MetricCard
        label="Total Funds Raised"
        value={`$${totalFundsRaised.toLocaleString()}`}
        description="Total organization earnings"
        tone="green"
      />

      <MetricCard
        label="Total Sellers"
        value={totalSellers}
        description="Distinct sellers with campaign sales"
        tone="yellow"
      />

      <MetricCard
        label="Total Supporters"
        value={totalSupporters}
        description="Supporters who purchased campaign passes"
      />
    </section>
  )
}
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
        label="Recorded Earnings"
        value={`$${totalFundsRaised.toLocaleString()}`}
        description="Organization earnings across recorded purchases"
        tone="green"
      />

      <MetricCard
        label="Sellers With Recorded Sales"
        value={totalSellers}
        description="Distinct seller names on recorded purchases"
        tone="yellow"
      />

      <MetricCard
        label="Supporters With Recorded Purchases"
        value={totalSupporters}
        description="Distinct buyers across recorded purchases"
      />
    </section>
  )
}
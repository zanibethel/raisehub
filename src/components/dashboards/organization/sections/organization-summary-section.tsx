// =============================================================================
// Types
// =============================================================================

type OrganizationSummarySectionProps = {
  totalPassesSold: number
  totalEarnings: number
  activeCampaigns: number
  totalGoal: number
}

// =============================================================================
// Component
// =============================================================================

export default function OrganizationSummarySection({
  totalPassesSold,
  totalEarnings,
  activeCampaigns,
  totalGoal,
}: OrganizationSummarySectionProps) {
  return (
    <section className="grid gap-4 md:grid-cols-4">
      <div className="rounded-2xl border border-green-100 bg-green-50 p-6 shadow-xl">
        <p className="text-sm text-green-600">Passes Sold</p>

        <p className="mt-2 text-3xl font-bold text-green-800">
          {totalPassesSold}
        </p>
      </div>

      <div className="rounded-2xl border border-purple-100 bg-purple-50 p-6 shadow-xl">
        <p className="text-sm text-purple-600">
          Organization Earned
        </p>

        <p className="mt-2 text-3xl font-bold text-purple-800">
          ${totalEarnings.toLocaleString()}
        </p>
      </div>

      <div className="rounded-2xl border border-blue-100 bg-white/90 p-6 shadow-xl backdrop-blur">
        <p className="text-sm text-blue-600">
          Active Campaigns
        </p>

        <p className="mt-2 text-3xl font-bold text-blue-700">
          {activeCampaigns}
        </p>
      </div>

      <div className="rounded-2xl border border-blue-100 bg-white/90 p-6 shadow-xl backdrop-blur">
        <p className="text-sm text-blue-600">
          Total Goals
        </p>

        <p className="mt-2 text-3xl font-bold text-blue-700">
          ${totalGoal.toLocaleString()}
        </p>
      </div>
    </section>
  )
}
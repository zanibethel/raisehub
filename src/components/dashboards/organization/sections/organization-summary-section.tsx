type OrganizationSummarySectionProps = {
  activeCampaigns: number
  totalFundsRaised: number
  totalSellers: number
  totalSupporters: number
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}

export default function OrganizationSummarySection({
  activeCampaigns,
  totalFundsRaised,
  totalSellers,
  totalSupporters,
}: OrganizationSummarySectionProps) {
  const metrics = [
    { label: 'Active', value: activeCampaigns, tone: 'text-blue-700' },
    { label: 'Earnings', value: formatCurrency(totalFundsRaised), tone: 'text-green-700' },
    { label: 'Sellers', value: totalSellers, tone: 'text-amber-700' },
    { label: 'Supporters', value: totalSupporters, tone: 'text-gray-900' },
  ]

  return (
    <section className="rounded-2xl border border-gray-200 bg-white/90 p-4 shadow-sm sm:p-5">
      <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
        Campaign activity
      </p>

      <div className="mt-3 grid grid-cols-2 gap-y-4 divide-gray-200 sm:grid-cols-4 sm:divide-x">
        {metrics.map((metric) => (
          <div key={metric.label} className="px-2 text-center sm:px-4">
            <p className={`text-xs font-semibold sm:text-sm ${metric.tone}`}>
              {metric.label}
            </p>
            <p className="mt-1 text-xl font-bold text-gray-950 sm:text-2xl">
              {metric.value}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}

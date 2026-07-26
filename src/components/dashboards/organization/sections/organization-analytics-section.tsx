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
    <section aria-labelledby="fundraising-activity-heading">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <div>
          <h3
            id="fundraising-activity-heading"
            className="text-base font-bold text-gray-950"
          >
            Fundraising activity
          </h3>
          <p className="mt-1 text-sm text-gray-600">
            Campaign activity and recorded seller attribution
          </p>
        </div>

        <dl className="flex items-center gap-5 text-sm sm:gap-7">
          <div className="flex items-baseline gap-2">
            <dt className="font-medium text-gray-600">Campaigns</dt>
            <dd className="text-lg font-bold text-blue-700">
              {totalCampaigns.toLocaleString()}
            </dd>
          </div>

          <div className="flex items-baseline gap-2 border-l border-gray-200 pl-5 sm:pl-7">
            <dt className="font-medium text-gray-600">Sellers credited</dt>
            <dd className="text-lg font-bold text-green-700">
              {activeSellerCount.toLocaleString()}
            </dd>
          </div>
        </dl>
      </div>
    </section>
  )
}

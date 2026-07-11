import Link from 'next/link'

// =============================================================================
// Types
// =============================================================================

type Campaign = {
  id: string
  name: string
  goal_amount: number | null
  raised_amount: number | null
  is_active: boolean
}

type Props = {
  campaigns: Campaign[]
}

// =============================================================================
// Component
// =============================================================================

export default function OrganizationCampaignsSection({
  campaigns,
}: Props) {
  return (
    <section className="rounded-3xl border border-blue-100 bg-white/90 p-8 shadow-xl backdrop-blur">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-blue-700">
          Campaigns
        </h2>

        <Link
          href="/campaigns/new"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          New Campaign
        </Link>
      </div>

      <div className="mt-6 space-y-4">
        {campaigns.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 p-8 text-center text-gray-500">
            No campaigns created yet.
          </div>
        ) : (
          campaigns.map((campaign) => {
            const goal = campaign.goal_amount ?? 0
            const raised = campaign.raised_amount ?? 0

            const percent =
              goal > 0
                ? Math.min((raised / goal) * 100, 100)
                : 0

            return (
              <div
                key={campaign.id}
                className="rounded-2xl border border-blue-100 p-5"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">
                      {campaign.name}
                    </h3>

                    <p className="mt-1 text-sm text-gray-500">
                      ${raised.toLocaleString()} of $
                      {goal.toLocaleString()}
                    </p>
                  </div>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      campaign.is_active
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {campaign.is_active
                      ? 'Active'
                      : 'Inactive'}
                  </span>
                </div>

                <div className="mt-4 h-2 rounded-full bg-gray-200">
                  <div
                    className="h-2 rounded-full bg-blue-600"
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
            )
          })
        )}
      </div>
    </section>
  )
}
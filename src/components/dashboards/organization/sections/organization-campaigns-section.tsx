import Link from 'next/link'

import ArchiveCampaignButton from '@/app/components/archive-campaign-button'
import CreateCampaignForm from '@/app/components/create-campaign-form'
import ShareCampaignButton from '@/app/components/share-campaign-button'

// =============================================================================
// Types
// =============================================================================

type Campaign = {
  id: string
  name: string
  description: string | null
  pass_price: number | null
  goal_amount: number | null
  status: string
}

type CampaignMetrics = {
  sold: number
  gross: number
  fees: number
  earnings: number
}

type OrganizationCampaignsSectionProps = {
  campaigns: Campaign[]
  metricsByCampaign: Record<string, CampaignMetrics>
}

// =============================================================================
// Component
// =============================================================================

export default function OrganizationCampaignsSection({
  campaigns,
  metricsByCampaign,
}: OrganizationCampaignsSectionProps) {
  return (
    <>
      <CreateCampaignForm />

      <section className="rounded-2xl border border-blue-100 bg-white/90 p-6 shadow-xl backdrop-blur">
        <h2 className="text-lg font-semibold text-blue-700">
          My Campaigns
        </h2>

        {campaigns.length > 0 ? (
          <div className="mt-4 grid gap-4">
            {campaigns.map((campaign) => {
              const metrics = metricsByCampaign[campaign.id] ?? {
                sold: 0,
                gross: 0,
                fees: 0,
                earnings: 0,
              }

              const goal = Number(campaign.goal_amount ?? 0)

              const progress =
                goal > 0
                  ? Math.min((metrics.earnings / goal) * 100, 100)
                  : 0

              return (
                <article
                  key={campaign.id}
                  className="rounded-xl border border-blue-100 bg-blue-50 p-4"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">
                        {campaign.name}
                      </h3>

                      <p className="mt-1 text-sm text-gray-600">
                        {campaign.description || 'No description yet.'}
                      </p>

                      <p className="mt-2 text-sm text-gray-600">
                        Pass price: ${Number(campaign.pass_price ?? 0)}
                      </p>

                      <p className="text-sm text-gray-600">
                        Goal: ${goal.toLocaleString()}
                      </p>

                      <div className="mt-4 space-y-2">
                        <p className="text-sm text-gray-700">
                          Sold:{' '}
                          <span className="font-semibold">
                            {metrics.sold}
                          </span>
                        </p>

                        <p className="text-sm text-gray-700">
                          Earned:{' '}
                          <span className="font-semibold">
                            ${metrics.earnings.toLocaleString()}
                          </span>
                        </p>

                        <div className="h-2 w-full rounded-full bg-gray-200">
                          <div
                            className="h-2 rounded-full bg-blue-600 transition-all"
                            style={{ width: `${progress}%` }}
                          />
                        </div>

                        <p className="text-xs text-gray-500">
                          {progress.toFixed(1)}% of $
                          {goal.toLocaleString()} goal
                        </p>
                      </div>

                      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
                        <Link
                          href={`/campaigns/${campaign.id}`}
                          className="rounded-lg bg-blue-600 px-4 py-2 text-center text-sm font-medium text-white hover:bg-blue-700"
                        >
                          View public campaign page
                        </Link>

                        <ShareCampaignButton
                          campaignId={campaign.id}
                          campaignName={campaign.name}
                        />

                        <ArchiveCampaignButton
                          campaignId={campaign.id}
                          campaignName={campaign.name}
                        />
                      </div>
                    </div>

                    <span className="rounded-full bg-blue-600 px-3 py-1 text-xs font-medium capitalize text-white">
                      {campaign.status}
                    </span>
                  </div>
                </article>
              )
            })}
          </div>
        ) : (
          <p className="mt-4 text-sm text-gray-600">
            No campaigns created yet.
          </p>
        )}
      </section>
    </>
  )
}
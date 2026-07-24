import Link from 'next/link'

import CampaignStatusActionButton from '@/app/components/campaign-status-action-button'
import CreateCampaignForm from '@/app/components/create-campaign-form'
import ShareCampaignButton from '@/app/components/share-campaign-button'
import SubmitCampaignForReviewButton from '@/app/components/submit-campaign-for-review-button'
import CampaignStatusBadge from '@/components/dashboard/campaign-status-badge'
import EmptyState from '@/components/dashboard/empty-state'
import SectionHeader from '@/components/dashboard/section-header'

type Campaign = {
  id: string
  name: string
  goal_amount: number | null
  status: string
  review_status?: string | null
  created_at: string | null
}

type CampaignMetrics = {
  supporterCount: number
  sellerCount: number
  gross: number
  fees: number
  amountRaised: number
}

type CampaignCreationPricing = {
  passPrice: number
  platformFeePercent: number
  organizationPassEarnings: number
  usedFallback: boolean
}

type OrganizationCampaignsSectionProps = {
  campaigns: Campaign[]
  metricsByCampaign: Record<string, CampaignMetrics>
  campaignCreationPricing: CampaignCreationPricing
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}

function formatDate(value: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString()
}

function reviewLabel(status?: string | null) {
  switch (status) {
    case 'pending':
      return 'Review pending'
    case 'approved':
      return 'Review approved'
    case 'changes_requested':
      return 'Changes requested'
    case 'rejected':
      return 'Review rejected'
    case 'suspended':
      return 'Review suspended'
    default:
      return 'Review not submitted'
  }
}

function ReviewBadge({ status }: { status?: string | null }) {
  const approved = status === 'approved'
  const pending = status === 'pending'

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
        approved
          ? 'bg-green-100 text-green-800'
          : pending
            ? 'bg-amber-100 text-amber-800'
            : 'bg-slate-100 text-slate-700'
      }`}
    >
      {reviewLabel(status)}
    </span>
  )
}

export default function OrganizationCampaignsSection({
  campaigns,
  metricsByCampaign,
  campaignCreationPricing,
}: OrganizationCampaignsSectionProps) {
  return (
    <>
      <CreateCampaignForm id="create-campaign" pricing={campaignCreationPricing} />

      <section className="rounded-2xl border border-blue-100 bg-white/90 p-6 shadow-xl backdrop-blur">
        <SectionHeader
          title="Campaign Management"
          description="Create drafts, complete payout setup, submit campaigns for review, and publish only after approval."
        />

        <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">
          Draft campaigns are private. Complete Stripe payout verification and RaiseHub review before publishing or sharing.
        </div>

        {campaigns.length > 0 ? (
          <div className="mt-5 space-y-4">
            <div className="overflow-x-auto">
              <table className="hidden min-w-full divide-y divide-blue-100 md:table">
                <thead>
                  <tr className="text-left text-xs font-bold uppercase tracking-[0.08em] text-blue-700">
                    <th className="px-3 py-3">Campaign</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3">Review</th>
                    <th className="px-3 py-3">Goal</th>
                    <th className="px-3 py-3">Recorded</th>
                    <th className="px-3 py-3">Created</th>
                    <th className="px-3 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-blue-50">
                  {campaigns.map((campaign) => {
                    const metrics = metricsByCampaign[campaign.id] ?? {
                      supporterCount: 0,
                      sellerCount: 0,
                      gross: 0,
                      fees: 0,
                      amountRaised: 0,
                    }

                    return (
                      <tr key={campaign.id} className="align-top">
                        <td className="px-3 py-4">
                          <p className="font-semibold text-gray-900">{campaign.name}</p>
                          <p className="mt-1 text-xs text-gray-500">
                            {metrics.supporterCount} supporters · {metrics.sellerCount} sellers
                          </p>
                        </td>
                        <td className="px-3 py-4">
                          <CampaignStatusBadge status={campaign.status} />
                        </td>
                        <td className="px-3 py-4">
                          <ReviewBadge status={campaign.review_status} />
                        </td>
                        <td className="px-3 py-4 text-sm font-medium text-gray-700">
                          {formatCurrency(Number(campaign.goal_amount ?? 0))}
                        </td>
                        <td className="px-3 py-4 text-sm font-medium text-gray-700">
                          {formatCurrency(metrics.amountRaised)}
                        </td>
                        <td className="px-3 py-4 text-sm text-gray-600">
                          {formatDate(campaign.created_at)}
                        </td>
                        <td className="px-3 py-4">
                          <CampaignActions
                            campaignId={campaign.id}
                            campaignName={campaign.name}
                            campaignStatus={campaign.status}
                            reviewStatus={campaign.review_status}
                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {campaigns.map((campaign) => {
              const metrics = metricsByCampaign[campaign.id] ?? {
                supporterCount: 0,
                sellerCount: 0,
                gross: 0,
                fees: 0,
                amountRaised: 0,
              }

              return (
                <article
                  key={campaign.id}
                  className="rounded-xl border border-blue-100 bg-blue-50 p-4 md:hidden"
                >
                  <h3 className="font-semibold text-gray-900">{campaign.name}</h3>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <CampaignStatusBadge status={campaign.status} />
                    <ReviewBadge status={campaign.review_status} />
                  </div>

                  <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-lg bg-white/70 p-3">
                      <dt className="text-xs uppercase tracking-wide text-gray-500">Goal</dt>
                      <dd className="mt-1 font-semibold text-gray-800">
                        {formatCurrency(Number(campaign.goal_amount ?? 0))}
                      </dd>
                    </div>
                    <div className="rounded-lg bg-white/70 p-3">
                      <dt className="text-xs uppercase tracking-wide text-gray-500">Recorded</dt>
                      <dd className="mt-1 font-semibold text-gray-800">
                        {formatCurrency(metrics.amountRaised)}
                      </dd>
                    </div>
                    <div className="rounded-lg bg-white/70 p-3">
                      <dt className="text-xs uppercase tracking-wide text-gray-500">Sellers</dt>
                      <dd className="mt-1 font-semibold text-gray-800">{metrics.sellerCount}</dd>
                    </div>
                    <div className="rounded-lg bg-white/70 p-3">
                      <dt className="text-xs uppercase tracking-wide text-gray-500">Created</dt>
                      <dd className="mt-1 font-semibold text-gray-800">
                        {formatDate(campaign.created_at)}
                      </dd>
                    </div>
                  </dl>

                  <div className="mt-4">
                    <CampaignActions
                      campaignId={campaign.id}
                      campaignName={campaign.name}
                      campaignStatus={campaign.status}
                      reviewStatus={campaign.review_status}
                      stacked
                    />
                  </div>
                </article>
              )
            })}
          </div>
        ) : (
          <div className="mt-4">
            <EmptyState
              title="No campaigns yet"
              description="Create a private draft, complete verification, and submit it for review before publishing."
              actionLabel="Create Campaign"
              actionHref="#create-campaign"
            />
          </div>
        )}
      </section>
    </>
  )
}

type CampaignActionsProps = {
  campaignId: string
  campaignName: string
  campaignStatus: string
  reviewStatus?: string | null
  stacked?: boolean
}

function CampaignActions({
  campaignId,
  campaignName,
  campaignStatus,
  reviewStatus,
  stacked = false,
}: CampaignActionsProps) {
  const status = campaignStatus.toLowerCase()
  const isDraft = status === 'draft'
  const isArchived = status === 'archived'
  const isCompleted = status === 'completed'
  const canPause = status === 'active'
  const canResume = status === 'paused'
  const canArchive = !isArchived
  const canSubmit = isDraft && (!reviewStatus || reviewStatus === 'not_submitted' || reviewStatus === 'changes_requested')

  return (
    <div className={`flex flex-wrap gap-2 ${stacked ? 'flex-col items-stretch' : 'items-center'}`}>
      <Link
        href={`/campaigns/${campaignId}`}
        className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-center text-xs font-semibold text-blue-700 hover:bg-blue-100"
      >
        View
      </Link>

      {isDraft ? (
        <span className="rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-center text-xs font-semibold text-slate-500">
          Sharing available after publishing
        </span>
      ) : (
        <ShareCampaignButton campaignId={campaignId} campaignName={campaignName} />
      )}

      {!isArchived && !isCompleted ? (
        <Link
          href={`/dashboard/campaigns/${campaignId}/edit`}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-center text-xs font-semibold text-slate-700 hover:bg-slate-100"
        >
          Edit
        </Link>
      ) : null}

      {canSubmit ? (
        <SubmitCampaignForReviewButton
          campaignId={campaignId}
          campaignName={campaignName}
        />
      ) : null}

      {isDraft ? (
        <p className="w-full text-xs text-gray-600">
          Payout verification is also required before this campaign can publish.
        </p>
      ) : null}

      {canPause ? (
        <CampaignStatusActionButton
          campaignId={campaignId}
          campaignName={campaignName}
          status="paused"
          label="Pause"
          pendingLabel="Pausing..."
          className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-100"
          confirmMessage={`Pause "${campaignName}"? Supporters will no longer be able to purchase until you resume it.`}
        />
      ) : null}

      {canResume ? (
        <CampaignStatusActionButton
          campaignId={campaignId}
          campaignName={campaignName}
          status="active"
          label="Resume"
          pendingLabel="Resuming..."
          className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs font-semibold text-green-700 hover:bg-green-100"
        />
      ) : null}

      {canArchive ? (
        <CampaignStatusActionButton
          campaignId={campaignId}
          campaignName={campaignName}
          status="archived"
          label="Archive"
          pendingLabel="Archiving..."
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100"
          confirmMessage={`Archive "${campaignName}"? This keeps campaign history but hides it from active campaign lists.`}
        />
      ) : null}
    </div>
  )
}

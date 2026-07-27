import Link from 'next/link'

import CampaignStatusActionButton from '@/app/components/campaign-status-action-button'
import CreateCampaignForm from '@/app/components/create-campaign-form'
import ShareCampaignButton from '@/app/components/share-campaign-button'
import SubmitCampaignForReviewButton from '@/app/components/submit-campaign-for-review-button'
import CampaignStatusBadge from '@/components/dashboard/campaign-status-badge'
import EmptyState from '@/components/dashboard/empty-state'
import type { CampaignPublishingEligibility } from '@/lib/campaign-publishing/types'

type Campaign = {
  id: string
  name: string
  goal_amount: number | null
  status: string
  review_status?: string | null
  created_at: string | null
  publishingEligibility: CampaignPublishingEligibility
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
  organizationId: string | null
  campaigns: Campaign[]
  metricsByCampaign: Record<string, CampaignMetrics>
  campaignCreationPricing: CampaignCreationPricing
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
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

function CreateCampaignCard({
  organizationId,
  campaignCreationPricing,
  hasExistingCampaign,
}: {
  organizationId: string | null
  campaignCreationPricing: CampaignCreationPricing
  hasExistingCampaign: boolean
}) {
  return (
    <details
      id="create-campaign"
      className="group scroll-mt-6 rounded-2xl border border-blue-100 bg-white/90 shadow-sm backdrop-blur"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 sm:px-6">
        <div>
          <p className="font-bold text-gray-900">
            {hasExistingCampaign ? 'Create another campaign' : 'Create your first campaign'}
          </p>
          <p className="mt-1 text-sm text-gray-600">
            {hasExistingCampaign
              ? 'Start a new draft when you are ready. Your current campaign stays the priority.'
              : 'Open the form to set your goal, dates, and review the managed pricing.'}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 group-open:hidden">
          Open
        </span>
        <span className="hidden shrink-0 rounded-full bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 group-open:inline">
          Close
        </span>
      </summary>
      <div className="border-t border-blue-100 p-5 sm:p-6">
        <CreateCampaignForm organizationId={organizationId} pricing={campaignCreationPricing} />
      </div>
    </details>
  )
}

export default function OrganizationCampaignsSection({
  organizationId,
  campaigns,
  metricsByCampaign,
  campaignCreationPricing,
}: OrganizationCampaignsSectionProps) {
  const hasExistingCampaign = campaigns.length > 0
  const activeCount = campaigns.filter(
    (campaign) => campaign.status.toLowerCase() === 'active'
  ).length
  const inReviewCount = campaigns.filter(
    (campaign) => campaign.review_status === 'pending'
  ).length
  const draftCount = campaigns.filter(
    (campaign) =>
      campaign.status.toLowerCase() === 'draft' && campaign.review_status !== 'pending'
  ).length

  return (
    <div className="space-y-6">
      {!hasExistingCampaign ? (
        <CreateCampaignCard
          organizationId={organizationId}
          campaignCreationPricing={campaignCreationPricing}
          hasExistingCampaign={false}
        />
      ) : null}

      <details className="group rounded-2xl border border-blue-100 bg-white/90 shadow-xl backdrop-blur">
        <summary className="cursor-pointer list-none px-5 py-4 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-lg font-bold text-gray-900">Campaign Management</p>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-sm text-gray-700">
                <span>
                  <strong className="text-green-700">{activeCount}</strong> active
                </span>
                <span>
                  <strong className="text-amber-700">{inReviewCount}</strong> in review
                </span>
                <span>
                  <strong className="text-slate-700">{draftCount}</strong> drafts
                </span>
              </div>
            </div>
            <span className="shrink-0 rounded-full bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 group-open:hidden">
              Manage
            </span>
            <span className="hidden shrink-0 rounded-full bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 group-open:inline">
              Hide
            </span>
          </div>
        </summary>

        <div className="border-t border-blue-100 p-5 sm:p-6">
          <p className="text-sm text-gray-600">
            Complete payout setup, submit campaigns for review, and publish only after approval.
          </p>
          <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">
            Draft campaigns are private. Campaign readiness below uses the same checks enforced when
            publishing.
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
                              eligibility={campaign.publishingEligibility}
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
                        eligibility={campaign.publishingEligibility}
                        compactGrid
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
              />
            </div>
          )}
        </div>
      </details>

      {hasExistingCampaign ? (
        <CreateCampaignCard
          organizationId={organizationId}
          campaignCreationPricing={campaignCreationPricing}
          hasExistingCampaign
        />
      ) : null}
    </div>
  )
}

type CampaignActionsProps = {
  campaignId: string
  campaignName: string
  campaignStatus: string
  reviewStatus?: string | null
  eligibility: CampaignPublishingEligibility
  compactGrid?: boolean
}

function CampaignActions({
  campaignId,
  campaignName,
  campaignStatus,
  reviewStatus,
  eligibility,
  compactGrid = false,
}: CampaignActionsProps) {
  const status = campaignStatus.toLowerCase()
  const isDraft = status === 'draft'
  const isPaused = status === 'paused'
  const isArchived = status === 'archived'
  const isCompleted = status === 'completed'
  const isPublic = status === 'active'
  const canPause = status === 'active'
  const canResume = isPaused && eligibility.canPublish
  const canArchive = !isArchived
  const canSubmit =
    isDraft &&
    (!reviewStatus || reviewStatus === 'not_submitted' || reviewStatus === 'changes_requested')
  const viewHref = isPublic
    ? `/campaigns/${campaignId}`
    : `/dashboard/campaigns/${campaignId}/edit`
  const viewLabel = isPublic ? 'View public page' : 'Manage campaign'
  const actionClass = compactGrid
    ? 'min-h-10 w-full justify-center rounded-lg px-2.5 py-2 text-center text-xs font-semibold'
    : 'rounded-lg px-3 py-2 text-center text-xs font-semibold'
  const showEligibilityGuidance = (isDraft || isPaused) && !eligibility.canPublish

  return (
    <div className={compactGrid ? 'grid grid-cols-2 gap-2 [&>*]:min-w-0' : 'flex flex-wrap items-center gap-2'}>
      {isDraft && eligibility.canPublish ? (
        <CampaignStatusActionButton
          campaignId={campaignId}
          campaignName={campaignName}
          status="active"
          label="Publish campaign"
          pendingLabel="Publishing..."
          className={`${actionClass} bg-blue-600 text-white hover:bg-blue-700 ${compactGrid ? 'col-span-2' : ''}`}
          confirmMessage={`Publish "${campaignName}"? This will make the campaign available to supporters.`}
        />
      ) : null}

      <Link
        href={viewHref}
        className={`${actionClass} border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100`}
      >
        {viewLabel}
      </Link>

      {isDraft ? (
        <span
          className={`${actionClass} flex items-center border border-slate-200 bg-slate-100 text-slate-500`}
        >
          Share after publishing
        </span>
      ) : (
        <div className={compactGrid ? '[&>button]:min-h-10 [&>button]:w-full [&>button]:px-2.5 [&>button]:py-2 [&>button]:text-xs' : ''}>
          <ShareCampaignButton campaignId={campaignId} campaignName={campaignName} />
        </div>
      )}

      {isPublic && !isArchived && !isCompleted ? (
        <Link
          href={`/dashboard/campaigns/${campaignId}/edit`}
          className={`${actionClass} border border-slate-200 bg-white text-slate-700 hover:bg-slate-100`}
        >
          Edit campaign
        </Link>
      ) : null}

      {canSubmit ? (
        <div className={compactGrid ? '[&>button]:min-h-10 [&>button]:w-full [&>button]:px-2.5 [&>button]:py-2 [&>button]:text-xs' : ''}>
          <SubmitCampaignForReviewButton campaignId={campaignId} campaignName={campaignName} />
        </div>
      ) : null}

      {canPause ? (
        <CampaignStatusActionButton
          campaignId={campaignId}
          campaignName={campaignName}
          status="paused"
          label="Pause campaign"
          pendingLabel="Pausing..."
          className={`${actionClass} border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100`}
          confirmMessage={`Pause "${campaignName}"? Supporters will no longer be able to purchase until you resume it.`}
        />
      ) : null}

      {canResume ? (
        <CampaignStatusActionButton
          campaignId={campaignId}
          campaignName={campaignName}
          status="active"
          label="Resume campaign"
          pendingLabel="Resuming..."
          className={`${actionClass} border border-green-200 bg-green-50 text-green-700 hover:bg-green-100`}
        />
      ) : null}

      {canArchive ? (
        <CampaignStatusActionButton
          campaignId={campaignId}
          campaignName={campaignName}
          status="archived"
          label="Archive campaign"
          pendingLabel="Archiving..."
          className={`${actionClass} border border-red-200 bg-red-50 text-red-700 hover:bg-red-100`}
          confirmMessage={`Archive "${campaignName}"? This keeps campaign history but hides it from active campaign lists.`}
        />
      ) : null}

      {isDraft && eligibility.canPublish ? (
        <p className={`${compactGrid ? 'col-span-2' : 'w-full'} rounded-lg bg-green-50 p-3 text-xs font-medium text-green-800`}>
          Ready to publish. Review, profile, and payout checks are complete.
        </p>
      ) : null}

      {showEligibilityGuidance ? (
        <div
          className={`${compactGrid ? 'col-span-2' : 'w-full'} rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900`}
        >
          <p className="font-semibold">What to do next: {eligibility.nextAction.label}</p>
          <ul className="mt-2 space-y-1">
            {eligibility.blockingReasons.map((blocker) => (
              <li key={blocker.code}>• {blocker.message}</li>
            ))}
          </ul>
          {eligibility.nextAction.href ? (
            <Link
              href={eligibility.nextAction.href}
              className="mt-2 inline-flex font-semibold text-blue-700 hover:underline"
            >
              {eligibility.nextAction.label}
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

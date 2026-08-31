'use client'

import Link from 'next/link'
import { useState } from 'react'

import UpgradePlanModal from '@/app/components/upgrade-plan-modal'
import { WorkspaceMetricStrip } from '@/components/workspace/workspace-shell'
import { WorkspaceModule } from '@/components/workspace/workspace-module'
import { getOfferStatus } from '@/lib/rules/offer-status'

import BusinessDashboardCreateOffer from './business-dashboard-create-offer'
import BusinessDashboardQuickActions from './business-dashboard-quick-actions'
import BusinessDashboardSnapshot from './business-dashboard-snapshot'
import BusinessExportTools, { type BusinessExportRow } from './business-export-tools'
import BusinessLifecycleBanner from './business-lifecycle-banner'
import BusinessRedemptionRejectButton from './business-redemption-reject-button'
import BusinessDashboardOffersSection from './offers/offers-section'
import BusinessRedemptionSettingsSection from './sections/business-redemption-settings-section'

import type {
  BusinessOffer,
  OfferRedemption,
} from '@/app/components/business-offer-card'
import type { BusinessWorkspaceView, RedemptionRow } from './business-dashboard'

type BusinessProfile = {
  business_name: string | null
  phone: string | null
  address: string | null
  google_maps_url: string | null
  logo_url?: string | null
  website_url?: string | null
  display_name?: string | null
  redemption_method?: string | null
}

type BusinessReportRedemption = OfferRedemption & {
  offer_title_snapshot?: string | null
  benefit_snapshot?: string | null
  customer_value_snapshot?: number | string | null
  usage_rule_snapshot?: string | null
  confirmation_method?: string | null
  status?: string | null
}

type RedemptionStatusFilter =
  | 'all'
  | 'pending'
  | 'confirmed'
  | 'rejected'
  | 'voided'

type RedemptionDateFilter = 'all' | '7d' | '30d' | '90d'

export type BusinessDashboardContentProps = {
  view?: BusinessWorkspaceView
  profile: BusinessProfile | null
  offers: BusinessOffer[]
  totalRedemptions: number
  uniqueSupporters: number
  pendingRedemptionCount: number
  rejectedRedemptionCount: number
  totalCustomerValueDelivered: number
  redemptionActivity: RedemptionRow[]
  activeOffersCount: number
  activeOfferLimit: number
  hasReachedLimit: boolean
  isGrowthPlan: boolean
  topOfferTitle: string
  topOfferCount: number
  redemptionCountByOfferId: Record<string, number>
  redemptionsByOfferId: Record<string, BusinessReportRedemption[]>
  profileEmailById: Record<string, string>
  viewCount: number
  clickCount: number
  conversionRate: string
  businessId: string | null
  businessStatus: string
  archivedAt: string | null
  archiveReason: string | null
  restoreRequestedAt: string | null
}

function formatExportDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function formatCustomerValue(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return 'Not set'
  const parsed = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(parsed)) return 'Not set'
  return `$${parsed.toFixed(2)}`
}

function maskCustomerEmail(value: string | null | undefined): string {
  const email = value?.trim()
  if (!email) return 'Supporter'

  const [localPart, domain] = email.split('@')
  if (!localPart || !domain) return 'Supporter'

  const visiblePrefix = localPart.slice(0, 1)
  return `${visiblePrefix}***@${domain}`
}

function formatVerificationMethod(value: string | null | undefined): string {
  switch (value) {
    case 'auto_validation':
      return '24-hour auto validation'
    case 'staff_confirmation':
      return 'Instant staff verification'
    case 'qr_code':
      return 'QR code'
    case 'staff_code':
      return 'POS discount code'
    case 'square':
      return 'Square'
    case 'legacy_self':
      return 'Legacy redemption'
    default:
      return value?.trim() || 'Unknown'
  }
}

function formatRedemptionStatus(value: string | null | undefined): string {
  switch (value) {
    case 'pending':
      return 'Pending review'
    case 'confirmed':
      return 'Confirmed'
    case 'rejected':
      return 'Rejected'
    case 'voided':
      return 'Voided'
    default:
      return value?.trim() || 'Unknown'
  }
}

function getStatusClasses(value: string | null | undefined): string {
  switch (value) {
    case 'pending':
      return 'bg-amber-50 text-amber-800'
    case 'confirmed':
      return 'bg-green-50 text-green-700'
    case 'rejected':
      return 'bg-red-50 text-red-700'
    case 'voided':
      return 'bg-slate-100 text-slate-600'
    default:
      return 'bg-slate-100 text-slate-600'
  }
}

function formatAutoConfirm(value: string | null): string {
  if (!value) return 'Auto-confirm time unavailable'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Auto-confirm time unavailable'

  return `Auto-confirms ${date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })}`
}

function getDateFilterCutoff(filter: RedemptionDateFilter): number | null {
  const days = filter === '7d' ? 7 : filter === '30d' ? 30 : filter === '90d' ? 90 : null
  if (!days) return null
  return Date.now() - days * 24 * 60 * 60 * 1000
}

function buildBusinessExportRows({
  offers,
  redemptionActivity,
  profileEmailById,
}: {
  offers: BusinessOffer[]
  redemptionActivity: RedemptionRow[]
  profileEmailById: Record<string, string>
}): BusinessExportRow[] {
  const offerById = new Map(offers.map((offer) => [offer.id, offer]))

  return redemptionActivity.map((redemption) => {
    const offer = offerById.get(redemption.offer_id)
    const offerStatus = offer
      ? getOfferStatus({
          startsAt: offer.starts_at,
          endsAt: offer.ends_at,
          isActive: offer.is_active,
        })
      : null

    return {
      offerTitle:
        redemption.offer_title_snapshot?.trim() ||
        offer?.title?.trim() ||
        'Untitled offer',
      offerStatus: offerStatus?.label || 'Historical',
      customerEmail: maskCustomerEmail(profileEmailById[redemption.user_id]),
      redeemedAt: formatExportDate(redemption.created_at),
      customerValue: formatCustomerValue(redemption.customer_value_snapshot),
      verificationMethod: formatVerificationMethod(redemption.confirmation_method),
      redemptionStatus: formatRedemptionStatus(redemption.status),
    }
  })
}

function ReportsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
      <path d="M4 20V10" />
      <path d="M10 20V4" />
      <path d="M16 20v-7" />
      <path d="M22 20H2" />
    </svg>
  )
}

export default function BusinessDashboardContent({
  view = 'offers',
  profile,
  offers,
  totalRedemptions,
  uniqueSupporters,
  pendingRedemptionCount,
  rejectedRedemptionCount,
  totalCustomerValueDelivered,
  redemptionActivity,
  activeOffersCount,
  activeOfferLimit,
  hasReachedLimit,
  isGrowthPlan,
  topOfferTitle,
  topOfferCount,
  redemptionCountByOfferId,
  redemptionsByOfferId,
  profileEmailById,
  viewCount,
  clickCount,
  conversionRate,
  businessId,
  businessStatus,
  archivedAt,
  archiveReason,
  restoreRequestedAt,
}: BusinessDashboardContentProps) {
  const [isUpgradeOpen, setIsUpgradeOpen] = useState(false)
  const [redemptionStatusFilter, setRedemptionStatusFilter] =
    useState<RedemptionStatusFilter>('all')
  const [redemptionOfferFilter, setRedemptionOfferFilter] = useState('all')
  const [redemptionDateFilter, setRedemptionDateFilter] =
    useState<RedemptionDateFilter>('all')

  const offerStatuses = offers.map((offer) =>
    getOfferStatus({
      startsAt: offer.starts_at,
      endsAt: offer.ends_at,
      isActive: offer.is_active,
    })
  )
  const publicOfferId =
    offers.find((offer, index) => {
      const status = offerStatuses[index]?.status
      return status === 'active' || status === 'expiring-soon'
    })?.id ?? null

  const offerById = new Map(offers.map((offer) => [offer.id, offer]))
  const reportOfferOptions = [
    ...new Map(
      redemptionActivity.map((redemption) => [
        redemption.offer_id,
        redemption.offer_title_snapshot?.trim() ||
          offerById.get(redemption.offer_id)?.title?.trim() ||
          'Historical offer',
      ])
    ).entries(),
  ].sort((first, second) => first[1].localeCompare(second[1]))

  const dateFilterCutoff = getDateFilterCutoff(redemptionDateFilter)
  const filteredRedemptionActivity = redemptionActivity.filter((redemption) => {
    if (
      redemptionStatusFilter !== 'all' &&
      redemption.status !== redemptionStatusFilter
    ) {
      return false
    }

    if (
      redemptionOfferFilter !== 'all' &&
      redemption.offer_id !== redemptionOfferFilter
    ) {
      return false
    }

    if (dateFilterCutoff !== null) {
      const timestamp = new Date(redemption.created_at).getTime()
      if (Number.isNaN(timestamp) || timestamp < dateFilterCutoff) {
        return false
      }
    }

    return true
  })

  const businessExportRows = buildBusinessExportRows({
    offers,
    redemptionActivity: filteredRedemptionActivity,
    profileEmailById,
  })

  if (view === 'reports') {
    return (
      <div className="mt-5 space-y-5 sm:mt-6 sm:space-y-6">
        <WorkspaceMetricStrip
          title="Redemption activity"
          rangeLabel="all offers"
          metrics={[
            {
              label: 'Confirmed',
              value: totalRedemptions,
              description: 'Finalized offer uses',
              tone: 'blue',
            },
            {
              label: 'Pending review',
              value: pendingRedemptionCount,
              description: 'Auto-confirms after 24 hours',
              tone: 'amber',
            },
            {
              label: 'Unique supporters',
              value: uniqueSupporters,
              description: 'Distinct confirmed customers',
              tone: 'green',
            },
            {
              label: 'Customer value',
              value: `$${totalCustomerValueDelivered.toFixed(2)}`,
              description: 'Confirmed business-set value',
              tone: 'amber',
            },
          ]}
        />

        <div className="rounded-2xl border border-green-200 bg-green-50 p-4">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-green-700">
            Exception-based review
          </p>
          <p className="mt-1 text-sm font-bold text-green-950">
            No action is needed for normal redemptions.
          </p>
          <p className="mt-1 text-sm leading-6 text-green-900">
            Pending redemptions confirm automatically after 24 hours. Use “Report unauthorized” only when a redemption did not legitimately occur at your business. {rejectedRedemptionCount} rejected record{rejectedRedemptionCount === 1 ? '' : 's'} remain in the audit trail.
          </p>
        </div>

        <WorkspaceMetricStrip
          title="Customer activity"
          rangeLabel="all offers"
          metrics={[
            { label: 'Views', value: viewCount, tone: 'blue' },
            { label: 'Clicks', value: clickCount, tone: 'green' },
            {
              label: 'Click rate',
              value: `${conversionRate}%`,
              description: 'Clicks divided by views',
              tone: 'amber',
            },
          ]}
        />

        <BusinessDashboardSnapshot
          activeOffersCount={activeOffersCount}
          activeOfferLimit={activeOfferLimit}
          isGrowthPlan={isGrowthPlan}
          totalRedemptions={totalRedemptions}
          topOfferTitle={topOfferTitle}
          topOfferCount={topOfferCount}
          publishedOffersCount={offers.length}
        />

        <WorkspaceModule
          title="Redemption records"
          eyebrow="Customer visits and review status"
          description="Filter the audit trail without changing the confirmed performance totals above. Supporter email addresses are masked in the report and CSV export."
          icon={<ReportsIcon />}
          tone="blue"
          action={
            <BusinessExportTools
              rows={businessExportRows}
              businessName={profile?.business_name}
            />
          }
        >
          <div className="mb-4 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-3">
            <label className="text-xs font-bold uppercase tracking-wide text-slate-600">
              Status
              <select
                value={redemptionStatusFilter}
                onChange={(event) =>
                  setRedemptionStatusFilter(event.target.value as RedemptionStatusFilter)
                }
                className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold normal-case tracking-normal text-slate-800"
              >
                <option value="all">All statuses</option>
                <option value="pending">Pending review</option>
                <option value="confirmed">Confirmed</option>
                <option value="rejected">Rejected</option>
                <option value="voided">Voided</option>
              </select>
            </label>

            <label className="text-xs font-bold uppercase tracking-wide text-slate-600">
              Offer
              <select
                value={redemptionOfferFilter}
                onChange={(event) => setRedemptionOfferFilter(event.target.value)}
                className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold normal-case tracking-normal text-slate-800"
              >
                <option value="all">All offers</option>
                {reportOfferOptions.map(([offerId, title]) => (
                  <option key={offerId} value={offerId}>
                    {title}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-xs font-bold uppercase tracking-wide text-slate-600">
              Date
              <select
                value={redemptionDateFilter}
                onChange={(event) =>
                  setRedemptionDateFilter(event.target.value as RedemptionDateFilter)
                }
                className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold normal-case tracking-normal text-slate-800"
              >
                <option value="all">All time</option>
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
              </select>
            </label>
          </div>

          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
            <span>
              {filteredRedemptionActivity.length} matching record{filteredRedemptionActivity.length === 1 ? '' : 's'}
            </span>
            <span>Supporter identifiers are privacy-masked.</span>
          </div>

          {filteredRedemptionActivity.length > 0 ? (
            <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200">
              {filteredRedemptionActivity.slice(0, 12).map((redemption) => {
                const offer = offerById.get(redemption.offer_id)
                const offerTitle =
                  redemption.offer_title_snapshot?.trim() ||
                  offer?.title?.trim() ||
                  'Untitled offer'

                return (
                  <div
                    key={redemption.id}
                    className="grid gap-3 p-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.8fr)_minmax(0,0.8fr)_auto] lg:items-center"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-bold text-slate-950">{offerTitle}</p>
                      <p className="mt-1 text-xs font-semibold text-blue-700">
                        {formatVerificationMethod(redemption.confirmation_method)}
                      </p>
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-sm text-slate-600">
                        {maskCustomerEmail(profileEmailById[redemption.user_id])}
                      </p>
                      <p className="mt-1 text-xs font-bold text-green-700">
                        {formatCustomerValue(redemption.customer_value_snapshot)} customer value
                      </p>
                    </div>

                    <div className="min-w-0">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${getStatusClasses(redemption.status)}`}>
                        {formatRedemptionStatus(redemption.status)}
                      </span>
                      <p className="mt-1 text-xs text-slate-500">
                        {formatExportDate(redemption.created_at)}
                      </p>
                      {redemption.status === 'pending' ? (
                        <p className="mt-1 text-xs font-semibold text-amber-700">
                          {formatAutoConfirm(redemption.auto_confirm_at)}
                        </p>
                      ) : null}
                    </div>

                    {redemption.status === 'pending' ? (
                      <BusinessRedemptionRejectButton redemptionId={redemption.id} />
                    ) : (
                      <div className="text-xs text-slate-400">
                        {redemption.status === 'rejected'
                          ? 'Kept for audit history'
                          : 'No action needed'}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center">
              <p className="font-bold text-slate-900">
                {redemptionActivity.length > 0
                  ? 'No records match these filters'
                  : 'No redemptions recorded yet'}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                {redemptionActivity.length > 0
                  ? 'Change a filter above to review other redemption activity.'
                  : 'Customer redemptions will appear here immediately. Normal activity requires no staff approval.'}
              </p>
            </div>
          )}

          {filteredRedemptionActivity.length > 12 ? (
            <p className="mt-3 text-sm text-slate-500">
              Showing the 12 most recent matching records. Export CSV for the complete filtered report.
            </p>
          ) : null}
        </WorkspaceModule>

        <Link href="/dashboard/offers" className="inline-flex min-h-11 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700">
          Manage offers
        </Link>
      </div>
    )
  }

  return (
    <div className="mt-5 space-y-5 sm:mt-6 sm:space-y-6">
      {businessId ? (
        <BusinessLifecycleBanner
          businessId={businessId}
          status={businessStatus}
          archivedAt={archivedAt}
          archiveReason={archiveReason}
          restoreRequestedAt={restoreRequestedAt}
        />
      ) : null}

      {isGrowthPlan && businessId ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-green-200 bg-green-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-green-700">Growth plan</p>
            <p className="mt-1 text-sm text-green-900">Your active-offer limit is removed while Growth remains active.</p>
          </div>
          <Link
            href={`/upgrade?business=${encodeURIComponent(businessId)}`}
            className="inline-flex min-h-10 items-center justify-center rounded-xl border border-green-300 bg-white px-4 text-sm font-bold text-green-800"
          >
            Manage billing
          </Link>
        </div>
      ) : null}

      <section id="business-offers" className="scroll-mt-24">
        <BusinessDashboardOffersSection
          offers={offers}
          hasReachedLimit={hasReachedLimit}
          redemptionCountByOfferId={redemptionCountByOfferId}
          redemptionsByOfferId={redemptionsByOfferId}
          profileEmailById={profileEmailById}
          exportRows={[]}
          businessName={profile?.business_name}
          onBoost={() => setIsUpgradeOpen(true)}
        />
      </section>

      <BusinessDashboardQuickActions
        hasReachedLimit={hasReachedLimit}
        publicOfferId={publicOfferId}
      />

      <section id="business-redemption-settings" className="scroll-mt-24">
        <BusinessRedemptionSettingsSection
          redemptionMethod={profile?.redemption_method}
        />
      </section>

      <section id="create-offer" className="scroll-mt-24">
        <BusinessDashboardCreateOffer
          activeOffersCount={activeOffersCount}
          activeOfferLimit={activeOfferLimit}
          hasReachedLimit={hasReachedLimit}
          isGrowthPlan={isGrowthPlan}
          onViewUpgrade={() => setIsUpgradeOpen(true)}
        />
      </section>

      <UpgradePlanModal
        isOpen={isUpgradeOpen}
        onClose={() => setIsUpgradeOpen(false)}
        businessId={businessId}
      />
    </div>
  )
}

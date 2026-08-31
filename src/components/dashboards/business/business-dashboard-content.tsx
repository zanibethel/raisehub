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
import BusinessDashboardOffersSection from './offers/offers-section'
import BusinessRedemptionSettingsSection from './sections/business-redemption-settings-section'

import type {
  BusinessOffer,
  OfferRedemption,
} from '@/app/components/business-offer-card'
import type { BusinessWorkspaceView } from './business-dashboard'

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

export type BusinessDashboardContentProps = {
  view?: BusinessWorkspaceView
  profile: BusinessProfile | null
  offers: BusinessOffer[]
  totalRedemptions: number
  uniqueSupporters: number
  totalCustomerValueDelivered: number
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

function formatVerificationMethod(value: string | null | undefined): string {
  switch (value) {
    case 'staff_confirmation':
      return 'Staff confirmation'
    case 'qr_code':
      return 'QR code'
    case 'staff_code':
      return 'Staff code'
    case 'square':
      return 'Square'
    case 'legacy_self':
      return 'Legacy redemption'
    default:
      return value?.trim() || 'Unknown'
  }
}

function buildBusinessExportRows({
  offers,
  redemptionsByOfferId,
  profileEmailById,
}: {
  offers: BusinessOffer[]
  redemptionsByOfferId: Record<string, BusinessReportRedemption[]>
  profileEmailById: Record<string, string>
}): BusinessExportRow[] {
  const offerById = new Map(offers.map((offer) => [offer.id, offer]))

  return Object.entries(redemptionsByOfferId)
    .flatMap(([offerId, redemptions]) => {
      const offer = offerById.get(offerId)
      const offerStatus = offer
        ? getOfferStatus({
            startsAt: offer.starts_at,
            endsAt: offer.ends_at,
            isActive: offer.is_active,
          })
        : null

      return redemptions.map((redemption) => ({
        row: {
          offerTitle:
            redemption.offer_title_snapshot?.trim() ||
            offer?.title?.trim() ||
            'Untitled offer',
          offerStatus: offerStatus?.label || 'Historical',
          customerEmail:
            profileEmailById[redemption.user_id] || 'Email unavailable',
          redeemedAt: formatExportDate(redemption.created_at),
          customerValue: formatCustomerValue(redemption.customer_value_snapshot),
          verificationMethod: formatVerificationMethod(redemption.confirmation_method),
          redemptionStatus:
            redemption.status === 'voided' ? 'Voided' : 'Confirmed',
        } satisfies BusinessExportRow,
        createdAt: redemption.created_at,
      }))
    })
    .sort((a, b) => {
      const bTime = new Date(b.createdAt).getTime()
      const aTime = new Date(a.createdAt).getTime()
      return (Number.isFinite(bTime) ? bTime : 0) - (Number.isFinite(aTime) ? aTime : 0)
    })
    .map(({ row }) => row)
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
  totalCustomerValueDelivered,
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

  const businessExportRows = buildBusinessExportRows({
    offers,
    redemptionsByOfferId,
    profileEmailById,
  })

  if (view === 'reports') {
    return (
      <div className="mt-5 space-y-5 sm:mt-6 sm:space-y-6">
        <WorkspaceMetricStrip
          title="Confirmed redemptions"
          rangeLabel="all offers"
          metrics={[
            {
              label: 'Redemptions',
              value: totalRedemptions,
              description: 'Business-confirmed offer uses',
              tone: 'blue',
            },
            {
              label: 'Unique supporters',
              value: uniqueSupporters,
              description: 'Distinct customers who redeemed',
              tone: 'green',
            },
            {
              label: 'Customer value',
              value: `$${totalCustomerValueDelivered.toFixed(2)}`,
              description: 'Business-set value delivered',
              tone: 'amber',
            },
          ]}
        />

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
          eyebrow="Verified customer visits"
          description="Each row is a confirmed redemption. Offer value and verification details are preserved even if the offer changes later."
          icon={<ReportsIcon />}
          tone="blue"
          action={
            <BusinessExportTools
              rows={businessExportRows}
              businessName={profile?.business_name}
            />
          }
        >
          {businessExportRows.length > 0 ? (
            <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200">
              {businessExportRows.slice(0, 8).map((row, index) => (
                <div
                  key={`${row.offerTitle}-${row.redeemedAt}-${index}`}
                  className="grid gap-2 p-4 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)_auto] sm:items-center sm:gap-4"
                >
                  <div className="min-w-0">
                    <p className="truncate font-bold text-slate-950">{row.offerTitle}</p>
                    <p className="mt-1 text-xs font-semibold text-blue-700">
                      {row.offerStatus} · {row.verificationMethod}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm text-slate-600">{row.customerEmail}</p>
                    <p className="mt-1 text-xs font-bold text-green-700">
                      {row.customerValue} customer value
                    </p>
                  </div>
                  <div className="sm:text-right">
                    <p className="text-sm text-slate-500">{row.redeemedAt}</p>
                    <p className="mt-1 text-xs font-bold text-green-700">{row.redemptionStatus}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center">
              <p className="font-bold text-slate-900">No confirmed redemptions yet</p>
              <p className="mt-1 text-sm text-slate-500">
                Confirmed customer activity will appear here after staff approves a supporter’s redemption code.
              </p>
            </div>
          )}

          {businessExportRows.length > 8 ? (
            <p className="mt-3 text-sm text-slate-500">
              Showing the 8 most recent records. Export CSV for the complete report.
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

import type {
  WorkspaceCardData,
  WorkspaceRole,
} from '@/lib/types/identity-access'
import type { WorkspaceSupportMode } from '@/components/platform/selected-workspace-panel'
import type { OwnerBusinessOffersResult } from '@/lib/services/owner-business-offer-service'
import { getOwnerAuthorizedBusinessOffers } from '@/lib/services/owner-business-offer-service'
import type { OwnerOrganizationCampaignsResult } from '@/lib/services/owner-organization-campaign-service'
import { getOwnerAuthorizedOrganizationCampaigns } from '@/lib/services/owner-organization-campaign-service'
import type { OwnerCustomerActivityResult } from '@/lib/services/owner-customer-activity-service'
import { getOwnerAuthorizedCustomerActivity } from '@/lib/services/owner-customer-activity-service'
import { getOwnerWorkspaces } from '@/lib/services/workspace-service'
import { getOwnerPlatformAnalytics } from '@/lib/services/owner-platform-analytics-service'
import {
  getOwnerPricingOverview,
  type OwnerPlatformPricingSummary,
  type OwnerPricingRuleCounts,
} from '@/lib/services/owner-pricing-service'

import OwnerDashboardContent from './owner-dashboard-content'
import OwnerPricingEditor from './owner-pricing-editor'

// =============================================================================
// Types
// =============================================================================

export type PreviewRole =
  | 'customer'
  | 'business'
  | 'organization'
  | 'admin'

type Props = {
  searchParams?: {
    previewRole?: string
    workspaceId?: string
    workspaceRole?: string
    supportMode?: string
  }
}

// =============================================================================
// Constants
// =============================================================================

const VALID_PREVIEW_ROLES: PreviewRole[] = [
  'customer',
  'business',
  'organization',
  'admin',
]

const VALID_WORKSPACE_ROLES: WorkspaceRole[] = [
  'customer',
  'business',
  'organization',
]

// =============================================================================
// Helpers
// =============================================================================

function resolvePreviewRole(
  previewRole?: string
): PreviewRole {
  return VALID_PREVIEW_ROLES.includes(
    previewRole as PreviewRole
  )
    ? (previewRole as PreviewRole)
    : 'customer'
}

function resolveWorkspaceRole(
  workspaceRole?: string
): WorkspaceRole | null {
  return VALID_WORKSPACE_ROLES.includes(
    workspaceRole as WorkspaceRole
  )
    ? (workspaceRole as WorkspaceRole)
    : null
}

function resolveWorkspaceMode(
  supportMode?: string
): WorkspaceSupportMode {
  return supportMode === 'read-only'
    ? 'read-only'
    : 'workspace'
}

function resolveSelectedWorkspace({
  workspaces,
  workspaceId,
  workspaceRole,
}: {
  workspaces: WorkspaceCardData[]
  workspaceId?: string
  workspaceRole?: string
}): WorkspaceCardData | null {
  if (!workspaceId) {
    return null
  }

  const validWorkspaceRole =
    resolveWorkspaceRole(workspaceRole)

  if (!validWorkspaceRole) {
    return null
  }

  return (
    workspaces.find(
      (workspace) =>
        workspace.id === workspaceId &&
        workspace.role === validWorkspaceRole
    ) ?? null
  )
}

function formatMoney(value: number) {
  return `$${value.toFixed(2)}`
}

function PricingMetric({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-lg font-bold text-slate-950">
        {value}
      </p>
    </div>
  )
}

function RuleCountSummary({
  counts,
}: {
  counts: OwnerPricingRuleCounts
}) {
  return (
    <p className="mt-4 text-xs leading-5 text-slate-500">
      {counts.total} active rule
      {counts.total === 1 ? '' : 's'} ·{' '}
      {counts.state} state · {counts.town} town ·{' '}
      {counts.organization} organization ·{' '}
      {counts.campaign} campaign
    </p>
  )
}

function PricingEnvironmentCard({
  summary,
  counts,
}: {
  summary: OwnerPlatformPricingSummary
  counts: OwnerPricingRuleCounts
}) {
  const title =
    summary.environment === 'production'
      ? 'Production'
      : 'Demo'

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-slate-950">
            {title}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Current platform default
          </p>
        </div>

        <span
          className={`rounded-full px-2.5 py-1 text-xs font-bold ${
            summary.usesFallback
              ? 'bg-amber-100 text-amber-800'
              : 'bg-emerald-100 text-emerald-800'
          }`}
        >
          {summary.usesFallback
            ? 'Fallback'
            : 'Managed'}
        </span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <PricingMetric
          label="Pass price"
          value={formatMoney(summary.passPrice)}
        />
        <PricingMetric
          label="RaiseHub fee"
          value={`${summary.platformFeePercent.toFixed(
            2
          )}% · ${formatMoney(
            summary.platformFeeAmount
          )}`}
        />
        <PricingMetric
          label="Organization share"
          value={formatMoney(
            summary.organizationPassEarnings
          )}
        />
      </div>

      {summary.reason ? (
        <p className="mt-4 text-sm leading-6 text-slate-600">
          {summary.reason}
        </p>
      ) : null}

      {summary.usesFallback ? (
        <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          No active managed platform rule was found. Checkout is using the emergency application fallback.
        </p>
      ) : null}

      <RuleCountSummary counts={counts} />
    </div>
  )
}

function OwnerPricingOverviewSection({
  production,
  demo,
  productionRuleCounts,
  demoRuleCounts,
}: {
  production: OwnerPlatformPricingSummary
  demo: OwnerPlatformPricingSummary
  productionRuleCounts: OwnerPricingRuleCounts
  demoRuleCounts: OwnerPricingRuleCounts
}) {
  return (
    <section
      id="owner-pricing"
      className="mt-8 scroll-mt-6 rounded-3xl border border-slate-200 bg-slate-950 p-5 shadow-xl sm:p-6"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-300">
            Manage Platform
          </p>
          <h2 className="mt-2 text-2xl font-bold text-white">
            Pricing
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
            Review and change the platform default for production and demo before creating state, town, organization, or campaign overrides.
          </p>
        </div>

        <span className="rounded-full border border-blue-500/40 bg-blue-500/10 px-3 py-1.5 text-xs font-bold text-blue-200">
          Owner editable
        </span>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        <PricingEnvironmentCard
          summary={production}
          counts={productionRuleCounts}
        />
        <PricingEnvironmentCard
          summary={demo}
          counts={demoRuleCounts}
        />
      </div>

      <OwnerPricingEditor
        productionPassPrice={production.passPrice}
        productionFeePercent={
          production.platformFeePercent
        }
        demoPassPrice={demo.passPrice}
        demoFeePercent={demo.platformFeePercent}
      />
    </section>
  )
}

// =============================================================================
// Loader
// =============================================================================

export default async function OwnerDashboard({
  searchParams,
}: Props) {
  const previewRole = resolvePreviewRole(
    searchParams?.previewRole
  )

  const [workspaces, platformAnalyticsResult, pricingResult] =
    await Promise.all([
      getOwnerWorkspaces(),
      getOwnerPlatformAnalytics(),
      getOwnerPricingOverview(),
    ])

  const selectedWorkspace =
    resolveSelectedWorkspace({
      workspaces,
      workspaceId: searchParams?.workspaceId,
      workspaceRole: searchParams?.workspaceRole,
    })

  const workspaceMode = selectedWorkspace
    ? resolveWorkspaceMode(
        searchParams?.supportMode
      )
    : 'workspace'

  let businessOffersResult: OwnerBusinessOffersResult | null =
    null

  const shouldLoadBusinessOffers =
    selectedWorkspace?.role === 'business' &&
    workspaceMode === 'read-only'

  if (selectedWorkspace && shouldLoadBusinessOffers) {
    businessOffersResult =
      await getOwnerAuthorizedBusinessOffers(
        selectedWorkspace.id,
        selectedWorkspace.role
      )
  }

  let organizationCampaignsResult: OwnerOrganizationCampaignsResult | null =
    null

  const shouldLoadOrganizationCampaigns =
    selectedWorkspace?.role === 'organization' &&
    workspaceMode === 'read-only'

  if (
    selectedWorkspace &&
    shouldLoadOrganizationCampaigns
  ) {
    organizationCampaignsResult =
      await getOwnerAuthorizedOrganizationCampaigns(
        selectedWorkspace.id,
        selectedWorkspace.role
      )
  }

  let customerActivityResult: OwnerCustomerActivityResult | null =
    null

  const shouldLoadCustomerActivity =
    selectedWorkspace?.role === 'customer' &&
    workspaceMode === 'read-only'

  if (selectedWorkspace && shouldLoadCustomerActivity) {
    customerActivityResult =
      await getOwnerAuthorizedCustomerActivity(
        selectedWorkspace.id,
        selectedWorkspace.role
      )
  }

  const platformMetrics =
    platformAnalyticsResult.status === 'success'
      ? platformAnalyticsResult.metrics
      : null

  return (
    <>
      {pricingResult.status === 'success' ? (
        <OwnerPricingOverviewSection
          production={
            pricingResult.overview.production
          }
          demo={pricingResult.overview.demo}
          productionRuleCounts={
            pricingResult.overview
              .productionRuleCounts
          }
          demoRuleCounts={
            pricingResult.overview.demoRuleCounts
          }
        />
      ) : (
        <section className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <p className="font-bold text-amber-900">
            Pricing overview unavailable
          </p>
          <p className="mt-2 text-sm text-amber-800">
            {pricingResult.message}
          </p>
        </section>
      )}

      <OwnerDashboardContent
        activeRole={previewRole}
        workspaces={workspaces}
        selectedWorkspace={selectedWorkspace}
        workspaceMode={workspaceMode}
        businessOffersResult={businessOffersResult}
        organizationCampaignsResult={organizationCampaignsResult}
        customerActivityResult={customerActivityResult}
        platformMetrics={platformMetrics}
      />
    </>
  )
}

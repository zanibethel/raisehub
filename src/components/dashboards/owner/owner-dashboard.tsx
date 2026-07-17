import Link from 'next/link'

import { getOwnerPlatformAnalytics } from '@/lib/services/owner-platform-analytics-service'
import {
  getOwnerPricingOverview,
  type OwnerPlatformPricingSummary,
  type OwnerPricingRuleCounts,
} from '@/lib/services/owner-pricing-service'

import OwnerDashboardContent from './owner-dashboard-content'

export type PreviewRole =
  | 'customer'
  | 'business'
  | 'organization'
  | 'admin'

type Props = {
  searchParams?: {
    previewRole?: string
  }
}

const VALID_PREVIEW_ROLES: PreviewRole[] = [
  'customer',
  'business',
  'organization',
  'admin',
]

function resolvePreviewRole(
  previewRole?: string
): PreviewRole {
  return VALID_PREVIEW_ROLES.includes(
    previewRole as PreviewRole
  )
    ? (previewRole as PreviewRole)
    : 'customer'
}

function formatMoney(value: number) {
  return `$${value.toFixed(2)}`
}

function PricingEnvironmentSummary({
  summary,
}: {
  summary: OwnerPlatformPricingSummary
}) {
  const title =
    summary.environment === 'production'
      ? 'Production'
      : 'Demo'

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-bold text-slate-950">
          {title}
        </p>

        <span
          className={`rounded-full px-2.5 py-1 text-xs font-bold ${
            summary.usesFallback
              ? 'bg-amber-100 text-amber-800'
              : 'bg-emerald-100 text-emerald-800'
          }`}
        >
          {summary.usesFallback ? 'Fallback' : 'Managed'}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <div>
          <p className="text-xs text-slate-500">Pass</p>
          <p className="mt-1 font-bold text-slate-950">
            {formatMoney(summary.passPrice)}
          </p>
        </div>

        <div>
          <p className="text-xs text-slate-500">Fee</p>
          <p className="mt-1 font-bold text-blue-700">
            {summary.platformFeePercent.toFixed(2)}%
          </p>
        </div>

        <div>
          <p className="text-xs text-slate-500">Org share</p>
          <p className="mt-1 font-bold text-emerald-700">
            {formatMoney(summary.organizationPassEarnings)}
          </p>
        </div>
      </div>
    </div>
  )
}

function PricingCard({
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
  const totalOverrides =
    productionRuleCounts.state +
    productionRuleCounts.town +
    productionRuleCounts.organization +
    productionRuleCounts.campaign +
    demoRuleCounts.state +
    demoRuleCounts.town +
    demoRuleCounts.organization +
    demoRuleCounts.campaign

  const hasFallback =
    production.usesFallback || demo.usesFallback

  return (
    <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-lg sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">
            Manage Platform
          </p>

          <h2 className="mt-2 text-2xl font-bold text-slate-950">
            Pricing
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Monitor the current platform defaults here. Open the pricing workspace to publish changes, manage overrides, and review history.
          </p>
        </div>

        <Link
          href="/dashboard/owner/pricing"
          className="inline-flex w-fit items-center justify-center rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800"
        >
          Manage pricing
          <span aria-hidden="true" className="ml-2">
            →
          </span>
        </Link>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        <PricingEnvironmentSummary summary={production} />
        <PricingEnvironmentSummary summary={demo} />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-600">
        <span className="rounded-full bg-slate-100 px-3 py-1.5">
          {totalOverrides} active override
          {totalOverrides === 1 ? '' : 's'}
        </span>

        <span className="rounded-full bg-slate-100 px-3 py-1.5">
          {productionRuleCounts.total} production rule
          {productionRuleCounts.total === 1 ? '' : 's'}
        </span>

        <span className="rounded-full bg-slate-100 px-3 py-1.5">
          {demoRuleCounts.total} demo rule
          {demoRuleCounts.total === 1 ? '' : 's'}
        </span>
      </div>

      {hasFallback ? (
        <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
          At least one environment is using the emergency fallback instead of a managed platform rule. Open pricing to review it.
        </p>
      ) : null}
    </section>
  )
}

export default async function OwnerDashboard({
  searchParams,
}: Props) {
  const previewRole = resolvePreviewRole(
    searchParams?.previewRole
  )

  const [platformAnalyticsResult, pricingResult] =
    await Promise.all([
      getOwnerPlatformAnalytics(),
      getOwnerPricingOverview(),
    ])

  const platformMetrics =
    platformAnalyticsResult.status === 'success'
      ? platformAnalyticsResult.metrics
      : null

  return (
    <>
      {pricingResult.status === 'success' ? (
        <PricingCard
          production={pricingResult.overview.production}
          demo={pricingResult.overview.demo}
          productionRuleCounts={
            pricingResult.overview.productionRuleCounts
          }
          demoRuleCounts={
            pricingResult.overview.demoRuleCounts
          }
        />
      ) : (
        <section className="mt-8 rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="font-bold text-amber-950">
                Pricing overview unavailable
              </p>
              <p className="mt-2 text-sm text-amber-900">
                {pricingResult.message}
              </p>
            </div>

            <Link
              href="/dashboard/owner/pricing"
              className="inline-flex w-fit rounded-xl border border-amber-300 bg-white px-4 py-2 text-sm font-bold text-amber-950"
            >
              Open pricing
            </Link>
          </div>
        </section>
      )}

      <OwnerDashboardContent
        activeRole={previewRole}
        platformMetrics={platformMetrics}
      />
    </>
  )
}

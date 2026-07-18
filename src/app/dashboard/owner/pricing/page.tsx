import Link from 'next/link'
import { redirect } from 'next/navigation'

import OwnerPricingEditor from '@/components/dashboards/owner/owner-pricing-editor'
import {
  getOwnerPlatformPricingHistory,
  type OwnerPlatformPricingHistoryItem,
} from '@/lib/services/owner-pricing-history-service'
import {
  getOwnerPricingOverview,
  type OwnerPlatformPricingSummary,
  type OwnerPricingRuleCounts,
} from '@/lib/services/owner-pricing-service'

export const metadata = {
  title: 'Pricing | RaiseHub Owner Console',
}

function formatMoney(value: number) {
  return `$${value.toFixed(2)}`
}

function formatPercent(value: number) {
  return `${value.toFixed(2)}%`
}

function formatDate(value: string | null) {
  if (!value) {
    return 'No end date'
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

function PricingMetric({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-xl font-bold text-slate-950">
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
    <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {[
        ['All active', counts.total],
        ['Platform', counts.platform],
        ['State', counts.state],
        ['Town', counts.town],
        ['Organization', counts.organization],
        ['Campaign', counts.campaign],
      ].map(([label, value]) => (
        <div
          key={label}
          className="rounded-xl border border-slate-200 bg-white p-3"
        >
          <p className="text-xs font-semibold text-slate-500">
            {label}
          </p>
          <p className="mt-1 text-lg font-bold text-slate-950">
            {value}
          </p>
        </div>
      ))}
    </div>
  )
}

function EnvironmentCard({
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
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">
            {title}
          </p>
          <h2 className="mt-2 text-xl font-bold text-slate-950">
            Current platform default
          </h2>
        </div>

        <span
          className={`rounded-full px-3 py-1.5 text-xs font-bold ${
            summary.usesFallback
              ? 'bg-amber-100 text-amber-800'
              : 'bg-emerald-100 text-emerald-800'
          }`}
        >
          {summary.usesFallback ? 'Fallback' : 'Managed'}
        </span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <PricingMetric
          label="Customer pays"
          value={formatMoney(summary.passPrice)}
        />
        <PricingMetric
          label="RaiseHub receives"
          value={`${formatPercent(
            summary.platformFeePercent
          )} · ${formatMoney(
            summary.platformFeeAmount
          )}`}
        />
        <PricingMetric
          label="Organization receives"
          value={formatMoney(
            summary.organizationPassEarnings
          )}
        />
      </div>

      <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
        <p>
          <strong className="text-slate-900">Effective:</strong>{' '}
          {formatDate(summary.startsAt)}
        </p>
        <p>
          <strong className="text-slate-900">Ends:</strong>{' '}
          {formatDate(summary.expiresAt)}
        </p>
        {summary.reason ? (
          <p className="mt-2">
            <strong className="text-slate-900">Reason:</strong>{' '}
            {summary.reason}
          </p>
        ) : null}
      </div>

      {summary.usesFallback ? (
        <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
          No active managed platform rule was found. Checkout is using the emergency application fallback.
        </p>
      ) : null}

      <RuleCountSummary counts={counts} />
    </section>
  )
}

function HistoryRow({
  item,
}: {
  item: OwnerPlatformPricingHistoryItem
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold capitalize text-slate-700">
              {item.environment}
            </span>
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                item.status === 'active'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              {item.status}
            </span>
          </div>

          <p className="mt-3 text-lg font-bold text-slate-950">
            {formatMoney(item.passPrice)} pass ·{' '}
            {formatPercent(item.platformFeePercent)} fee
          </p>
        </div>

        <div className="text-right text-xs leading-5 text-slate-500">
          <p>Started {formatDate(item.startsAt)}</p>
          <p>
            {item.expiresAt
              ? `Ended ${formatDate(item.expiresAt)}`
              : 'No end date'}
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl bg-blue-50 p-3">
          <p className="text-xs font-bold uppercase tracking-wide text-blue-700">
            RaiseHub share
          </p>
          <p className="mt-1 font-bold text-blue-950">
            {formatMoney(item.platformFeeAmount)}
          </p>
        </div>

        <div className="rounded-xl bg-emerald-50 p-3">
          <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">
            Organization share
          </p>
          <p className="mt-1 font-bold text-emerald-950">
            {formatMoney(item.organizationPassEarnings)}
          </p>
        </div>
      </div>

      {item.reason ? (
        <p className="mt-4 text-sm leading-6 text-slate-700">
          <strong>Reason:</strong> {item.reason}
        </p>
      ) : null}

      {item.internalNote ? (
        <p className="mt-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-600">
          <strong className="text-slate-900">Internal note:</strong>{' '}
          {item.internalNote}
        </p>
      ) : null}
    </article>
  )
}

export default async function OwnerPricingPage() {
  const [pricingResult, historyResult] =
    await Promise.all([
      getOwnerPricingOverview(),
      getOwnerPlatformPricingHistory(30),
    ])

  if (
    pricingResult.status === 'unauthenticated' ||
    historyResult.status === 'unauthenticated'
  ) {
    redirect('/login')
  }

  if (
    pricingResult.status === 'owner-role-required' ||
    historyResult.status === 'owner-role-required'
  ) {
    redirect('/dashboard')
  }

  return (
    <main className="min-h-screen bg-[#F0F6FF] px-4 py-6 sm:px-8 sm:py-10">
      <div className="mx-auto max-w-7xl">
        <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl sm:p-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm font-bold text-blue-700 transition hover:text-blue-900"
          >
            <span aria-hidden="true">←</span>
            Owner dashboard
          </Link>

          <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">
                Manage Platform
              </p>
              <h1 className="mt-2 text-3xl font-bold text-slate-950 sm:text-4xl">
                Pricing
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
                Manage Production and Demo platform defaults, review the financial breakdown, and audit every pricing change without rewriting historical purchases.
              </p>
            </div>

            <span className="w-fit rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-600">
              Owner only
            </span>
          </div>
        </header>

        {pricingResult.status === 'success' ? (
          <>
            <div className="mt-6 grid gap-5 xl:grid-cols-2">
              <EnvironmentCard
                summary={pricingResult.overview.production}
                counts={pricingResult.overview.productionRuleCounts}
              />
              <EnvironmentCard
                summary={pricingResult.overview.demo}
                counts={pricingResult.overview.demoRuleCounts}
              />
            </div>

            <section className="mt-6 rounded-3xl border border-slate-800 bg-slate-950 p-5 shadow-xl sm:p-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-300">
                  Pricing tools
                </p>
                <h2 className="mt-2 text-2xl font-bold text-white">
                  Publish a new platform default
                </h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
                  New rules take effect immediately. Existing purchases retain the exact pricing snapshot used at checkout.
                </p>
              </div>

              <OwnerPricingEditor
                productionPassPrice={pricingResult.overview.production.passPrice}
                productionFeePercent={pricingResult.overview.production.platformFeePercent}
                demoPassPrice={pricingResult.overview.demo.passPrice}
                demoFeePercent={pricingResult.overview.demo.platformFeePercent}
              />
            </section>
          </>
        ) : (
          <section className="mt-6 rounded-3xl border border-amber-200 bg-amber-50 p-6">
            <h2 className="text-lg font-bold text-amber-950">
              Pricing overview unavailable
            </h2>
            <p className="mt-2 text-sm text-amber-900">
              {pricingResult.message}
            </p>
          </section>
        )}

        <section className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-5 sm:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                Audit trail
              </p>
              <h2 className="mt-2 text-2xl font-bold text-slate-950">
                Platform pricing history
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                The most recent Production and Demo platform rules, including retired defaults and private operational notes.
              </p>
            </div>

            {historyResult.status === 'success' ? (
              <span className="w-fit rounded-full bg-white px-3 py-1.5 text-xs font-bold text-slate-600 shadow-sm">
                {historyResult.history.length} record
                {historyResult.history.length === 1 ? '' : 's'}
              </span>
            ) : null}
          </div>

          {historyResult.status === 'success' ? (
            historyResult.history.length > 0 ? (
              <div className="mt-5 grid gap-4 xl:grid-cols-2">
                {historyResult.history.map((item) => (
                  <HistoryRow key={item.id} item={item} />
                ))}
              </div>
            ) : (
              <p className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600">
                No platform pricing history is available yet.
              </p>
            )
          ) : (
            <p className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
              {historyResult.message}
            </p>
          )}
        </section>
      </div>
    </main>
  )
}

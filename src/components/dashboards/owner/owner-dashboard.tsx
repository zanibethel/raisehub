import Link from 'next/link'

import { getOwnerPlatformAnalytics } from '@/lib/services/owner-platform-analytics-service'
import { getOwnerPartnerRewardsQuarterReport } from '@/lib/services/partner-rewards-quarter-report-service'

import OwnerDashboardContent from './owner-dashboard-content'
import OwnerWorkspaceShell from './owner-workspace-shell'

function money(cents: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100)
}

export default async function OwnerDashboard() {
  const [platformAnalyticsResult, rewardsReportResult] = await Promise.all([
    getOwnerPlatformAnalytics(),
    getOwnerPartnerRewardsQuarterReport(),
  ])
  const platformMetrics = platformAnalyticsResult.status === 'success'
    ? platformAnalyticsResult.metrics.production
    : null
  const rewardsReport = rewardsReportResult.status === 'success'
    ? rewardsReportResult.report
    : null

  return (
    <OwnerWorkspaceShell detail="Platform command center">
      <OwnerDashboardContent platformMetrics={platformMetrics} />

      {rewardsReport ? (
        <section className="mt-8 rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-green-50 p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-700">Running quarterly report</p>
              <h2 className="mt-1 text-xl font-black text-slate-950">{rewardsReport.label} Partner Rewards</h2>
              <p className="mt-1 text-sm text-slate-600">Central Time reporting · updates automatically each hour and when this dashboard loads.</p>
            </div>
            <Link href="/dashboard/owner/partner-rewards" className="inline-flex min-h-10 items-center justify-center rounded-xl bg-slate-950 px-4 text-sm font-black text-white hover:bg-green-700">
              Open full report <span aria-hidden="true" className="ml-2">→</span>
            </Link>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Qualifying sales</p>
              <p className="mt-1 text-xl font-black text-slate-950">{money(rewardsReport.qualifyingSalesCents)}</p>
            </div>
            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-blue-700">RaiseHub · 15%</p>
              <p className="mt-1 text-xl font-black text-slate-950">{money(rewardsReport.platformRetainedCents)}</p>
            </div>
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-amber-700">Rewards pool · 5%</p>
              <p className="mt-1 text-xl font-black text-slate-950">{money(rewardsReport.partnerRewardsPoolCents)}</p>
            </div>
            <div className="rounded-2xl border border-green-200 bg-green-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-green-700">Expected payout</p>
              <p className="mt-1 text-xl font-black text-slate-950">{money(rewardsReport.expectedDisbursementCents)}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Eligible points</p>
              <p className="mt-1 text-xl font-black text-slate-950">{rewardsReport.eligiblePoints.toLocaleString()}</p>
              <p className="mt-1 text-xs font-bold text-amber-700">{rewardsReport.pendingPoints.toLocaleString()} pending</p>
            </div>
          </div>
        </section>
      ) : null}

      <section className="mt-8 grid gap-4 lg:grid-cols-2">
        <article className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-amber-700">Trust and safety</p>
              <h2 className="mt-1 text-lg font-bold text-slate-950">Campaign reviews</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">Review pending campaigns, payout readiness, risk context, and decision history.</p>
            </div>
            <Link href="/dashboard/owner/campaign-reviews" className="inline-flex w-fit shrink-0 items-center justify-center rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-amber-600">
              Open review queue <span aria-hidden="true" className="ml-2">→</span>
            </Link>
          </div>
        </article>

        <article className="rounded-2xl border border-green-200 bg-green-50 p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-green-700">Partner trust</p>
              <h2 className="mt-1 text-lg font-bold text-slate-950">Business Verification</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">Approve legitimate business partners before their production Partner Points become eligible for the rewards pool.</p>
            </div>
            <Link href="/dashboard/owner/business-verifications" className="inline-flex w-fit shrink-0 items-center justify-center rounded-xl bg-green-700 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-green-800">
              Open verification queue <span aria-hidden="true" className="ml-2">→</span>
            </Link>
          </div>
        </article>

        <article className="rounded-2xl border border-blue-200 bg-blue-50 p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-700">Customer assistance</p>
              <h2 className="mt-1 text-lg font-bold text-slate-950">Support requests</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">Read incoming messages, keep private notes, draft replies, and publish responses.</p>
            </div>
            <Link href="/dashboard/owner/support/requests" className="inline-flex w-fit shrink-0 items-center justify-center rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-blue-800">
              Open support queue <span aria-hidden="true" className="ml-2">→</span>
            </Link>
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Platform settings</p>
              <h2 className="mt-1 text-lg font-bold text-slate-950">Pricing</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">Manage platform defaults, overrides, scheduled changes, and pricing history.</p>
            </div>
            <Link href="/dashboard/owner/pricing" className="inline-flex w-fit shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-950 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700">
              Open pricing <span aria-hidden="true" className="ml-2">→</span>
            </Link>
          </div>
        </article>
      </section>
    </OwnerWorkspaceShell>
  )
}

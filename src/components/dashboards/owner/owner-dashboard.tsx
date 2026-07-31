import Link from 'next/link'

import { getOwnerPlatformAnalytics } from '@/lib/services/owner-platform-analytics-service'

import OwnerDashboardContent from './owner-dashboard-content'
import OwnerWorkspaceShell from './owner-workspace-shell'

export default async function OwnerDashboard() {
  const platformAnalyticsResult = await getOwnerPlatformAnalytics()
  const platformMetrics = platformAnalyticsResult.status === 'success'
    ? platformAnalyticsResult.metrics.production
    : null

  return (
    <OwnerWorkspaceShell detail="Platform command center">
      <OwnerDashboardContent platformMetrics={platformMetrics} />

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

        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 lg:col-span-2">
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

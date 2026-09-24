import { getOwnerPlatformAnalytics } from '@/lib/services/owner-platform-analytics-service'
import { getOwnerPartnerRewardsQuarterReport } from '@/lib/services/partner-rewards-quarter-report-service'

import OwnerCommandCenter from './owner-command-center'
import OwnerWorkspaceShell from './owner-workspace-shell'
import OwnerAnalyticsSection from './sections/owner-analytics-section'
import OwnerFinancialHealthSection from './sections/owner-financial-health-section'

export default async function OwnerDashboard() {
  const [analyticsSettled, rewardsSettled] = await Promise.allSettled([
    getOwnerPlatformAnalytics(),
    getOwnerPartnerRewardsQuarterReport(),
  ])

  const platformAnalyticsResult =
    analyticsSettled.status === 'fulfilled' ? analyticsSettled.value : null
  const rewardsReportResult =
    rewardsSettled.status === 'fulfilled' ? rewardsSettled.value : null

  if (analyticsSettled.status === 'rejected') {
    console.error(
      'Unable to load platform analytics without blocking owner dashboard:',
      analyticsSettled.reason
    )
  }

  if (rewardsSettled.status === 'rejected') {
    console.error(
      'Unable to load Partner Rewards report without blocking owner dashboard:',
      rewardsSettled.reason
    )
  }

  const platformMetrics =
    platformAnalyticsResult?.status === 'success'
      ? platformAnalyticsResult.metrics.production
      : null

  const rewardsReport =
    rewardsReportResult?.status === 'success'
      ? rewardsReportResult.report
      : null

  return (
    <OwnerWorkspaceShell detail="Platform command center">
      <OwnerCommandCenter
        platformMetrics={platformMetrics}
        rewardsReport={rewardsReport}
      />

      <div className="mt-7 space-y-6">
        <OwnerFinancialHealthSection />

        <details
          id="owner-analytics"
          className="group rounded-3xl border border-slate-200 bg-white shadow-sm"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 sm:p-6">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-700">
                Platform analytics
              </p>
              <h2 className="mt-1 text-xl font-black text-slate-950">
                Live totals and performance signals
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Expand for the detailed production snapshot.
              </p>
            </div>
            <span className="shrink-0 text-2xl font-black text-slate-500 transition group-open:rotate-45">
              +
            </span>
          </summary>

          <div className="border-t border-slate-200 p-4 sm:p-6">
            <OwnerAnalyticsSection metrics={platformMetrics} />
          </div>
        </details>
      </div>
    </OwnerWorkspaceShell>
  )
}

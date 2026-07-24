import type { PlatformMetrics } from '@/lib/repositories/platform-analytics-repository'

import OwnerAnalyticsSection from './sections/owner-analytics-section'
import OwnerPlatformOverviewSection from './sections/owner-platform-overview-section'

type OwnerDashboardContentProps = {
  platformMetrics?: PlatformMetrics | null
}

export default function OwnerDashboardContent({
  platformMetrics = null,
}: OwnerDashboardContentProps) {
  return (
    <div className="mt-8 min-w-0 space-y-6">
      <OwnerPlatformOverviewSection />

      <details
        id="owner-analytics"
        className="group rounded-3xl border border-slate-200 bg-white shadow-sm"
      >
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 sm:p-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-700">
              Platform overview
            </p>
            <h2 className="mt-1 text-xl font-bold text-slate-950">
              Live totals and attention signals
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Expand when you need the full analytics snapshot.
            </p>
          </div>
          <span className="shrink-0 text-2xl font-bold text-slate-500 transition group-open:rotate-45">
            +
          </span>
        </summary>

        <div className="border-t border-slate-200 p-4 sm:p-6">
          <OwnerAnalyticsSection metrics={platformMetrics} />
        </div>
      </details>
    </div>
  )
}

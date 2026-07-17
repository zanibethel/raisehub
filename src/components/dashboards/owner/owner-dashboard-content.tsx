import type { PlatformMetrics } from '@/lib/repositories/platform-analytics-repository'

import OwnerAnalyticsSection from './sections/owner-analytics-section'
import OwnerPlatformOverviewSection from './sections/owner-platform-overview-section'

type OwnerDashboardContentProps = {
  activeRole: string
  platformMetrics?: PlatformMetrics | null
}

export default function OwnerDashboardContent({
  platformMetrics = null,
}: OwnerDashboardContentProps) {
  return (
    <div className="mt-8 min-w-0 space-y-8">
      <OwnerPlatformOverviewSection />

      <div id="owner-analytics">
        <OwnerAnalyticsSection metrics={platformMetrics} />
      </div>
    </div>
  )
}

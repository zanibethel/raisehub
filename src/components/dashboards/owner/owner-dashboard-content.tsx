import type { WorkspaceCardData } from '@/lib/types/identity-access'
import type { WorkspaceSupportMode } from '@/components/platform/selected-workspace-panel'
import type { OwnerBusinessOffersResult } from '@/lib/services/owner-business-offer-service'
import type { OwnerOrganizationCampaignsResult } from '@/lib/services/owner-organization-campaign-service'
import type { OwnerCustomerActivityResult } from '@/lib/services/owner-customer-activity-service'
import type { PlatformMetrics } from '@/lib/repositories/platform-analytics-repository'

import OwnerRoleSwitcher, {
  type PreviewRole,
} from './owner-role-switcher'
import OwnerAnalyticsSection from './sections/owner-analytics-section'
import OwnerPlatformOverviewSection from './sections/owner-platform-overview-section'

type OwnerDashboardContentProps = {
  activeRole: PreviewRole
  workspaces?: WorkspaceCardData[]
  selectedWorkspace?: WorkspaceCardData | null
  workspaceMode?: WorkspaceSupportMode
  businessOffersResult?: OwnerBusinessOffersResult | null
  organizationCampaignsResult?: OwnerOrganizationCampaignsResult | null
  customerActivityResult?: OwnerCustomerActivityResult | null
  platformMetrics?: PlatformMetrics | null
}

export default function OwnerDashboardContent({
  activeRole,
  platformMetrics = null,
}: OwnerDashboardContentProps) {
  return (
    <div className="mt-8 min-w-0 space-y-8">
      <OwnerPlatformOverviewSection />

      <div id="owner-analytics">
        <OwnerAnalyticsSection metrics={platformMetrics} />
      </div>

      <div
        id="owner-role-preview"
        className="scroll-mt-6"
      >
        <OwnerRoleSwitcher activeRole={activeRole} />
      </div>
    </div>
  )
}

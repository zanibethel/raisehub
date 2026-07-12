import ReadOnlyWorkspaceView from '@/components/platform/read-only-workspace-view'
import type { WorkspaceCardData } from '@/components/platform/workspace-card'
import SelectedWorkspacePanel, {
  type WorkspaceSupportMode,
} from '@/components/platform/selected-workspace-panel'
import type { OwnerBusinessOffersResult } from '@/lib/services/owner-business-offer-service'
import type { OwnerOrganizationCampaignsResult } from '@/lib/services/owner-organization-campaign-service'
import WorkspaceSelector from '@/components/platform/workspace-selector'
import type { PlatformMetrics } from '@/lib/repositories/platform-analytics-repository'

import OwnerRoleSwitcher, {
  type PreviewRole,
} from './owner-role-switcher'
import OwnerAnalyticsSection from './sections/owner-analytics-section'
import OwnerPlatformOverviewSection from './sections/owner-platform-overview-section'

// =============================================================================
// Types
// =============================================================================

type OwnerDashboardContentProps = {
  activeRole: PreviewRole
  workspaces?: WorkspaceCardData[]
  selectedWorkspace?: WorkspaceCardData | null
  workspaceMode?: WorkspaceSupportMode
  businessOffersResult?: OwnerBusinessOffersResult | null
  organizationCampaignsResult?: OwnerOrganizationCampaignsResult | null
  platformMetrics?: PlatformMetrics | null
}

// =============================================================================
// Component
// =============================================================================

export default function OwnerDashboardContent({
  activeRole,
  workspaces,
  selectedWorkspace,
  workspaceMode = 'workspace',
  businessOffersResult = null,
  organizationCampaignsResult = null,
  platformMetrics = null,
}: OwnerDashboardContentProps) {
  const isReadOnlySupport =
    Boolean(selectedWorkspace) &&
    workspaceMode === 'read-only'

  return (
    <div className="mt-8 min-w-0 space-y-8">
      <OwnerPlatformOverviewSection />

      <OwnerAnalyticsSection metrics={platformMetrics} />

      {selectedWorkspace ? (
        <SelectedWorkspacePanel
          workspace={selectedWorkspace}
          mode={workspaceMode}
        />
      ) : null}

      {selectedWorkspace && isReadOnlySupport ? (
        <ReadOnlyWorkspaceView
          workspace={selectedWorkspace}
          businessOffersResult={businessOffersResult}
          organizationCampaignsResult={
            organizationCampaignsResult
          }
        />
      ) : null}

      {workspaces ? (
        <WorkspaceSelector workspaces={workspaces} />
      ) : null}

      <OwnerRoleSwitcher activeRole={activeRole} />

      <section className="min-w-0 overflow-hidden rounded-2xl border border-blue-200 bg-blue-50 p-4 sm:p-6">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-700">
          Owner access
        </p>

        <h2 className="mt-2 break-words text-xl font-bold text-blue-950">
          Previewing the {activeRole} experience
        </h2>

        <p className="mt-2 text-sm leading-6 text-blue-900">
          Your permanent profile remains an owner account. Changing the
          selected role only changes which dashboard experience is being
          previewed.
        </p>
      </section>

      <section className="grid min-w-0 gap-4 md:grid-cols-3">
        <article className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <p className="text-sm font-semibold text-slate-500">
            Demo preview
          </p>

          <h3 className="mt-2 break-words text-lg font-bold text-slate-900">
            Test every role
          </h3>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            Review customer, business, organization, and admin experiences
            without changing your saved owner role.
          </p>
        </article>

        <article className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <p className="text-sm font-semibold text-slate-500">
            Client support
          </p>

          <h3 className="mt-2 break-words text-lg font-bold text-slate-900">
            View live accounts
          </h3>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            Search for a business, organization, or customer and inspect its
            workspace in read-only support mode.
          </p>
        </article>

        <article className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <p className="text-sm font-semibold text-slate-500">
            Assisted editing
          </p>

          <h3 className="mt-2 break-words text-lg font-bold text-slate-900">
            Help clients safely
          </h3>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            Future assisted changes will record your owner account, the client
            account, the resource changed, and the support reason.
          </p>
        </article>
      </section>

      <section className="min-w-0 overflow-hidden rounded-2xl border border-yellow-200 bg-yellow-50 p-4 sm:p-6">
        <h2 className="font-bold text-yellow-950">
          Live support editing is not enabled yet
        </h2>

        <p className="mt-2 text-sm leading-6 text-yellow-900">
          Read-only workspace viewing is now connected. Explicit assisted
          editing, permission checks, and audit logging will follow in separate
          verified steps.
        </p>
      </section>
    </div>
  )
}
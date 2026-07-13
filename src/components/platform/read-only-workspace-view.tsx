import type {
  WorkspaceCardData,
  WorkspaceRole,
} from '@/components/platform/workspace-card'
import ReadOnlyBusinessOffersSection from '@/components/platform/read-only-business-offers-section'
import ReadOnlyOrganizationCampaignsSection from '@/components/platform/read-only-organization-campaigns-section'
import ReadOnlyCustomerActivitySection from '@/components/platform/read-only-customer-activity-section'
import type { OwnerBusinessOffersResult } from '@/lib/services/owner-business-offer-service'
import type { OwnerOrganizationCampaignsResult } from '@/lib/services/owner-organization-campaign-service'
import type { OwnerCustomerActivityResult } from '@/lib/services/owner-customer-activity-service'

// =============================================================================
// Types
// =============================================================================

type ReadOnlyWorkspaceViewProps = {
  workspace: WorkspaceCardData
  businessOffersResult?: OwnerBusinessOffersResult | null
  organizationCampaignsResult?: OwnerOrganizationCampaignsResult | null
  customerActivityResult?: OwnerCustomerActivityResult | null
}

type WorkspaceArea = {
  title: string
  description: string
  status: 'available' | 'coming'
}

// =============================================================================
// Helpers
// =============================================================================

function getRoleLabel(role: WorkspaceRole): string {
  switch (role) {
    case 'business':
      return 'Business'

    case 'organization':
      return 'Organization'

    case 'customer':
      return 'Customer'
  }
}

function getWorkspaceAreas(role: WorkspaceRole): WorkspaceArea[] {
  switch (role) {
    case 'business':
      return [
        {
          title: 'Profile',
          description:
            'Review business identity, contact details, branding, and onboarding progress.',
          status: 'available',
        },
        {
          title: 'Offers',
          description:
            'Review active, paused, scheduled, and expired business offers.',
          status: 'available',
        },
        {
          title: 'Redemptions',
          description:
            'Review coupon usage and redemption activity for this business.',
          status: 'coming',
        },
        {
          title: 'Analytics',
          description:
            'Review offer views, clicks, conversion, and engagement.',
          status: 'coming',
        },
      ]

    case 'organization':
      return [
        {
          title: 'Profile',
          description:
            'Review organization identity, contact details, and onboarding progress.',
          status: 'available',
        },
        {
          title: 'Campaigns',
          description:
            'Review draft, active, paused, completed, and archived fundraising campaigns.',
          status: 'available',
        },
        {
          title: 'Sellers',
          description:
            'Review seller activity and campaign performance.',
          status: 'coming',
        },
        {
          title: 'Financials',
          description:
            'Review passes sold, gross volume, fees, and organization earnings.',
          status: 'coming',
        },
      ]

    case 'customer':
      return [
        {
          title: 'Profile',
          description:
            'Review customer identity, contact details, and account readiness.',
          status: 'available',
        },
        {
          title: 'Purchased passes',
          description:
            'Review fundraiser passes associated with this customer.',
          status: 'available',
        },
        {
          title: 'Saved offers',
          description:
            'Review offers currently saved to the customer account.',
          status: 'available',
        },
        {
          title: 'Redemptions',
          description:
            'Review the customer’s coupon redemption history.',
          status: 'available',
        },
      ]
  }
}

function getProgressWidth(percentage?: number | null): string {
  const safePercentage = Math.max(
    0,
    Math.min(100, Math.round(percentage ?? 0))
  )

  return `${safePercentage}%`
}

// =============================================================================
// Component
// =============================================================================

export default function ReadOnlyWorkspaceView({
  workspace,
  businessOffersResult = null,
  organizationCampaignsResult = null,
  customerActivityResult = null,
}: ReadOnlyWorkspaceViewProps) {
  const areas = getWorkspaceAreas(workspace.role)
  const missingItems = workspace.missingSetupItems ?? []

  return (
    <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* Header */}
      <div className="border-b border-slate-200 bg-slate-950 px-4 py-5 text-white sm:px-6">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-300">
          Read-only workspace
        </p>

        <div className="mt-2 flex min-w-0 flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="break-words text-xl font-bold">
              {workspace.name}
            </h2>

            <p className="mt-1 text-sm text-slate-300">
              {getRoleLabel(workspace.role)} account
            </p>
          </div>

          <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold">
            Viewing only
          </span>
        </div>
      </div>

      {/* Account health */}
      <div className="grid min-w-0 gap-4 border-b border-slate-200 p-4 sm:p-6 lg:grid-cols-3">
        <article className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
            Plan
          </p>

          <p className="mt-2 break-words text-lg font-bold text-slate-950">
            {workspace.planLabel ?? 'Standard account'}
          </p>

          <p className="mt-1 text-sm text-slate-600">
            Subscription and account access level
          </p>
        </article>

        <article className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
              Setup
            </p>

            <span className="text-sm font-bold text-slate-900">
              {workspace.setupPercentage ?? 0}%
            </span>
          </div>

          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-blue-600"
              style={{
                width: getProgressWidth(
                  workspace.setupPercentage
                ),
              }}
            />
          </div>

          <p className="mt-2 text-sm text-slate-600">
            {workspace.completedSetupItems ?? 0} of{' '}
            {workspace.totalSetupItems ?? 0} items complete
          </p>
        </article>

        <article className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
            Contact
          </p>

          <div className="mt-2 space-y-1.5">
            <p className="break-all text-sm font-semibold text-slate-900">
              {workspace.email ?? 'No email added'}
            </p>

            <p className="break-words text-sm text-slate-600">
              {workspace.phone ?? 'No phone added'}
            </p>
          </div>
        </article>
      </div>

      {/* Setup checklist */}
      <div className="border-b border-slate-200 p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
              Setup review
            </p>

            <h3 className="mt-1 text-lg font-bold text-slate-950">
              Account readiness
            </h3>
          </div>

          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
            {workspace.status ?? 'Status unavailable'}
          </span>
        </div>

        {missingItems.length > 0 ? (
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {missingItems.map((item) => (
              <div
                key={item}
                className="flex min-w-0 items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2"
              >
                <span
                  className="h-2 w-2 shrink-0 rounded-full bg-amber-500"
                  aria-hidden="true"
                />

                <span className="min-w-0 break-words text-sm font-semibold text-amber-950">
                  {item} needed
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-4">
            <p className="text-sm font-semibold text-green-800">
              All current profile setup requirements are complete.
            </p>
          </div>
        )}
      </div>

      {/* Role-specific areas */}
      <div className="p-4 sm:p-6">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
          Workspace areas
        </p>

        <h3 className="mt-1 text-lg font-bold text-slate-950">
          {getRoleLabel(workspace.role)} dashboard
        </h3>

        <div className="mt-4 grid min-w-0 gap-3 sm:grid-cols-2">
          {areas.map((area) => (
            <article
              key={area.title}
              className="min-w-0 rounded-xl border border-slate-200 bg-white p-4"
            >
              <div className="flex min-w-0 items-start justify-between gap-3">
                <h4 className="min-w-0 break-words font-bold text-slate-900">
                  {area.title}
                </h4>

                <span
                  className={
                    area.status === 'available'
                      ? 'shrink-0 rounded-full bg-green-50 px-2.5 py-1 text-xs font-bold text-green-700'
                      : 'shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600'
                  }
                >
                  {area.status === 'available'
                    ? 'Available'
                    : 'Next phase'}
                </span>
              </div>

              <p className="mt-2 text-sm leading-6 text-slate-600">
                {area.description}
              </p>
            </article>
          ))}
        </div>

        <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4">
          <p className="text-sm leading-6 text-blue-900">
            This view is intentionally read-only. Role-specific records will
            be connected through owner-authorized repository queries rather
            than reusing the client’s editable dashboard loader.
          </p>
        </div>
      </div>

      {workspace.role === 'business' ? (
        <ReadOnlyBusinessOffersSection
          offersResult={businessOffersResult}
        />
      ) : null}

      {workspace.role === 'organization' ? (
        <ReadOnlyOrganizationCampaignsSection
          campaignsResult={organizationCampaignsResult}
        />
      ) : null}

      {workspace.role === 'customer' ? (
        <ReadOnlyCustomerActivitySection
          activityResult={customerActivityResult}
        />
      ) : null}
    </section>
  )
}
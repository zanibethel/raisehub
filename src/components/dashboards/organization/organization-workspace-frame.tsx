import Link from 'next/link'
import type { ComponentProps } from 'react'

import OrganizationDashboardContent, {
  type OrganizationWorkspaceView,
} from './organization-dashboard-content'
import OrganizationWorkspaceShell from './organization-workspace-shell'

type Props = ComponentProps<typeof OrganizationDashboardContent> & {
  organizationName: string
  organizationLocation: string
  isSellerWorkspace?: boolean
  view?: OrganizationWorkspaceView
}

export default function OrganizationWorkspaceFrame({
  organizationName,
  organizationLocation,
  isSellerWorkspace = false,
  view = 'dashboard',
  ...props
}: Props) {
  return (
    <OrganizationWorkspaceShell
      organizationName={organizationName}
      organizationLocation={organizationLocation}
      activeCampaigns={props.activeCampaigns}
      totalCampaigns={props.totalCampaigns}
      totalFundsRaised={props.totalFundsRaised}
      view={view}
    >
      {isSellerWorkspace ? (
        <section className="mt-5 rounded-3xl border border-violet-200 bg-white p-5 shadow-sm sm:mt-6 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-violet-700">Seller setup</p>
              <h2 className="mt-1 text-xl font-bold text-gray-900">Link your roster name</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
                Select your name from this organization’s available campaign rosters. Your existing QR code, referral link, and sales history will stay connected.
              </p>
            </div>
            <Link
              href="/seller/claim-roster"
              className="inline-flex shrink-0 items-center justify-center rounded-xl bg-violet-600 px-5 py-3 text-sm font-bold text-white hover:bg-violet-700"
            >
              Link my roster name
            </Link>
          </div>
        </section>
      ) : null}

      <OrganizationDashboardContent view={view} {...props} />
    </OrganizationWorkspaceShell>
  )
}

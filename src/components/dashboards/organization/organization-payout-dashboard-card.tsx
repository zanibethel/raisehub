'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

function getSelectedOrganizationId(workspaceKey: string | null) {
  if (!workspaceKey?.startsWith('organization:')) return null

  const organizationId = workspaceKey.slice('organization:'.length).trim()
  return organizationId || null
}

export default function OrganizationPayoutDashboardCard() {
  const searchParams = useSearchParams()
  const organizationId = getSelectedOrganizationId(
    searchParams.get('workspace')
  )

  return (
    <section className="rounded-3xl border border-blue-100 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
            Organization payouts
          </p>
          <h2 className="mt-1 text-xl font-bold text-gray-900">
            Set up secure campaign payouts
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
            Connect and verify your Organization with Stripe before campaign proceeds can be transferred.
          </p>
          <p className="mt-2 text-xs text-gray-500">
            Test mode only. No real funds will move during this QA sprint.
          </p>
        </div>

        {organizationId ? (
          <Link
            href={`/organizations/${organizationId}/payouts`}
            className="inline-flex shrink-0 items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-center text-sm font-semibold text-white hover:bg-blue-700"
          >
            Open payout setup
          </Link>
        ) : (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
            Select an Organization workspace to continue.
          </p>
        )}
      </div>
    </section>
  )
}

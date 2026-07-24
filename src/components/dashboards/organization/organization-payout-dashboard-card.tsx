'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'

import { startOrganizationStripeOnboardingAction } from '@/app/organizations/stripe-connect-actions'

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
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  async function handleOnboarding() {
    if (loading) return

    if (!organizationId) {
      setMessage('Select an organization workspace before setting up payouts.')
      return
    }

    setLoading(true)
    setMessage('')

    const result = await startOrganizationStripeOnboardingAction(
      organizationId
    )

    if (result.status === 'onboarding-ready') {
      window.location.assign(result.url)
      return
    }

    setMessage(result.message)
    setLoading(false)
  }

  return (
    <details className="group rounded-3xl border border-blue-100 bg-white shadow-sm">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 sm:p-6">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
              Organization payouts
            </p>
            <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
              Setup required
            </span>
          </div>

          <h2 className="mt-2 text-xl font-bold text-gray-900">
            Set up secure campaign payouts
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
            Connect and verify your organization with Stripe before campaign proceeds can be transferred.
          </p>
        </div>

        <span className="shrink-0 rounded-full bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 group-open:hidden">
          View
        </span>
        <span className="hidden shrink-0 rounded-full bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 group-open:inline">
          Hide
        </span>
      </summary>

      <div className="border-t border-blue-100 p-5 sm:p-6">
        <p className="text-sm leading-6 text-gray-600">
          Stripe securely verifies the organization and bank account used to receive campaign proceeds.
        </p>
        <p className="mt-2 text-xs text-gray-500">
          Test mode only. No real funds will move during this QA sprint.
        </p>

        <button
          type="button"
          onClick={handleOnboarding}
          disabled={loading}
          className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-center text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        >
          {loading ? 'Opening secure Stripe setup…' : 'Set up payouts with Stripe'}
        </button>

        {message ? (
          <p className="mt-4 text-sm font-medium text-red-600">{message}</p>
        ) : null}
      </div>
    </details>
  )
}

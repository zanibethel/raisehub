'use client'

import { useState } from 'react'

import { startOrganizationStripeOnboardingAction } from '@/app/organizations/stripe-connect-actions'

type OrganizationPayoutSetupCardProps = {
  organizationId: string
  status: string
  payoutsEnabled: boolean
  detailsSubmitted: boolean
}

function statusCopy(input: OrganizationPayoutSetupCardProps) {
  if (input.payoutsEnabled) {
    return {
      title: 'Payout account connected',
      body: 'Stripe has approved this organization to receive payouts.',
      button: 'Review payout details',
    }
  }

  if (input.detailsSubmitted) {
    return {
      title: 'Stripe is reviewing payout details',
      body: 'Open Stripe to review any remaining requirements or update account information.',
      button: 'Continue in Stripe',
    }
  }

  if (input.status === 'in_progress') {
    return {
      title: 'Finish payout setup',
      body: 'Complete Stripe’s secure verification before campaign funds can be transferred.',
      button: 'Continue payout setup',
    }
  }

  return {
    title: 'Connect payouts before collecting funds',
    body: 'Stripe securely verifies the organization and bank account used to receive campaign proceeds.',
    button: 'Set up payouts with Stripe',
  }
}

export default function OrganizationPayoutSetupCard(
  props: OrganizationPayoutSetupCardProps
) {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const copy = statusCopy(props)

  async function handleOnboarding() {
    if (loading) return

    setLoading(true)
    setMessage('')

    const result = await startOrganizationStripeOnboardingAction(
      props.organizationId
    )

    if (result.status === 'onboarding-ready') {
      window.location.assign(result.url)
      return
    }

    setMessage(result.message)
    setLoading(false)
  }

  return (
    <section className="mt-6 rounded-3xl border border-blue-100 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
            Organization payouts
          </p>
          <h2 className="mt-1 text-xl font-bold text-gray-900">{copy.title}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
            {copy.body}
          </p>
          <p className="mt-2 text-xs text-gray-500">
            Test mode only. No real funds will move during this QA sprint.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOnboarding}
          disabled={loading}
          className="shrink-0 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? 'Opening Stripe…' : copy.button}
        </button>
      </div>

      {message ? (
        <p className="mt-4 text-sm font-medium text-red-600">{message}</p>
      ) : null}
    </section>
  )
}

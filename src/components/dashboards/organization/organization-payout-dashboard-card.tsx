'use client'

import { useEffect, useState } from 'react'

import { startOrganizationStripeOnboardingAction } from '@/app/organizations/stripe-connect-actions'
import { getOrganizationStripeStatusAction } from '@/app/organizations/stripe-connect-status-actions'

type StripeStatus = {
  onboardingStatus: string
  payoutsEnabled: boolean
  detailsSubmitted: boolean
  chargesEnabled: boolean
}

function getStatusCopy(status: StripeStatus | null, checking: boolean) {
  if (checking) {
    return {
      badge: 'Checking status',
      badgeClassName: 'bg-gray-100 text-gray-700',
      title: 'Checking payout readiness',
      body: 'RaiseHub is loading the latest Stripe verification status.',
      button: 'Open Stripe',
    }
  }

  if (
    status?.onboardingStatus === 'enabled' &&
    status.detailsSubmitted &&
    status.payoutsEnabled
  ) {
    return {
      badge: 'Payouts ready',
      badgeClassName: 'bg-green-50 text-green-700',
      title: 'Payout account connected',
      body: status.chargesEnabled
        ? 'Stripe verification is complete. This organization can receive campaign proceeds.'
        : 'Stripe verification is complete and payouts are enabled for this organization.',
      button: 'Review payout details',
    }
  }

  if (status?.detailsSubmitted) {
    return {
      badge: 'Under review',
      badgeClassName: 'bg-amber-50 text-amber-700',
      title: 'Stripe is reviewing payout details',
      body: 'Open Stripe to review any remaining requirements or update account information.',
      button: 'Continue in Stripe',
    }
  }

  if (status?.onboardingStatus === 'in_progress') {
    return {
      badge: 'Setup in progress',
      badgeClassName: 'bg-amber-50 text-amber-700',
      title: 'Finish secure campaign payout setup',
      body: 'Complete Stripe verification before campaign proceeds can be transferred.',
      button: 'Continue payout setup',
    }
  }

  return {
    badge: 'Setup required',
    badgeClassName: 'bg-amber-50 text-amber-700',
    title: 'Set up secure campaign payouts',
    body: 'Connect and verify your organization with Stripe before campaign proceeds can be transferred.',
    button: 'Set up payouts with Stripe',
  }
}

export default function OrganizationPayoutDashboardCard() {
  const [organizationId, setOrganizationId] = useState('')
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [message, setMessage] = useState('')
  const [stripeStatus, setStripeStatus] = useState<StripeStatus | null>(null)
  const copy = getStatusCopy(stripeStatus, checking)
  const isReady = Boolean(
    !checking &&
      stripeStatus?.onboardingStatus === 'enabled' &&
      stripeStatus.detailsSubmitted &&
      stripeStatus.payoutsEnabled,
  )

  useEffect(() => {
    let cancelled = false

    async function loadStatus() {
      setChecking(true)
      setMessage('')

      const result = await getOrganizationStripeStatusAction()

      if (cancelled) return

      if (result.status === 'ok') {
        setOrganizationId(result.organizationId)
        setStripeStatus({
          onboardingStatus: result.onboardingStatus,
          payoutsEnabled: result.payoutsEnabled,
          detailsSubmitted: result.detailsSubmitted,
          chargesEnabled: result.chargesEnabled,
        })
      } else {
        setOrganizationId('')
        setStripeStatus(null)
        setMessage(result.message)
      }

      setChecking(false)
    }

    void loadStatus()

    return () => {
      cancelled = true
    }
  }, [])

  async function handleOnboarding() {
    if (loading || checking) return

    setLoading(true)
    setMessage('')

    const result = await startOrganizationStripeOnboardingAction(organizationId)

    if (result.status === 'onboarding-ready') {
      window.location.assign(result.url)
      return
    }

    setMessage(result.message)
    setLoading(false)
  }

  return (
    <details
      className={
        isReady
          ? 'group py-3'
          : 'group my-3 rounded-2xl border border-amber-200 bg-amber-50/80 shadow-sm'
      }
    >
      <summary
        className={
          isReady
            ? 'flex cursor-pointer list-none items-center justify-between gap-4'
            : 'flex cursor-pointer list-none items-center justify-between gap-4 p-5 sm:p-6'
        }
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-gray-900">Payouts & Stripe</p>
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${copy.badgeClassName}`}>
              {copy.badge}
            </span>
            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
              Test mode
            </span>
          </div>
          {!isReady ? (
            <>
              <h2 className="mt-2 text-xl font-bold text-gray-900">{copy.title}</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">{copy.body}</p>
            </>
          ) : null}
        </div>

        <span className="shrink-0 rounded-full bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 group-open:hidden">
          {isReady ? 'View' : 'Fix'}
        </span>
        <span className="hidden shrink-0 rounded-full bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 group-open:inline">
          Hide
        </span>
      </summary>

      <div className={isReady ? 'mt-3 border-t border-blue-100 pt-4' : 'border-t border-amber-200 p-5 sm:p-6'}>
        <p className="text-sm leading-6 text-gray-600">{copy.body}</p>
        <p className="mt-2 text-xs font-medium text-blue-700">
          Production-site QA is using Stripe test mode. No real funds or live connected accounts will be created.
        </p>

        <button
          type="button"
          onClick={handleOnboarding}
          disabled={loading || checking || !organizationId}
          className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-center text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        >
          {loading ? 'Opening secure Stripe setup…' : copy.button}
        </button>

        {message ? (
          <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-medium leading-6 text-red-700">
            {message}
          </p>
        ) : null}
      </div>
    </details>
  )
}

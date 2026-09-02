'use client'

import { useEffect, useState } from 'react'

import { startOrganizationStripeOnboardingAction } from '@/app/organizations/stripe-connect-actions'
import { getOrganizationStripeStatusAction } from '@/app/organizations/stripe-connect-status-actions'
import { useWorkspaceStatusReporter } from './organization-workspace-status'

type StripeStatus = {
  onboardingStatus: string
  payoutsEnabled: boolean
  detailsSubmitted: boolean
  chargesEnabled: boolean
  livemode: boolean | null
  payoutReady: boolean
  mode: 'test' | 'live'
  blockers: string[]
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

  if (status?.payoutReady) {
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
      badge: 'Needs attention',
      badgeClassName: 'bg-amber-50 text-amber-700',
      title: 'Stripe payout setup needs attention',
      body: status.blockers[0] ?? 'Open Stripe to review remaining requirements or update account information.',
      button: 'Continue in Stripe',
    }
  }

  if (status?.onboardingStatus === 'in_progress') {
    return {
      badge: 'Setup in progress',
      badgeClassName: 'bg-amber-50 text-amber-700',
      title: 'Finish secure campaign payout setup',
      body: status.blockers[0] ?? 'Complete Stripe verification before campaign proceeds can be transferred.',
      button: 'Continue payout setup',
    }
  }

  return {
    badge: 'Setup required',
    badgeClassName: 'bg-amber-50 text-amber-700',
    title: 'Set up secure campaign payouts',
    body: status?.blockers[0] ?? 'Connect and verify your organization with Stripe before campaign proceeds can be transferred.',
    button: 'Set up Stripe payouts',
  }
}

export default function OrganizationPayoutDashboardCard() {
  const [organizationId, setOrganizationId] = useState('')
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [message, setMessage] = useState('')
  const [stripeStatus, setStripeStatus] = useState<StripeStatus | null>(null)
  const reportStatus = useWorkspaceStatusReporter()
  const copy = getStatusCopy(stripeStatus, checking)
  const isReady = Boolean(!checking && stripeStatus?.payoutReady)

  useEffect(() => {
    reportStatus('payouts', checking ? 'checking' : isReady ? 'complete' : 'attention')
  }, [checking, isReady, reportStatus])

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
          livemode: result.livemode,
          payoutReady: result.payoutReady,
          mode: result.mode,
          blockers: result.blockers,
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

  const environmentLabel = stripeStatus?.mode === 'live' ? 'Live payouts' : 'Test payouts'

  return (
    <details id="organization-payouts" className={isReady ? 'group py-3' : 'group my-3 scroll-mt-6 rounded-2xl border border-amber-200 bg-amber-50/80 shadow-sm'}>
      <summary className={isReady ? 'flex cursor-pointer list-none items-center justify-between gap-3' : 'flex cursor-pointer list-none items-start justify-between gap-3 p-4 sm:p-5'}>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-gray-900">Payouts & Stripe</p>
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${copy.badgeClassName}`}>{copy.badge}</span>
            {stripeStatus ? (
              <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">{environmentLabel}</span>
            ) : null}
          </div>
          {!isReady ? (
            <>
              <h2 className="mt-2 text-lg font-bold leading-6 text-gray-900 sm:text-xl">{copy.title}</h2>
              <p className="mt-1.5 max-w-2xl text-sm leading-5 text-gray-600 sm:leading-6">{copy.body}</p>
            </>
          ) : null}
        </div>

        <span className="shrink-0 rounded-full bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 group-open:hidden">{isReady ? 'View' : 'Open'}</span>
        <span className="hidden shrink-0 rounded-full bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 group-open:inline">Hide</span>
      </summary>

      <div className={isReady ? 'mt-3 border-t border-blue-100 pt-4' : 'border-t border-amber-200 p-4 sm:p-5'}>
        <p className="text-sm leading-5 text-gray-600 sm:leading-6">{copy.body}</p>
        {!isReady && stripeStatus?.blockers.length ? (
          <ul className="mt-3 space-y-2 text-sm text-amber-900">
            {stripeStatus.blockers.map((blocker) => (
              <li key={blocker} className="rounded-lg bg-white/70 px-3 py-2">{blocker}</li>
            ))}
          </ul>
        ) : null}
        <p className="mt-2 text-xs font-medium text-blue-700">
          {stripeStatus?.mode === 'live'
            ? 'Live campaign proceeds will remain held until Stripe payout setup is complete.'
            : 'This environment uses Stripe test payouts. No real funds or live connected accounts will be created.'}
        </p>
        <button type="button" onClick={handleOnboarding} disabled={loading || checking || !organizationId} className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-center text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto">
          {loading ? 'Opening secure Stripe setup…' : copy.button}
        </button>
        {message ? <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-medium leading-6 text-red-700">{message}</p> : null}
      </div>
    </details>
  )
}

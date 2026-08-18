'use client'

import { useState } from 'react'

type UpgradeActionsProps = {
  businessId: string
  currentPlanCode: string
  subscriptionStatus: string
  cancelAtPeriodEnd: boolean
  currentPeriodEnd: string | null
  isDemo: boolean
}

type PlanCode = 'growth_monthly' | 'growth_annual'

function periodEndLabel(value: string | null) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function UpgradeActions({
  businessId,
  currentPlanCode,
  subscriptionStatus,
  cancelAtPeriodEnd,
  currentPeriodEnd,
  isDemo,
}: UpgradeActionsProps) {
  const [loading, setLoading] = useState<PlanCode | 'portal' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const hasBillingAccount = currentPlanCode !== 'free' || subscriptionStatus !== 'inactive'
  const growthActive = ['trialing', 'active', 'past_due'].includes(subscriptionStatus)
  const periodEnd = periodEndLabel(currentPeriodEnd)

  async function startCheckout(planCode: PlanCode) {
    if (isDemo) return
    setLoading(planCode)
    setError(null)

    try {
      const response = await fetch('/api/business/billing/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ businessId, planCode }),
      })
      const payload = await response.json()
      if (!response.ok || !payload.url) {
        throw new Error(payload.error || 'Could not start Stripe Checkout.')
      }
      window.location.assign(payload.url)
    } catch (checkoutError) {
      setError(
        checkoutError instanceof Error
          ? checkoutError.message
          : 'Could not start Stripe Checkout.'
      )
      setLoading(null)
    }
  }

  async function openPortal() {
    if (isDemo) return
    setLoading('portal')
    setError(null)

    try {
      const response = await fetch('/api/business/billing/portal', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ businessId }),
      })
      const payload = await response.json()
      if (!response.ok || !payload.url) {
        throw new Error(payload.error || 'Could not open billing management.')
      }
      window.location.assign(payload.url)
    } catch (portalError) {
      setError(
        portalError instanceof Error
          ? portalError.message
          : 'Could not open billing management.'
      )
      setLoading(null)
    }
  }

  if (isDemo) {
    return (
      <div className="rounded-2xl border border-violet-200 bg-violet-50 p-5 text-sm text-violet-900">
        <p className="font-bold">Demo billing is simulated.</p>
        <p className="mt-2 leading-6">
          Demo businesses never create Stripe customers or subscriptions. Switch to a production Business workspace to test real billing.
        </p>
      </div>
    )
  }

  if (growthActive) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-green-200 bg-green-50 p-5">
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-green-700">Growth active</p>
          <p className="mt-2 text-lg font-bold text-green-950">
            {currentPlanCode === 'growth_annual' ? 'Annual Growth plan' : 'Monthly Growth plan'}
          </p>
          <p className="mt-2 text-sm leading-6 text-green-800">
            {cancelAtPeriodEnd
              ? `Your plan is scheduled to end${periodEnd ? ` on ${periodEnd}` : ' at the end of the current billing period'}. Growth access stays active until then.`
              : subscriptionStatus === 'past_due'
                ? 'Stripe is retrying a payment. Growth access remains available while billing recovery is in progress.'
                : `Your subscription is active${periodEnd ? ` through the current period ending ${periodEnd}` : ''}.`}
          </p>
        </div>

        <button
          type="button"
          onClick={openPortal}
          disabled={loading !== null}
          className="w-full rounded-xl bg-blue-700 px-5 py-3.5 font-bold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading === 'portal' ? 'Opening Stripe…' : 'Manage Billing in Stripe'}
        </button>

        <p className="text-center text-xs leading-5 text-slate-500">
          Update your payment method, review invoices, or cancel your subscription in Stripe’s secure customer portal.
        </p>

        {error ? <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => startCheckout('growth_monthly')}
          disabled={loading !== null}
          className="rounded-2xl border-2 border-blue-200 bg-white p-5 text-left transition hover:border-blue-500 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
        >
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-blue-700">Monthly</p>
          <p className="mt-2 text-3xl font-black text-slate-950">$11.99</p>
          <p className="text-sm text-slate-500">per month</p>
          <p className="mt-4 text-sm font-bold text-blue-700">
            {loading === 'growth_monthly' ? 'Opening Stripe…' : 'Choose Monthly →'}
          </p>
        </button>

        <button
          type="button"
          onClick={() => startCheckout('growth_annual')}
          disabled={loading !== null}
          className="relative rounded-2xl border-2 border-green-300 bg-green-50 p-5 text-left transition hover:border-green-600 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span className="absolute right-4 top-4 rounded-full bg-green-700 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-white">Best value</span>
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-green-700">Annual</p>
          <p className="mt-2 text-3xl font-black text-slate-950">$74.99</p>
          <p className="text-sm text-slate-500">per year</p>
          <p className="mt-4 text-sm font-bold text-green-700">
            {loading === 'growth_annual' ? 'Opening Stripe…' : 'Choose Annual →'}
          </p>
        </button>
      </div>

      {hasBillingAccount ? (
        <button
          type="button"
          onClick={openPortal}
          disabled={loading !== null}
          className="w-full rounded-xl border border-slate-300 bg-white px-5 py-3 font-bold text-slate-700 hover:border-slate-400 disabled:opacity-60"
        >
          {loading === 'portal' ? 'Opening Stripe…' : 'Manage Existing Billing'}
        </button>
      ) : null}

      {error ? <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
    </div>
  )
}

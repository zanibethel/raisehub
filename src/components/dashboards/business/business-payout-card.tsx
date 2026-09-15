'use client'

import { useState, useTransition } from 'react'

import type { BusinessPayoutStatus } from '@/lib/stripe/business-connect'
import { startBusinessPayoutSetupAction } from './business-partner-rewards-actions'

type Props = {
  businessId: string | null
  status: BusinessPayoutStatus | null
}

function statusLabel(status: BusinessPayoutStatus | null) {
  if (!status) return 'Unavailable'
  if (status.isDemo) return 'Demo only'
  if (status.payoutReady) return 'Payout ready'
  if (!status.accountExists) return 'Not started'
  if (status.onboardingStatus === 'restricted') return 'Needs attention'
  if (status.onboardingStatus === 'in_progress') return 'In progress'
  return status.onboardingStatus.replaceAll('_', ' ')
}

export default function BusinessPayoutCard({ businessId, status }: Props) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const ready = status?.payoutReady === true
  const demo = status?.isDemo === true

  function startSetup() {
    if (!businessId || pending || demo) return
    setError(null)
    startTransition(async () => {
      const result = await startBusinessPayoutSetupAction(businessId)
      if (!result.success) {
        setError(result.error)
        return
      }
      window.location.assign(result.url)
    })
  }

  return (
    <section className={`rounded-2xl border p-4 shadow-sm sm:p-5 ${ready ? 'border-emerald-200 bg-emerald-50' : 'border-blue-200 bg-blue-50'}`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <p className={`text-xs font-black uppercase tracking-[0.14em] ${ready ? 'text-emerald-700' : 'text-blue-700'}`}>
            Cash payout readiness
          </p>
          <h3 className="mt-1 text-xl font-black text-slate-950">Stripe payout account</h3>
          <p className="mt-1 text-sm leading-6 text-slate-700">
            Partner Points can be earned without Stripe. A verified Stripe Connect account is only required before RaiseHub can send a cash Partner Reward.
          </p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-black capitalize ${ready ? 'bg-emerald-100 text-emerald-800' : 'bg-white text-slate-700'}`}>
          {statusLabel(status)}
        </span>
      </div>

      {demo ? (
        <div className="mt-4 rounded-xl border border-dashed border-blue-300 bg-white px-4 py-3 text-sm text-slate-700">
          Demo businesses do not create real Stripe accounts. In production, this card opens secure Stripe Connect onboarding.
        </div>
      ) : ready ? (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-white px-4 py-3 text-sm font-bold text-emerald-800">
          Stripe onboarding is complete and payouts are enabled. This business is ready to receive a cash Partner Reward once a quarter-end reward is finalized.
        </div>
      ) : (
        <div className="mt-4">
          {status?.blockers?.length ? (
            <ul className="space-y-1 text-sm text-slate-700">
              {status.blockers.slice(0, 3).map((blocker) => (
                <li key={blocker}>• {blocker}</li>
              ))}
            </ul>
          ) : null}
          <button
            type="button"
            disabled={!businessId || pending}
            onClick={startSetup}
            className="mt-4 inline-flex min-h-10 items-center justify-center rounded-xl bg-blue-700 px-4 text-sm font-black text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {pending
              ? 'Opening Stripe…'
              : status?.accountExists
                ? 'Continue Stripe setup'
                : 'Set up payouts'}
          </button>
        </div>
      )}

      {error ? (
        <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-bold text-rose-800">
          {error}
        </p>
      ) : null}
    </section>
  )
}

import Link from 'next/link'
import { redirect } from 'next/navigation'

import { listFinalizedPartnerRewardAwards } from '@/lib/services/partner-rewards-payout-service'
import { createClient } from '@/lib/supabase/server'

import { payPartnerRewardAwardAction } from '../actions'

export const metadata = {
  title: 'Partner Rewards Payouts | RaiseHub Owner Console',
}

function money(cents: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100)
}

function number(value: number) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(value)
}

function percent(value: number | null) {
  return value === null ? '—' : `${(value * 100).toFixed(2)}%`
}

function payoutLabel(status: string | null) {
  switch (status) {
    case 'pending': return 'Processing'
    case 'submitted': return 'Transferred to Stripe'
    case 'paid': return 'Paid'
    case 'failed': return 'Failed'
    case 'reversed': return 'Reversed'
    default: return 'Not submitted'
  }
}

export default async function PartnerRewardsPayoutPage({
  searchParams,
}: {
  searchParams: Promise<{ paid?: string; error?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle<{ role: string }>()

  if (profile?.role !== 'owner') redirect('/dashboard')

  const awards = await listFinalizedPartnerRewardAwards()
  const totalAwarded = awards.reduce((sum, award) => sum + award.awardCents, 0)
  const transferred = awards.reduce(
    (sum, award) => sum + (award.payout && ['submitted', 'paid'].includes(award.payout.status) ? award.payout.amountCents : 0),
    0
  )
  const failed = awards.reduce(
    (sum, award) => sum + (award.payout?.status === 'failed' ? award.payout.amountCents : 0),
    0
  )
  const remaining = Math.max(totalAwarded - transferred, 0)

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <Link href="/dashboard/owner/partner-rewards" className="text-sm font-bold text-blue-700 hover:text-blue-900">
          ← Back to Partner Rewards report
        </Link>

        <header className="mt-4 rounded-3xl bg-slate-950 px-5 py-6 text-white shadow-lg sm:px-7">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-300">Owner disbursement control</p>
          <h1 className="mt-1 text-2xl font-black sm:text-3xl">Finalized Partner Rewards Payouts</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
            Finalized awards are immutable. Sending a payout creates a separate Stripe transfer record and never changes the quarter-close award.
          </p>
        </header>

        {params.paid ? (
          <div className="mt-5 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm font-bold text-green-900">
            Partner Reward transferred to Stripe successfully. Transfer: {params.paid}
          </div>
        ) : null}
        {params.error ? (
          <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-900">
            {params.error}
          </div>
        ) : null}

        <section className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-black uppercase tracking-wide text-slate-500">Final awards</p>
            <p className="mt-1 text-2xl font-black text-slate-950">{money(totalAwarded)}</p>
          </div>
          <div className="rounded-2xl border border-green-200 bg-green-50 p-4 shadow-sm">
            <p className="text-xs font-black uppercase tracking-wide text-green-700">Transferred to Stripe</p>
            <p className="mt-1 text-2xl font-black text-slate-950">{money(transferred)}</p>
          </div>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
            <p className="text-xs font-black uppercase tracking-wide text-amber-700">Remaining</p>
            <p className="mt-1 text-2xl font-black text-slate-950">{money(remaining)}</p>
          </div>
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 shadow-sm">
            <p className="text-xs font-black uppercase tracking-wide text-rose-700">Failed</p>
            <p className="mt-1 text-2xl font-black text-slate-950">{money(failed)}</p>
          </div>
        </section>

        <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-green-700">Final award ledger</p>
            <h2 className="mt-1 text-xl font-black text-slate-950">Review and submit payouts</h2>
            <p className="mt-1 text-sm text-slate-600">
              A successful transfer moves the award into the business&apos;s connected Stripe balance. Bank settlement remains subject to that account&apos;s Stripe payout schedule.
            </p>
          </div>

          {awards.length === 0 ? (
            <div className="mt-5 rounded-xl bg-slate-50 p-5 text-sm text-slate-600">
              No finalized Partner Rewards awards are available yet. Awards appear here after a quarter closes.
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-3 py-3">Quarter / Business</th>
                    <th className="px-3 py-3">Points</th>
                    <th className="px-3 py-3">Share</th>
                    <th className="px-3 py-3">Final award</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {awards.map((award) => {
                    const status = award.payout?.status ?? null
                    const canSubmit = !award.payout || status === 'failed'
                    return (
                      <tr key={award.awardId} className="border-b border-slate-100 align-top last:border-0">
                        <td className="px-3 py-3">
                          <div className="font-black text-slate-950">{award.periodLabel}</div>
                          <div className="mt-0.5 font-bold text-slate-700">{award.businessName}</div>
                        </td>
                        <td className="px-3 py-3">{number(award.eligiblePoints)}</td>
                        <td className="px-3 py-3">{percent(award.finalShareFraction)}</td>
                        <td className="px-3 py-3 font-black">{money(award.awardCents)}</td>
                        <td className="px-3 py-3">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-black ${
                            status === 'submitted' || status === 'paid'
                              ? 'bg-green-100 text-green-800'
                              : status === 'failed' || status === 'reversed'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800'
                          }`}>
                            {payoutLabel(status)}
                          </span>
                          {award.payout?.stripeTransferId ? (
                            <div className="mt-1 max-w-52 truncate text-xs text-slate-500" title={award.payout.stripeTransferId}>
                              {award.payout.stripeTransferId}
                            </div>
                          ) : null}
                          {award.payout?.failureMessage ? (
                            <div className="mt-1 max-w-64 text-xs text-rose-700">{award.payout.failureMessage}</div>
                          ) : null}
                        </td>
                        <td className="px-3 py-3">
                          {canSubmit ? (
                            <form action={payPartnerRewardAwardAction}>
                              <input type="hidden" name="awardId" value={award.awardId} />
                              <button
                                type="submit"
                                className="rounded-xl bg-slate-950 px-3 py-2 text-xs font-black text-white transition hover:bg-green-700"
                              >
                                {status === 'failed' ? 'Retry payout' : 'Send payout'}
                              </button>
                            </form>
                          ) : (
                            <span className="text-xs font-bold text-slate-500">No action needed</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}

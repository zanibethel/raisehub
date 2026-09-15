import Link from 'next/link'
import { redirect } from 'next/navigation'

import { getOwnerPartnerRewardsQuarterReport } from '@/lib/services/partner-rewards-quarter-report-service'
import { createClient } from '@/lib/supabase/server'

export const metadata = {
  title: 'Partner Rewards Report | RaiseHub Owner Console',
}

function money(cents: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100)
}

function number(value: number) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(value)
}

function percent(value: number | null) {
  if (value === null) return '—'
  return `${(value * 100).toFixed(2)}%`
}

function centralDate(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(new Date(value))
}

export default async function OwnerPartnerRewardsReportPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle<{ role: string }>()

  if (profile?.role !== 'owner') redirect('/dashboard')

  const result = await getOwnerPartnerRewardsQuarterReport()

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <Link href="/dashboard?workspace=owner" className="text-sm font-bold text-blue-700 hover:text-blue-900">
          ← Back to Owner Console
        </Link>

        <header className="mt-4 rounded-3xl bg-slate-950 px-5 py-6 text-white shadow-lg sm:px-7">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-300">Owner reporting</p>
          <h1 className="mt-1 text-2xl font-black sm:text-3xl">Quarterly Partner Rewards</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
            Running sales, Partner Points, projected pool share, expected business rewards, and payout readiness. Reporting windows follow Central Time.
          </p>
        </header>

        {result.status !== 'success' ? (
          <section className="mt-5 rounded-2xl border border-amber-200 bg-white p-5 shadow-sm">
            <h2 className="font-black text-slate-950">Report unavailable</h2>
            <p className="mt-1 text-sm text-slate-600">{result.message}</p>
          </section>
        ) : (
          <>
            <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-green-700">Running report</p>
                  <h2 className="mt-1 text-2xl font-black text-slate-950">{result.report.label}</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    {centralDate(result.report.startsAt)} → just before {centralDate(result.report.endsAt)}
                  </p>
                </div>
                <div className="rounded-xl bg-slate-100 px-3 py-2 text-right text-xs text-slate-600">
                  <p className="font-black uppercase tracking-wide text-slate-500">Last refreshed</p>
                  <p className="mt-1 font-bold">{result.report.lastRefreshedAt ? centralDate(result.report.lastRefreshedAt) : 'Not yet'}</p>
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-2xl border border-slate-200 p-4">
                  <p className="text-xs font-black uppercase tracking-wide text-slate-500">Qualifying sales</p>
                  <p className="mt-1 text-2xl font-black text-slate-950">{money(result.report.qualifyingSalesCents)}</p>
                  <p className="mt-1 text-xs text-slate-500">Pass sales net of recorded refunds</p>
                </div>
                <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
                  <p className="text-xs font-black uppercase tracking-wide text-blue-700">RaiseHub retained · 15%</p>
                  <p className="mt-1 text-2xl font-black text-slate-950">{money(result.report.platformRetainedCents)}</p>
                </div>
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-xs font-black uppercase tracking-wide text-amber-700">Partner Rewards Pool · 5%</p>
                  <p className="mt-1 text-2xl font-black text-slate-950">{money(result.report.partnerRewardsPoolCents)}</p>
                </div>
                <div className="rounded-2xl border border-green-200 bg-green-50 p-4">
                  <p className="text-xs font-black uppercase tracking-wide text-green-700">Expected disbursement</p>
                  <p className="mt-1 text-2xl font-black text-slate-950">{money(result.report.expectedDisbursementCents)}</p>
                </div>
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs font-bold text-slate-500">Eligible points</p>
                  <p className="mt-1 text-lg font-black text-slate-950">{number(result.report.eligiblePoints)}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs font-bold text-slate-500">Pending points</p>
                  <p className="mt-1 text-lg font-black text-amber-700">{number(result.report.pendingPoints)}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs font-bold text-slate-500">Payout ready</p>
                  <p className="mt-1 text-lg font-black text-green-700">{money(result.report.payoutReadyCents)}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs font-bold text-slate-500">Blocked / setup needed</p>
                  <p className="mt-1 text-lg font-black text-rose-700">{money(result.report.payoutBlockedCents)}</p>
                </div>
              </div>
            </section>

            <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.14em] text-green-700">Business allocation</p>
                <h2 className="mt-1 text-xl font-black text-slate-950">Expected rewards by business</h2>
                <p className="mt-1 text-sm text-slate-600">These remain estimates until the quarter is finalized.</p>
              </div>

              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                      <th className="px-3 py-3">Business</th>
                      <th className="px-3 py-3">Eligible</th>
                      <th className="px-3 py-3">Pending</th>
                      <th className="px-3 py-3">Pool share</th>
                      <th className="px-3 py-3">Expected reward</th>
                      <th className="px-3 py-3">Payout</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.businesses.map((business) => (
                      <tr key={business.businessId} className="border-b border-slate-100 last:border-0">
                        <td className="px-3 py-3 font-bold text-slate-950">
                          {business.businessName}
                          <div className="mt-0.5 text-xs font-medium capitalize text-slate-500">{business.verificationStatus.replaceAll('_', ' ')}</div>
                        </td>
                        <td className="px-3 py-3">{number(business.eligiblePoints)}</td>
                        <td className="px-3 py-3">{number(business.pendingPoints)}</td>
                        <td className="px-3 py-3">{percent(business.shareFraction)}</td>
                        <td className="px-3 py-3 font-black">{money(business.expectedRewardCents)}</td>
                        <td className="px-3 py-3">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-black ${business.stripePayoutReady ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                            {business.stripePayoutReady ? 'Ready' : 'Setup needed'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  )
}

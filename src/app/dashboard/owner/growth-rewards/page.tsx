import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { setFounderRewardsAction } from './actions'

export const metadata = { title: 'Growth Rewards | RaiseHub Owner Console' }

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> }

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

export default async function OwnerGrowthRewardsPage({ searchParams }: PageProps) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle<{ role: string }>()
  if (profile?.role !== 'owner') redirect('/dashboard')

  const admin = createAdminClient() as any
  const { data } = await admin
    .from('businesses')
    .select('id,name,is_demo,founder_status,founder_multiplier,founder_multiplier_ends_at,status')
    .eq('status', 'active')
    .order('created_at', { ascending: true })

  const businesses = (data ?? []) as any[]
  const founders = businesses.filter((business) => business.founder_status)
  const saved = firstParam(params.saved)
  const error = firstParam(params.error)

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <Link href="/dashboard/owner/manage" className="text-sm font-black text-blue-700">← Back to Manage Platform</Link>
        <header className="mt-4 rounded-3xl bg-slate-950 p-6 text-white shadow-lg">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-300">Partner Rewards controls</p>
          <h1 className="mt-1 text-3xl font-black">Founder & Growth Rewards</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-300">Founder status is a permanent recognition flag. The multiplier applies only to renewable activity such as active-offer daily points and verified customer activity—not fixed bonuses, referrals, or legacy milestones.</p>
          <div className="mt-4 rounded-2xl bg-white/10 p-4 sm:w-fit"><span className="text-3xl font-black">{founders.length}</span><span className="ml-2 text-sm font-bold text-slate-300">Founder businesses</span></div>
        </header>

        {saved ? <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-3 text-sm font-bold text-green-800">Founder rewards updated.</div> : null}
        {error ? <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-bold text-rose-800">Founder rewards could not be updated.</div> : null}

        <section className="mt-5 space-y-3">
          {businesses.map((business) => (
            <article key={business.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-black text-slate-950">{business.name}</h2>
                    {business.is_demo ? <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-black text-blue-800">Demo</span> : null}
                    {business.founder_status ? <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-black text-amber-800">Founder</span> : null}
                  </div>
                  <p className="mt-1 text-sm text-slate-500">Current multiplier: {Number(business.founder_multiplier || 1).toFixed(2)}×{business.founder_multiplier_ends_at ? ` · through ${new Date(business.founder_multiplier_ends_at).toLocaleDateString()}` : ''}</p>
                </div>
              </div>

              <form action={setFounderRewardsAction} className="mt-4 grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-[auto_140px_180px_auto] sm:items-end">
                <input type="hidden" name="businessId" value={business.id} />
                <label className="text-sm font-bold text-slate-700">
                  Founder status
                  <select name="enabled" defaultValue={business.founder_status ? 'true' : 'false'} className="mt-1 block min-h-10 w-full rounded-lg border border-slate-300 px-3">
                    <option value="true">Founder</option>
                    <option value="false">Not founder</option>
                  </select>
                </label>
                <label className="text-sm font-bold text-slate-700">
                  Multiplier
                  <input name="multiplier" type="number" min="1" max="3" step="0.05" defaultValue={business.founder_status ? Number(business.founder_multiplier || 1.25) : 1.25} className="mt-1 block min-h-10 w-full rounded-lg border border-slate-300 px-3" />
                </label>
                <label className="text-sm font-bold text-slate-700">
                  Multiplier end date
                  <input name="endsAt" type="date" defaultValue={business.founder_multiplier_ends_at ? new Date(business.founder_multiplier_ends_at).toISOString().slice(0,10) : ''} className="mt-1 block min-h-10 w-full rounded-lg border border-slate-300 px-3" />
                </label>
                <button className="min-h-10 rounded-lg bg-slate-950 px-4 text-sm font-black text-white">Save</button>
              </form>
            </article>
          ))}
        </section>
      </div>
    </main>
  )
}

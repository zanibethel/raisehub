import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export const metadata = { title: 'Business Referral Report | RaiseHub Owner Console' }

function formatDate(value: string | null) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value))
}

export default async function OwnerReferralReportPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle<{ role: string }>()
  if (profile?.role !== 'owner') redirect('/dashboard')

  const admin = createAdminClient() as any
  const { data } = await admin
    .from('partner_referral_report')
    .select('*')
    .order('attributed_at', { ascending: false, nullsFirst: false })

  const rows = (data ?? []) as any[]
  const verified = rows.filter((row) => row.status === 'verified' || row.status === 'rewarded').length
  const pending = rows.filter((row) => row.status === 'pending_verification').length
  const points = rows.reduce((sum, row) => sum + Number(row.referral_points_awarded || 0), 0)

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <Link href="/dashboard/owner/manage" className="text-sm font-black text-blue-700">← Back to Manage Platform</Link>
        <header className="mt-4 rounded-3xl bg-slate-950 p-6 text-white shadow-lg">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-green-300">Growth reporting</p>
          <h1 className="mt-1 text-3xl font-black">Business Referral Report</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-300">Audit every business-to-business referral from attribution through signup, profile completion, verification, and Partner Point awards.</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-4">
            <Stat label="Total referrals" value={rows.length} />
            <Stat label="Pending verification" value={pending} />
            <Stat label="Verified" value={verified} />
            <Stat label="Points awarded" value={points} />
          </div>
        </header>

        <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {rows.length === 0 ? (
            <p className="p-5 text-sm text-slate-600">No business referrals have been attributed yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr><th className="px-4 py-3">Referrer</th><th className="px-4 py-3">Referred business</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Attributed</th><th className="px-4 py-3">Profile</th><th className="px-4 py-3">Verified</th><th className="px-4 py-3 text-right">Points</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((row) => (
                    <tr key={row.id}>
                      <td className="px-4 py-3 font-bold text-slate-950">{row.referring_business_name}</td>
                      <td className="px-4 py-3"><p className="font-bold text-slate-900">{row.referred_business_name || row.attributed_email || 'Invited business'}</p><p className="text-xs text-slate-500">{row.referral_token}</p></td>
                      <td className="px-4 py-3"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-700">{String(row.status).replaceAll('_',' ')}</span></td>
                      <td className="px-4 py-3 text-slate-600">{formatDate(row.attributed_at)}</td>
                      <td className="px-4 py-3 text-slate-600">{formatDate(row.profile_completed_at)}</td>
                      <td className="px-4 py-3 text-slate-600">{formatDate(row.verified_at)}</td>
                      <td className="px-4 py-3 text-right font-black text-green-700">+{Number(row.referral_points_awarded || 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return <div className="rounded-2xl bg-white/10 p-3"><p className="text-xs font-bold text-slate-300">{label}</p><p className="mt-1 text-2xl font-black">{value}</p></div>
}

import Link from 'next/link'
import { redirect } from 'next/navigation'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

import { reviewBusinessVerificationAction } from './actions'

export const metadata = {
  title: 'Business Verification | RaiseHub Owner Console',
}

type VerificationRow = {
  id: string
  business_id: string
  status: string
  application_cycle: number
  applied_at: string | null
  approved_at: string | null
  declined_at: string | null
  revoked_at: string | null
  review_note: string | null
}

type BusinessRow = {
  id: string
  name: string
  email: string | null
  phone: string | null
  address: string | null
  logo_url: string | null
  is_demo: boolean
  demo_group: string | null
}

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

function formatDate(value: string | null) {
  if (!value) return 'Not available'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

export default async function OwnerBusinessVerificationsPage({ searchParams }: PageProps) {
  const params = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle<{ role: string }>()

  if (profile?.role !== 'owner') redirect('/dashboard')

  const admin = createAdminClient() as any
  const [{ data: verificationData }, { data: businessData }] = await Promise.all([
    admin
      .from('business_verifications')
      .select('id, business_id, status, application_cycle, applied_at, approved_at, declined_at, revoked_at, review_note')
      .in('status', ['pending', 'approved'])
      .order('applied_at', { ascending: true, nullsFirst: false }),
    admin
      .from('businesses')
      .select('id, name, email, phone, address, logo_url, is_demo, demo_group')
      .eq('status', 'active'),
  ])

  const verifications = (verificationData ?? []) as VerificationRow[]
  const businessById = new Map(
    ((businessData ?? []) as BusinessRow[]).map((business) => [business.id, business])
  )
  const pending = verifications.filter((verification) => verification.status === 'pending')
  const approved = verifications.filter((verification) => verification.status === 'approved')
  const reviewed = firstParam(params.reviewed)
  const error = firstParam(params.error)

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <Link href="/dashboard?workspace=owner" className="text-sm font-bold text-blue-700 hover:text-blue-900">
          ← Back to Owner Console
        </Link>

        <header className="mt-4 flex flex-col gap-3 rounded-2xl bg-slate-950 px-5 py-5 text-white shadow-lg sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-green-300">Partner trust</p>
            <h1 className="mt-1 text-2xl font-black sm:text-3xl">Business Verification</h1>
            <p className="mt-1 text-sm text-slate-300">Approve legitimate businesses before production Partner Points become eligible.</p>
          </div>
          <div className="shrink-0 rounded-xl bg-white/10 px-4 py-3 text-center">
            <p className="text-2xl font-black">{pending.length}</p>
            <p className="text-xs font-bold text-slate-300">Pending review</p>
          </div>
        </header>

        {reviewed ? (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900">
            Business verification {reviewed}.
          </div>
        ) : null}

        {error ? (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-900">
            The verification decision could not be saved. Please try again.
          </div>
        ) : null}

        <section className="mt-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-amber-700">Needs attention</p>
              <h2 className="mt-1 text-xl font-black text-slate-950">Pending applications</h2>
            </div>
          </div>

          {pending.length === 0 ? (
            <div className="mt-3 rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm">
              <p className="font-black text-slate-950">Queue clear</p>
              <p className="mt-1 text-sm text-slate-600">No businesses currently need a verification decision.</p>
            </div>
          ) : (
            <div className="mt-3 space-y-3">
              {pending.map((verification) => {
                const business = businessById.get(verification.business_id)
                if (!business) return null
                return (
                  <article key={verification.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="flex min-w-0 items-start gap-3">
                        {business.logo_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={business.logo_url} alt="" className="h-12 w-12 rounded-xl border border-slate-200 object-contain" />
                        ) : (
                          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-lg font-black text-slate-700">
                            {business.name.charAt(0).toUpperCase()}
                          </span>
                        )}
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-black text-slate-950">{business.name}</h3>
                            {business.is_demo ? (
                              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-black text-blue-800">Demo</span>
                            ) : null}
                          </div>
                          <p className="mt-1 text-sm text-slate-600">{business.email || 'No email'} · {business.phone || 'No phone'}</p>
                          <p className="mt-1 text-sm text-slate-500">{business.address || 'No address'}</p>
                          <p className="mt-2 text-xs font-bold text-slate-500">Applied {formatDate(verification.applied_at)} · Cycle {verification.application_cycle}</p>
                        </div>
                      </div>
                    </div>

                    <form action={reviewBusinessVerificationAction} className="mt-4">
                      <input type="hidden" name="businessId" value={business.id} />
                      <label htmlFor={`note-${business.id}`} className="text-sm font-black text-slate-800">Review note</label>
                      <textarea
                        id={`note-${business.id}`}
                        name="note"
                        rows={2}
                        placeholder="Optional for approval. Recommended when declining."
                        className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      />
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button name="decision" value="approved" className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-black text-white hover:bg-emerald-700">
                          Approve +200
                        </button>
                        <button name="decision" value="declined" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-black text-rose-800 hover:bg-rose-100">
                          Decline
                        </button>
                      </div>
                    </form>
                  </article>
                )
              })}
            </div>
          )}
        </section>

        <section className="mt-8">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-green-700">Currently eligible</p>
          <h2 className="mt-1 text-xl font-black text-slate-950">Verified businesses</h2>
          <div className="mt-3 space-y-3">
            {approved.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600 shadow-sm">No businesses have been approved yet.</div>
            ) : approved.map((verification) => {
              const business = businessById.get(verification.business_id)
              if (!business) return null
              return (
                <article key={verification.id} className="flex flex-col gap-3 rounded-2xl border border-green-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-black text-slate-950">{business.name}</p>
                    <p className="mt-1 text-sm text-slate-600">Approved {formatDate(verification.approved_at)}</p>
                  </div>
                  <form action={reviewBusinessVerificationAction}>
                    <input type="hidden" name="businessId" value={business.id} />
                    <input type="hidden" name="note" value="Verification revoked by Owner." />
                    <button name="decision" value="revoked" className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 hover:bg-slate-50">
                      Revoke verification
                    </button>
                  </form>
                </article>
              )
            })}
          </div>
        </section>
      </div>
    </main>
  )
}

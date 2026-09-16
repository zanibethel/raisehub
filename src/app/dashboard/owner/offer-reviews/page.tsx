import Link from 'next/link'
import { redirect } from 'next/navigation'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

import { reviewBusinessOfferAction } from './actions'

export const metadata = {
  title: 'Offer Reviews | RaiseHub Owner Console',
}

type OfferRow = {
  id: string
  business_id: string
  title: string
  discount: string | null
  description: string | null
  starts_at: string | null
  ends_at: string | null
  created_at: string
  approval_status: string
  approval_submitted_at: string | null
  approval_review_note: string | null
  is_active: boolean
}

type BusinessRow = {
  id: string
  legacy_profile_id: string | null
  name: string
  logo_url: string | null
}

type VerificationRow = {
  business_id: string
  status: string
}

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

function formatDate(value: string | null) {
  if (!value) return 'Not set'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value))
}

export default async function OwnerOfferReviewsPage({ searchParams }: PageProps) {
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
  const [{ data: offersData }, { data: businessesData }, { data: verificationData }] = await Promise.all([
    admin
      .from('offers')
      .select('id,business_id,title,discount,description,starts_at,ends_at,created_at,approval_status,approval_submitted_at,approval_review_note,is_active')
      .in('approval_status', ['pending', 'approved', 'declined'])
      .order('approval_submitted_at', { ascending: true, nullsFirst: false }),
    admin
      .from('businesses')
      .select('id,legacy_profile_id,name,logo_url')
      .eq('status', 'active'),
    admin
      .from('business_verifications')
      .select('business_id,status'),
  ])

  const offers = (offersData ?? []) as OfferRow[]
  const businesses = (businessesData ?? []) as BusinessRow[]
  const verifications = (verificationData ?? []) as VerificationRow[]
  const verificationByBusiness = new Map(verifications.map((row) => [row.business_id, row.status]))
  const businessByOfferBusinessId = new Map<string, BusinessRow>()
  for (const business of businesses) {
    businessByOfferBusinessId.set(business.id, business)
    if (business.legacy_profile_id) businessByOfferBusinessId.set(business.legacy_profile_id, business)
  }

  const pending = offers.filter((offer) => offer.approval_status === 'pending')
  const approved = offers.filter((offer) => offer.approval_status === 'approved')
  const declined = offers.filter((offer) => offer.approval_status === 'declined')
  const reviewed = firstParam(params.reviewed)
  const error = firstParam(params.error)

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <Link href="/dashboard/owner/manage" className="text-sm font-bold text-blue-700 hover:text-blue-900">
          ← Back to Manage Platform
        </Link>

        <header className="mt-4 rounded-2xl bg-slate-950 px-5 py-5 text-white shadow-lg sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-green-300">Trust & safety</p>
              <h1 className="mt-1 text-2xl font-black sm:text-3xl">Offer Reviews</h1>
              <p className="mt-1 max-w-3xl text-sm text-slate-300">
                Offers can be created at any time, but they stay offline until the business is verified and the offer is approved here.
              </p>
            </div>
            <div className="rounded-xl bg-white/10 px-4 py-3 text-center">
              <p className="text-2xl font-black">{pending.length}</p>
              <p className="text-xs font-bold text-slate-300">Pending review</p>
            </div>
          </div>
        </header>

        {reviewed ? (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900">
            Offer {reviewed}.
          </div>
        ) : null}

        {error === 'verify-business' ? (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
            Verify the business before approving this offer.
          </div>
        ) : error ? (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-900">
            The offer review could not be saved. Please try again.
          </div>
        ) : null}

        <section className="mt-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-amber-700">Needs attention</p>
              <h2 className="mt-1 text-xl font-black text-slate-950">Pending offers</h2>
            </div>
          </div>

          {pending.length === 0 ? (
            <div className="mt-3 rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm">
              <p className="font-black text-slate-950">Queue clear</p>
              <p className="mt-1 text-sm text-slate-600">No offers currently need review.</p>
            </div>
          ) : (
            <div className="mt-3 space-y-4">
              {pending.map((offer) => {
                const business = businessByOfferBusinessId.get(offer.business_id)
                const verificationStatus = business ? verificationByBusiness.get(business.id) ?? 'not_applied' : 'unknown'
                const verified = verificationStatus === 'approved'

                return (
                  <article key={offer.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-black text-slate-950">{offer.title}</h3>
                          <span className={`rounded-full px-2.5 py-1 text-[11px] font-black ${verified ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                            {verified ? 'Verified business' : `Business ${verificationStatus.replaceAll('_', ' ')}`}
                          </span>
                        </div>
                        <p className="mt-1 text-sm font-bold text-blue-700">{business?.name ?? 'Unknown business'}</p>
                        {offer.discount ? <p className="mt-3 text-base font-black text-slate-900">{offer.discount}</p> : null}
                        {offer.description ? <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-600">{offer.description}</p> : null}
                        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold text-slate-500">
                          <span>Submitted {formatDate(offer.approval_submitted_at ?? offer.created_at)}</span>
                          <span>Starts {formatDate(offer.starts_at)}</span>
                          <span>Ends {formatDate(offer.ends_at)}</span>
                        </div>
                      </div>
                    </div>

                    <form action={reviewBusinessOfferAction} className="mt-5 border-t border-slate-100 pt-4">
                      <input type="hidden" name="offerId" value={offer.id} />
                      <label htmlFor={`note-${offer.id}`} className="text-sm font-black text-slate-800">Review note</label>
                      <textarea
                        id={`note-${offer.id}`}
                        name="note"
                        rows={2}
                        placeholder="Optional for approval. Recommended when declining."
                        className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      />
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          name="decision"
                          value="approved"
                          disabled={!verified}
                          className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-black text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                        >
                          Approve & publish
                        </button>
                        <button name="decision" value="declined" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-black text-rose-800 hover:bg-rose-100">
                          Decline
                        </button>
                        {!verified ? (
                          <Link href="/dashboard/owner/business-verifications" className="inline-flex items-center rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-black text-amber-900">
                            Verify business first
                          </Link>
                        ) : null}
                      </div>
                    </form>
                  </article>
                )
              })}
            </div>
          )}
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-green-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-green-700">Approved</p>
            <p className="mt-2 text-3xl font-black text-slate-950">{approved.length}</p>
            <p className="mt-1 text-sm text-slate-600">Approved offers remain eligible to be active while their business stays verified.</p>
          </div>
          <div className="rounded-2xl border border-rose-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-rose-700">Declined</p>
            <p className="mt-2 text-3xl font-black text-slate-950">{declined.length}</p>
            <p className="mt-1 text-sm text-slate-600">A material edit can resubmit a declined offer for a new review.</p>
          </div>
        </section>
      </div>
    </main>
  )
}

import Link from 'next/link'

import SaveOfferButton from '@/app/components/save-offer-button'
import {
  applyEnvironmentScope,
  getActiveDataEnvironment,
  recordsShareEnvironment,
  type EnvironmentOwnedRecord,
} from '@/lib/data-environment'
import { getPublicPartnerProfiles } from '@/lib/repositories/public-partner-profile-repository'
import { getCustomerPassAccess } from '@/lib/services/customer-pass-access-service'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

type Offer = EnvironmentOwnedRecord & {
  id: string
  title: string | null
  discount: string | null
  description: string | null
  starts_at: string | null
  ends_at: string | null
  business_id: string
  customer_value: number | null
}

type BusinessProfile = EnvironmentOwnedRecord & {
  id: string
  business_name: string | null
  display_name: string | null
  logo_url: string | null
  phone: string | null
  address: string | null
  website_url: string | null
  google_maps_url: string | null
  role: string | null
}

function formatCustomerValue(value: number): string {
  return Number.isInteger(value)
    ? `$${value.toFixed(0)}`
    : `$${value.toFixed(2)}`
}

function formatOfferDate(value: string | null): string {
  if (!value) return 'No listed expiration'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Date unavailable'

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default async function OffersPage() {
  const supabase = await createClient()
  const environment = getActiveDataEnvironment()
  const now = new Date()
  const nowIso = now.toISOString()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  let hasActivePass = false
  let savedOfferIds = new Set<string>()

  if (user) {
    const passAccess = await getCustomerPassAccess(user.id, now)
    hasActivePass = passAccess.hasActivePass

    if (hasActivePass) {
      const savedOffersQuery = supabase
        .from('saved_offers')
        .select('offer_id, is_demo, demo_group')
        .eq('user_id', user.id)

      const { data: savedOffers } = await applyEnvironmentScope(
        savedOffersQuery,
        environment
      )

      savedOfferIds = new Set(
        (savedOffers ?? []).map((savedOffer) => savedOffer.offer_id)
      )
    }
  }

  const offersQuery = supabase
    .from('offers')
    .select(
      'id, title, discount, description, starts_at, ends_at, business_id, customer_value, is_demo, demo_group'
    )
    .eq('is_active', true)
    .or(`starts_at.is.null,starts_at.lte.${nowIso}`)
    .or(`ends_at.is.null,ends_at.gte.${nowIso}`)
    .order('created_at', { ascending: false })

  const { data: offers, error: offersError } = await applyEnvironmentScope(
    offersQuery,
    environment
  )

  if (offersError) {
    return (
      <main className="min-h-screen bg-[#F7FAFC] px-4 py-10 sm:px-8">
        <div className="mx-auto max-w-5xl">
          <Link href="/" className="text-sm font-black text-blue-700">
            ← Back to home
          </Link>
          <section className="mt-5 rounded-3xl border border-red-200 bg-white p-6 shadow-sm sm:p-8">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-red-600">
              Local Deals
            </p>
            <h1 className="mt-2 text-2xl font-black text-slate-950">
              Deals are temporarily unavailable
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              We could not load available offers right now. Please try again.
            </p>
          </section>
        </div>
      </main>
    )
  }

  const candidateOffers = ((offers ?? []) as Offer[]).filter(
    (offer) => Boolean(offer.business_id) && Boolean(offer.title?.trim())
  )
  const businessIds = [...new Set(candidateOffers.map((offer) => offer.business_id))]

  let profiles: BusinessProfile[] = []
  if (businessIds.length > 0) {
    const result = await getPublicPartnerProfiles(businessIds, {
      role: 'business',
      environment,
    })
    profiles = result.profiles as BusinessProfile[]
  }

  const profileById = Object.fromEntries(
    profiles
      .filter((profile) =>
        Boolean(profile.business_name?.trim() || profile.display_name?.trim())
      )
      .map((profile) => [profile.id, profile])
  )

  const visibleOffers = candidateOffers.filter((offer) => {
    const profile = profileById[offer.business_id]
    return Boolean(profile && recordsShareEnvironment(offer, profile))
  })

  return (
    <main className="min-h-screen bg-[#F7FAFC] px-3 py-6 text-slate-950 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/"
          className="inline-flex min-h-10 items-center text-sm font-black text-blue-700"
        >
          ← Back to home
        </Link>

        <section className="relative mt-4 overflow-hidden rounded-[2rem] bg-slate-950 px-5 py-7 text-white shadow-xl sm:px-8 sm:py-10">
          <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-amber-400/20 blur-3xl" />
          <div className="absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-blue-500/20 blur-3xl" />

          <div className="relative z-10 max-w-3xl">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-300">
              Shop local. Save locally.
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
              Local Deals
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
              Explore participating businesses and the value included with a RaiseHub Pass.
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-black text-slate-100">
                {visibleOffers.length} {visibleOffers.length === 1 ? 'active offer' : 'active offers'}
              </span>

              {hasActivePass ? (
                <span className="rounded-full bg-green-400/15 px-3 py-1.5 text-xs font-black text-green-200">
                  ✓ Pass active — full details unlocked
                </span>
              ) : (
                <span className="rounded-full bg-amber-400/15 px-3 py-1.5 text-xs font-black text-amber-200">
                  Pass required for exact deal details
                </span>
              )}
            </div>
          </div>
        </section>

        {!hasActivePass ? (
          <section className="mt-4 flex items-center justify-between gap-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-amber-700">
                Preview mode
              </p>
              <p className="mt-0.5 text-sm font-bold leading-5 text-slate-800">
                You can see participating businesses and offer value before unlocking exact terms.
              </p>
            </div>

            <Link
              href={user ? '/campaigns' : '/signup?source=offers'}
              className="shrink-0 rounded-xl bg-amber-500 px-3 py-2 text-xs font-black text-white transition hover:bg-amber-600"
            >
              Get a pass
            </Link>
          </section>
        ) : null}

        {visibleOffers.length > 0 ? (
          <section className="mt-7" aria-labelledby="available-local-deals">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-700">
                  Community partners
                </p>
                <h2
                  id="available-local-deals"
                  className="mt-1 text-2xl font-black tracking-tight text-slate-950"
                >
                  Available Local Deals
                </h2>
              </div>

              {!user ? (
                <Link
                  href="/login?next=/offers"
                  className="text-sm font-black text-blue-700"
                >
                  Log in
                </Link>
              ) : null}
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {visibleOffers.map((offer) => {
                const profile = profileById[offer.business_id]
                const businessName =
                  profile.display_name || profile.business_name || 'Local Business'
                const isSaved = savedOfferIds.has(offer.id)

                return (
                  <article
                    key={offer.id}
                    className="flex min-w-0 h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-amber-200 hover:shadow-md sm:p-6"
                  >
                    <div className="flex items-start gap-3">
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={profile.logo_url || '/default-business-logo.png'}
                          alt=""
                          className="max-h-full max-w-full object-contain"
                        />
                      </span>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-black uppercase tracking-[0.12em] text-amber-700">
                          {businessName}
                        </p>
                        <h3 className="mt-1 line-clamp-2 text-lg font-black leading-6 text-slate-950">
                          {hasActivePass
                            ? offer.title || 'Local offer'
                            : 'Exclusive Local Deal'}
                        </h3>
                      </div>

                      {hasActivePass && isSaved ? (
                        <span className="shrink-0 rounded-full bg-green-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-green-700">
                          Saved
                        </span>
                      ) : null}
                    </div>

                    {hasActivePass ? (
                      <>
                        <p className="mt-4 text-lg font-black text-green-700">
                          {offer.discount || 'Special savings available'}
                        </p>
                        <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">
                          {offer.description || 'Exclusive customer offer'}
                        </p>
                      </>
                    ) : (
                      <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50 p-4">
                        {offer.customer_value !== null ? (
                          <p className="text-lg font-black text-green-700">
                            {formatCustomerValue(offer.customer_value)} value
                          </p>
                        ) : (
                          <p className="text-sm font-black text-green-700">
                            Member value available
                          </p>
                        )}
                        <p className="mt-2 text-xs leading-5 text-slate-600">
                          Unlock the exact offer, discount, description, and redemption details with an active pass.
                        </p>
                      </div>
                    )}

                    <div className="mt-4 border-t border-slate-200 pt-4 text-xs leading-5 text-slate-500">
                      {profile.address ? (
                        <p className="line-clamp-2">
                          <span className="font-black text-slate-700">Location:</span>{' '}
                          {profile.address}
                        </p>
                      ) : null}
                      <p className={profile.address ? 'mt-1.5' : ''}>
                        <span className="font-black text-slate-700">Offer:</span>{' '}
                        {formatOfferDate(offer.ends_at)}
                      </p>
                    </div>

                    <div className="mt-auto pt-5">
                      {hasActivePass && !isSaved ? (
                        <SaveOfferButton offerId={offer.id} />
                      ) : null}

                      <Link
                        href={`/offers/${offer.id}`}
                        className={`inline-flex min-h-11 w-full items-center justify-center rounded-xl px-4 py-2.5 text-center text-sm font-black transition ${
                          hasActivePass && !isSaved
                            ? 'mt-3 border border-blue-200 bg-white text-blue-700 hover:bg-blue-50'
                            : 'bg-blue-700 text-white hover:bg-blue-800'
                        }`}
                      >
                        {hasActivePass ? 'View Deal Details' : 'Preview Offer'}
                      </Link>
                    </div>
                  </article>
                )
              })}
            </div>
          </section>
        ) : (
          <section className="mt-8 border-t border-slate-200 py-10 text-center">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
              Local Deals
            </p>
            <h2 className="mt-2 text-xl font-black text-slate-950">
              New offers are coming
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">
              Participating businesses do not have any active offers published right now.
            </p>
          </section>
        )}
      </div>
    </main>
  )
}

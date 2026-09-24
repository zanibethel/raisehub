import Link from 'next/link'
import { notFound } from 'next/navigation'

import TrackedOfferLink from '@/app/components/tracked-offer-link'
import UseOfferButton from '@/app/components/use-offer-button'
import SavedOfferButton from '@/app/offers/[id]/saved-offer-button'
import {
  applyEnvironmentScope,
  getActiveDataEnvironment,
  requireRelatedRecordEnvironment,
  type EnvironmentOwnedRecord,
} from '@/lib/data-environment'
import { getPublicPartnerProfiles } from '@/lib/repositories/public-partner-profile-repository'
import { getCustomerPassAccess } from '@/lib/services/customer-pass-access-service'
import { createClient } from '@/lib/supabase/server'

type OfferPageProps = {
  params: Promise<{ id: string }>
}

type OfferRecord = EnvironmentOwnedRecord & {
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

function formatCustomerValue(value: number): string {
  return Number.isInteger(value)
    ? `$${value.toFixed(0)}`
    : `$${value.toFixed(2)}`
}

function normalizeExternalUrl(value: string): string {
  return value.startsWith('http') ? value : `https://${value}`
}

export default async function OfferPage({ params }: OfferPageProps) {
  const { id } = await params
  const supabase = await createClient()
  const environment = getActiveDataEnvironment()
  const now = new Date()
  const nowIso = now.toISOString()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const offerQuery = supabase
    .from('offers')
    .select(
      'id, title, discount, description, starts_at, ends_at, business_id, customer_value, is_demo, demo_group'
    )
    .eq('id', id)
    .eq('is_active', true)
    .or(`starts_at.is.null,starts_at.lte.${nowIso}`)
    .or(`ends_at.is.null,ends_at.gte.${nowIso}`)

  const { data: offerData } = await applyEnvironmentScope(
    offerQuery,
    environment
  ).maybeSingle()
  const offer = offerData as OfferRecord | null
  if (!offer) notFound()

  const { profiles } = await getPublicPartnerProfiles([offer.business_id], {
    role: 'business',
    environment,
  })
  const profile = (profiles[0] ?? null) as BusinessProfile | null

  try {
    requireRelatedRecordEnvironment(profile, offer, environment)
  } catch {
    notFound()
  }

  let isUnlocked = false
  let isSaved = false

  if (user) {
    const { hasActivePass } = await getCustomerPassAccess(user.id, now)
    isUnlocked = hasActivePass

    if (isUnlocked) {
      const savedOfferQuery = supabase
        .from('saved_offers')
        .select('id, is_demo, demo_group')
        .eq('user_id', user.id)
        .eq('offer_id', offer.id)

      const { data: savedOffer } = await applyEnvironmentScope(
        savedOfferQuery,
        environment
      ).maybeSingle()
      isSaved = Boolean(savedOffer)
    }
  }

  await supabase.from('offer_views').insert({
    offer_id: offer.id,
    user_id: user?.id ?? null,
    is_demo: offer.is_demo === true,
    demo_group: offer.demo_group ?? null,
  })

  const businessName =
    profile!.display_name || profile!.business_name || 'Local Business'
  const offerReturnPath = `/offers/${offer.id}`

  return (
    <main className="min-h-screen bg-[#F7FAFC] px-3 py-6 text-slate-950 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-4xl">
        <Link
          href="/offers"
          className="inline-flex min-h-10 items-center text-sm font-black text-blue-700"
        >
          ← Back to Local Deals
        </Link>

        <section className="relative mt-4 overflow-hidden rounded-[2rem] bg-slate-950 px-5 py-7 text-white shadow-xl sm:px-8 sm:py-10">
          <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-amber-400/20 blur-3xl" />
          <div className="absolute -bottom-24 right-24 h-56 w-56 rounded-full bg-blue-500/20 blur-3xl" />

          <div className="relative z-10 flex items-start gap-4">
            <Link
              href={`/businesses/${profile!.id}`}
              aria-label={`View ${businessName} business profile`}
              className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white p-2 shadow-lg transition hover:scale-[1.02] sm:h-20 sm:w-20"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={profile!.logo_url || '/default-business-logo.png'}
                alt=""
                className="max-h-full max-w-full object-contain"
              />
            </Link>

            <div className="min-w-0">
              <Link
                href={`/businesses/${profile!.id}`}
                className="text-xs font-black uppercase tracking-[0.16em] text-amber-300 hover:text-green-200"
              >
                {businessName}
              </Link>
              <h1 className="mt-2 break-words text-3xl font-black leading-tight tracking-tight sm:text-4xl">
                {isUnlocked
                  ? offer.title || 'Exclusive Local Deal'
                  : 'Exclusive Local Deal'}
              </h1>

              <div className="mt-4 flex flex-wrap gap-2 text-xs font-black">
                {isUnlocked ? (
                  <span className="rounded-full bg-green-400/15 px-3 py-1.5 text-green-200">
                    ✓ Pass benefit unlocked
                  </span>
                ) : (
                  <span className="rounded-full bg-amber-400/15 px-3 py-1.5 text-amber-200">
                    Pass required for exact details
                  </span>
                )}

                {offer.customer_value !== null ? (
                  <span className="rounded-full bg-white/10 px-3 py-1.5 text-slate-100">
                    {formatCustomerValue(offer.customer_value)} value
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        </section>

        {isUnlocked ? (
          <section className="mt-5 rounded-2xl border border-green-200 bg-green-50 p-5 sm:p-6">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-green-700">
              Pass Benefit
            </p>
            <p className="mt-2 break-words text-2xl font-black text-green-900">
              {offer.discount || 'Special savings available'}
            </p>
            <p className="mt-3 break-words text-sm leading-6 text-slate-700 sm:text-base">
              {offer.description || 'Exclusive customer offer'}
            </p>
          </section>
        ) : (
          <section className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-5 sm:p-6">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-700">
              Preview
            </p>
            <h2 className="mt-2 text-xl font-black text-slate-950">
              Unlock the full deal with a RaiseHub Pass
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Support a participating fundraiser to reveal the discount, full description, and redemption details for this offer.
            </p>

            <Link
              href={user ? '/campaigns' : '/signup?source=offers'}
              className="mt-4 inline-flex min-h-11 items-center justify-center rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-black text-white transition hover:bg-amber-600"
            >
              {user ? 'Choose a Fundraiser' : 'Get a RaiseHub Pass'}
            </Link>
          </section>
        )}

        <section className="mt-7" aria-labelledby="offer-information-heading">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-700">
              Business & offer
            </p>
            <h2
              id="offer-information-heading"
              className="mt-1 text-2xl font-black tracking-tight text-slate-950"
            >
              Offer Information
            </h2>
          </div>

          <dl className="mt-4 divide-y divide-slate-200 border-y border-slate-200">
            <div className="grid gap-1 py-4 sm:grid-cols-[150px_1fr] sm:gap-4">
              <dt className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                Availability
              </dt>
              <dd className="text-sm font-bold text-slate-800">
                {formatOfferDate(offer.ends_at)}
              </dd>
            </div>

            {profile!.address ? (
              <div className="grid gap-1 py-4 sm:grid-cols-[150px_1fr] sm:gap-4">
                <dt className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                  Location
                </dt>
                <dd className="break-words text-sm font-bold text-slate-800">
                  {profile!.address}
                </dd>
              </div>
            ) : null}

            {profile!.phone ? (
              <div className="grid gap-1 py-4 sm:grid-cols-[150px_1fr] sm:gap-4">
                <dt className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                  Phone
                </dt>
                <dd>
                  <a
                    href={`tel:${profile!.phone}`}
                    className="break-words text-sm font-black text-blue-700 underline underline-offset-4"
                  >
                    {profile!.phone}
                  </a>
                </dd>
              </div>
            ) : null}
          </dl>
        </section>

        <section className="mt-7">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-green-700">
            Next step
          </p>
          <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950">
            {isUnlocked ? 'Redeem this offer' : 'Unlock local savings'}
          </h2>

          {isUnlocked ? (
            <>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Only redeem when you are at the participating business and ready to use the offer. RaiseHub records the redemption immediately and shows a confirmation screen for staff.
              </p>

              <UseOfferButton offerId={offer.id} />

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <SavedOfferButton offerId={offer.id} initiallySaved={isSaved} />
                <TrackedOfferLink
                  href="/dashboard#my-pass"
                  offerId={offer.id}
                  clickType="dashboard_click"
                  className="inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-blue-200 bg-white px-5 py-3 text-center text-sm font-black text-blue-700 transition hover:bg-blue-50"
                >
                  Open My Pass
                </TrackedOfferLink>
              </div>
            </>
          ) : (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {user ? (
              <Link
                href="/campaigns"
                className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-blue-700 px-5 py-3 text-center text-sm font-black text-white transition hover:bg-blue-800 sm:col-span-2"
              >
                Choose a Fundraiser Pass
              </Link>
              ) : (
                <>
                  <Link
                    href={`/login?next=${encodeURIComponent(offerReturnPath)}`}
                    className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-blue-700 px-5 py-3 text-center text-sm font-black text-white transition hover:bg-blue-800"
                  >
                    Log In
                  </Link>
                  <Link
                    href="/signup?source=offers"
                    className="inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-blue-200 bg-white px-5 py-3 text-center text-sm font-black text-blue-700 transition hover:bg-blue-50"
                  >
                    Create Customer Account
                  </Link>
                </>
              )}
            </div>
          )}

          {profile!.website_url || profile!.google_maps_url ? (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {profile!.website_url ? (
                <a
                  href={normalizeExternalUrl(profile!.website_url)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-center text-sm font-black text-slate-700 transition hover:border-green-200 hover:bg-green-50 hover:text-green-700"
                >
                  Visit Website
                </a>
              ) : null}

              {profile!.google_maps_url ? (
                <a
                  href={normalizeExternalUrl(profile!.google_maps_url)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-center text-sm font-black text-slate-700 transition hover:border-green-200 hover:bg-green-50 hover:text-green-700"
                >
                  View Map
                </a>
              ) : null}
            </div>
          ) : null}
        </section>
      </div>
    </main>
  )
}

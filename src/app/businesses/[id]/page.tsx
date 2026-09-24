import Link from 'next/link'
import { notFound } from 'next/navigation'

import { getPublicBusinessProfile } from '@/lib/repositories/public-business-directory-repository'
import { getCustomerPassAccess } from '@/lib/services/customer-pass-access-service'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

type Props = {
  params: Promise<{ id: string }>
}

function normalizeExternalUrl(value: string | null) {
  if (!value) return null
  return value.startsWith('http') ? value : `https://${value}`
}

function formatCustomerValue(value: number) {
  return Number.isInteger(value)
    ? `$${value.toFixed(0)}`
    : `$${value.toFixed(2)}`
}

function formatOfferDate(value: string | null) {
  if (!value) return 'No listed expiration'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Date unavailable'

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default async function BusinessProfilePage({ params }: Props) {
  const { id } = await params
  const { business, offers, error } = await getPublicBusinessProfile(id)

  if (error || !business) notFound()

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let hasActivePass = false
  if (user) {
    const passAccess = await getCustomerPassAccess(user.id)
    hasActivePass = passAccess.hasActivePass
  }

  const profile = business.profile
  const name = profile.display_name || profile.business_name || 'Local Business'
  const websiteUrl = normalizeExternalUrl(profile.website_url)
  const mapsUrl = normalizeExternalUrl(profile.google_maps_url)
  const socialLinks = [
    ['Facebook', normalizeExternalUrl(profile.facebook_url)],
    ['Instagram', normalizeExternalUrl(profile.instagram_url)],
    ['TikTok', normalizeExternalUrl(profile.tiktok_url)],
  ].filter((item): item is [string, string] => Boolean(item[1]))

  return (
    <main className="min-h-screen bg-[#F7FAFC] px-3 py-6 text-slate-950 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/businesses"
          className="inline-flex min-h-10 items-center text-sm font-black text-blue-700"
        >
          ← Back to Local Partners
        </Link>

        <section className="relative mt-4 overflow-hidden rounded-[2rem] bg-slate-950 px-5 py-7 text-white shadow-xl sm:px-8 sm:py-10">
          <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-green-500/20 blur-3xl" />
          <div className="absolute -bottom-24 right-24 h-56 w-56 rounded-full bg-blue-500/20 blur-3xl" />

          <div className="relative z-10 flex items-start gap-4">
            <span className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white p-2 shadow-lg sm:h-24 sm:w-24">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={profile.logo_url || '/default-business-logo.png'}
                alt=""
                className="max-h-full max-w-full object-contain"
              />
            </span>

            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-green-300">
                {profile.business_category || 'Local Business'}
              </p>
              <h1 className="mt-2 break-words text-3xl font-black leading-tight tracking-tight sm:text-4xl">
                {name}
              </h1>

              <div className="mt-4 flex flex-wrap gap-2">
                {business.verificationStatus === 'approved' ? (
                  <span className="rounded-full bg-blue-400/15 px-3 py-1.5 text-xs font-black text-blue-200">
                    ✓ Verified RaiseHub Partner
                  </span>
                ) : (
                  <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-black text-slate-200">
                    RaiseHub Business
                  </span>
                )}

                {business.founderStatus ? (
                  <span className="rounded-full bg-amber-400/15 px-3 py-1.5 text-xs font-black text-amber-200">
                    Founding 100 Business
                  </span>
                ) : null}

                {business.activeOfferCount > 0 ? (
                  <span className="rounded-full bg-green-400/15 px-3 py-1.5 text-xs font-black text-green-200">
                    {business.activeOfferCount} {business.activeOfferCount === 1 ? 'active offer' : 'active offers'}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        </section>

        <section className="mt-7">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-700">
            About
          </p>
          <h2 className="mt-1 text-2xl font-black tracking-tight">
            About {name}
          </h2>
          <p className="mt-3 max-w-3xl whitespace-pre-line text-sm leading-7 text-slate-600 sm:text-base">
            {profile.business_description ||
              'This local business participates in the RaiseHub community and supports local fundraising.'}
          </p>
        </section>

        <section className="mt-7 border-y border-slate-200 py-5">
          <div className="grid gap-4 sm:grid-cols-3 sm:divide-x sm:divide-slate-200">
            <div className="min-w-0 sm:px-4 sm:first:pl-0">
              <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                Location
              </p>
              <p className="mt-1 break-words text-sm font-bold text-slate-800">
                {profile.address || 'Location not listed'}
              </p>
            </div>

            <div className="min-w-0 sm:px-4">
              <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                Phone
              </p>
              {profile.phone ? (
                <a
                  href={`tel:${profile.phone}`}
                  className="mt-1 inline-flex text-sm font-black text-blue-700 underline underline-offset-4"
                >
                  {profile.phone}
                </a>
              ) : (
                <p className="mt-1 text-sm font-bold text-slate-500">
                  Not listed
                </p>
              )}
            </div>

            <div className="min-w-0 sm:px-4 sm:last:pr-0">
              <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                RaiseHub status
              </p>
              <p className="mt-1 text-sm font-bold text-slate-800">
                {business.verificationStatus === 'approved'
                  ? 'Verified community partner'
                  : 'Participating business'}
              </p>
            </div>
          </div>
        </section>

        {(websiteUrl || mapsUrl || business.publishedSiteSlug || socialLinks.length > 0) ? (
          <section className="mt-6">
            <div className="flex flex-wrap gap-3">
              {business.publishedSiteSlug ? (
                <Link
                  href={`/site/${business.publishedSiteSlug}`}
                  className="inline-flex min-h-11 items-center justify-center rounded-xl bg-green-700 px-4 py-2.5 text-sm font-black text-white transition hover:bg-green-800"
                >
                  Visit Business Site
                </Link>
              ) : null}

              {websiteUrl ? (
                <a
                  href={websiteUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 transition hover:border-green-200 hover:bg-green-50 hover:text-green-700"
                >
                  Website
                </a>
              ) : null}

              {mapsUrl ? (
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                >
                  View Map
                </a>
              ) : null}

              {socialLinks.map(([label, href]) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 transition hover:bg-slate-50"
                >
                  {label}
                </a>
              ))}
            </div>
          </section>
        ) : null}

        <section className="mt-9" aria-labelledby="business-offers-heading">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-700">
                RaiseHub savings
              </p>
              <h2
                id="business-offers-heading"
                className="mt-1 text-2xl font-black tracking-tight"
              >
                Current Offers
              </h2>
            </div>

            <Link href="/offers" className="text-sm font-black text-blue-700">
              All deals →
            </Link>
          </div>

          {offers.length > 0 ? (
            <div className="-mr-3 mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto pr-3 pb-2 [scrollbar-width:none] [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden sm:mr-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:pr-0 lg:grid-cols-3">
              {offers.map((offer) => (
                <article
                  key={offer.id}
                  className="flex w-[82%] min-w-[82%] snap-start flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:w-auto sm:min-w-0"
                >
                  <p className="text-xs font-black uppercase tracking-[0.12em] text-amber-700">
                    {hasActivePass ? 'Pass benefit' : 'Pass offer'}
                  </p>

                  <h3 className="mt-2 text-lg font-black leading-6">
                    {hasActivePass
                      ? offer.title || 'Local offer'
                      : 'Exclusive Local Deal'}
                  </h3>

                  {hasActivePass ? (
                    <>
                      <p className="mt-3 font-black text-green-700">
                        {offer.discount || 'Special savings available'}
                      </p>
                      <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">
                        {offer.description || 'Exclusive customer offer'}
                      </p>
                    </>
                  ) : (
                    <div className="mt-3 rounded-xl bg-amber-50 p-3">
                      <p className="font-black text-green-700">
                        {offer.customer_value !== null
                          ? `${formatCustomerValue(offer.customer_value)} value`
                          : 'Member value available'}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-slate-600">
                        Support a fundraiser to unlock the exact terms.
                      </p>
                    </div>
                  )}

                  <p className="mt-4 border-t border-slate-200 pt-3 text-xs font-bold text-slate-500">
                    {formatOfferDate(offer.ends_at)}
                  </p>

                  <Link
                    href={`/offers/${offer.id}`}
                    className="mt-auto inline-flex min-h-11 items-center justify-center pt-4 text-sm font-black text-blue-700"
                  >
                    {hasActivePass ? 'View deal details' : 'Preview offer'} →
                  </Link>
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-4 border-t border-slate-200 py-8">
              <p className="font-black">No active offers right now</p>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Check back as {name} publishes new RaiseHub offers.
              </p>
            </div>
          )}
        </section>

        <section className="mt-10 border-y border-slate-200 py-7">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-green-700">
            Community impact
          </p>
          <h2 className="mt-2 text-2xl font-black">
            Local businesses make RaiseHub more valuable
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Every participating business gives supporters another reason to buy a fundraising pass while keeping more activity in the local community.
          </p>
          <Link
            href="/campaigns"
            className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-black text-white transition hover:bg-blue-800"
          >
            Find a Fundraiser
          </Link>
        </section>
      </div>
    </main>
  )
}

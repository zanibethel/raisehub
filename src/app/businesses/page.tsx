import Link from 'next/link'

import { getPublicBusinessDirectory } from '@/lib/repositories/public-business-directory-repository'

export const dynamic = 'force-dynamic'

export default async function BusinessesPage() {
  const { businesses, error } = await getPublicBusinessDirectory()

  if (error) {
    return (
      <main className="min-h-screen bg-[#F7FAFC] px-4 py-10 text-slate-950 sm:px-8">
        <div className="mx-auto max-w-6xl">
          <Link href="/home" className="text-sm font-black text-blue-700">
            ← Back to RaiseHub
          </Link>

          <section className="mt-5 rounded-3xl border border-red-200 bg-white p-6 shadow-sm sm:p-8">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-red-600">
              Local Partners
            </p>
            <h1 className="mt-2 text-2xl font-black">
              Business directory is temporarily unavailable
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              We could not load participating businesses right now. Please try again.
            </p>
          </section>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#F7FAFC] px-3 py-6 text-slate-950 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/home"
          className="inline-flex min-h-10 items-center text-sm font-black text-blue-700"
        >
          ← Back to RaiseHub
        </Link>

        <section className="relative mt-4 overflow-hidden rounded-[2rem] bg-slate-950 px-5 py-7 text-white shadow-xl sm:px-8 sm:py-10">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-green-500/20 blur-3xl" />
          <div className="absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-blue-500/20 blur-3xl" />

          <div className="relative z-10 max-w-3xl">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-green-300">
              Local Partners
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
              Businesses supporting community fundraising
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
              Explore participating businesses, see who is offering RaiseHub savings, and support the local partners helping fund community goals.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-black text-slate-100">
                {businesses.length} {businesses.length === 1 ? 'business' : 'businesses'}
              </span>
              <span className="rounded-full bg-green-400/15 px-3 py-1.5 text-xs font-black text-green-200">
                Community-powered
              </span>
            </div>
          </div>
        </section>

        {businesses.length > 0 ? (
          <section className="mt-7" aria-labelledby="business-directory-heading">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-700">
                Browse partners
              </p>
              <h2
                id="business-directory-heading"
                className="mt-1 text-2xl font-black tracking-tight"
              >
                Participating Businesses
              </h2>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {businesses.map((entry) => {
                const profile = entry.profile
                const name =
                  profile.display_name || profile.business_name || 'Local Business'

                return (
                  <article
                    key={profile.id}
                    className="flex h-full min-w-0 flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-green-200 hover:shadow-md sm:p-6"
                  >
                    <div className="flex items-start gap-3">
                      <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white p-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={profile.logo_url || '/default-business-logo.png'}
                          alt=""
                          className="max-h-full max-w-full object-contain"
                        />
                      </span>

                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-black uppercase tracking-[0.12em] text-green-700">
                          {profile.business_category || 'Local Business'}
                        </p>
                        <h3 className="mt-1 break-words text-xl font-black leading-6">
                          {name}
                        </h3>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {entry.verificationStatus === 'approved' ? (
                        <span className="rounded-full bg-blue-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-blue-700">
                          Verified Partner
                        </span>
                      ) : (
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-slate-600">
                          RaiseHub Business
                        </span>
                      )}

                      {entry.founderStatus ? (
                        <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-amber-800">
                          Founding 100
                        </span>
                      ) : null}

                      {entry.activeOfferCount > 0 ? (
                        <span className="rounded-full bg-green-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-green-700">
                          {entry.activeOfferCount} {entry.activeOfferCount === 1 ? 'active offer' : 'active offers'}
                        </span>
                      ) : null}
                    </div>

                    <p className="mt-4 line-clamp-3 text-sm leading-6 text-slate-600">
                      {profile.business_description ||
                        'Supporting local fundraising and the RaiseHub community.'}
                    </p>

                    {profile.address ? (
                      <p className="mt-4 border-t border-slate-200 pt-4 text-xs font-bold leading-5 text-slate-500">
                        {profile.address}
                      </p>
                    ) : null}

                    <Link
                      href={`/businesses/${profile.id}`}
                      className="mt-auto inline-flex min-h-11 items-center justify-center pt-5 text-sm font-black text-blue-700"
                    >
                      View business profile <span className="ml-2" aria-hidden="true">→</span>
                    </Link>
                  </article>
                )
              })}
            </div>
          </section>
        ) : (
          <section className="mt-8 border-t border-slate-200 py-10 text-center">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
              Local Partners
            </p>
            <h2 className="mt-2 text-xl font-black">
              New businesses are joining RaiseHub
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">
              Check back as more local businesses complete their RaiseHub profiles.
            </p>
          </section>
        )}

        <section className="mt-10 border-y border-slate-200 py-7 text-center">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-green-700">
            Own a local business?
          </p>
          <h2 className="mt-2 text-2xl font-black">
            Join the businesses backing local fundraising
          </h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Create offers, reach local supporters, and earn Partner Points for meaningful participation.
          </p>
          <Link
            href="/signup/business"
            className="mt-5 inline-flex min-h-12 items-center justify-center rounded-xl bg-green-700 px-5 py-3 text-sm font-black text-white transition hover:bg-green-800"
          >
            Join as a Business
          </Link>
        </section>
      </div>
    </main>
  )
}

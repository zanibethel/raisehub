'use client'

import Link from 'next/link'
import { useRef } from 'react'

type Offer = {
  id: string
  title: string | null
  discount: string | null
  description: string | null
  starts_at: string | null
  ends_at: string | null
  business_id: string
  featured?: boolean
}

type Profile = {
  id: string
  business_name: string | null
  display_name: string | null
  logo_url: string | null
}

type FeaturedDealsCarouselClientProps = {
  offers: Offer[]
  profileById: Record<string, Profile>
}

export default function FeaturedDealsCarouselClient({
  offers,
  profileById,
}: FeaturedDealsCarouselClientProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null)

  function move(direction: -1 | 1) {
    const element = scrollRef.current
    if (!element) return

    element.scrollBy({
      left: direction * Math.max(240, element.clientWidth * 0.72),
      behavior: 'smooth',
    })
  }

  if (!offers.length) return null

  return (
    <section
      className="mx-auto mt-12 w-full max-w-6xl sm:mt-16"
      aria-label="Featured Offers carousel"
    >
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-700">
            Local Savings
          </p>
          <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
            Featured Offers
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Preview participating businesses and the savings included with a RaiseHub pass.
          </p>
        </div>

        <div className="hidden shrink-0 gap-2 sm:flex">
          <button
            type="button"
            onClick={() => move(-1)}
            aria-label="Previous featured offer"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-xl font-black text-slate-700 shadow-sm hover:border-amber-300 hover:text-amber-700"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => move(1)}
            aria-label="Next featured offer"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-xl font-black text-slate-700 shadow-sm hover:border-amber-300 hover:text-amber-700"
          >
            ›
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        role="list"
        aria-label="Featured local offers"
        className="-mr-4 mt-5 flex snap-x snap-mandatory gap-3 overflow-x-auto pr-4 pb-2 [scrollbar-width:none] [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden sm:mr-0 sm:gap-4 sm:pr-0"
      >
        {offers.map((offer) => {
          const profile = profileById[offer.business_id]
          const businessName =
            profile?.display_name ||
            profile?.business_name ||
            'Local Business'

          return (
            <div
              key={offer.id}
              role="listitem"
              className="w-[74%] min-w-[74%] snap-start sm:w-[300px] sm:min-w-[300px]"
            >
              <Link
                href={`/offers/${offer.id}`}
                className="flex min-h-52 h-full flex-col rounded-3xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
                aria-label={`${businessName} — view featured offer`}
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white p-1.5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={profile?.logo_url || '/default-business-logo.png'}
                      alt=""
                      className="max-h-full max-w-full object-contain"
                    />
                  </span>

                  {offer.featured ? (
                    <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-amber-800">
                      Featured Partner
                    </span>
                  ) : (
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-slate-500">
                      Pass Offer
                    </span>
                  )}
                </div>

                <div className="mt-4 min-w-0">
                  <p className="truncate text-xs font-black uppercase tracking-[0.12em] text-amber-700">
                    {businessName}
                  </p>
                  <h3 className="mt-1 line-clamp-2 text-lg font-black leading-6 text-slate-950">
                    Exclusive local deal
                  </h3>
                </div>

                <div className="relative mt-4 overflow-hidden rounded-2xl border border-amber-100 bg-amber-50 p-3">
                  <div className="blur-[3px] select-none">
                    <p className="text-sm font-black text-amber-800">
                      {offer.discount || 'Member savings'}
                    </p>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-600">
                      {offer.description || 'Exclusive customer offer'}
                    </p>
                  </div>

                  <div className="absolute inset-0 flex items-center justify-center bg-white/55">
                    <span className="rounded-full bg-slate-950 px-3 py-1.5 text-[11px] font-black text-white">
                      Pass holders unlock details
                    </span>
                  </div>
                </div>

                <div className="mt-auto flex items-end justify-between gap-3 pt-4">
                  <p className="text-[11px] font-semibold text-slate-500">
                    {offer.ends_at
                      ? `Ends ${new Date(offer.ends_at).toLocaleDateString()}`
                      : 'No listed expiration'}
                  </p>
                  <span className="text-sm font-black text-amber-700">View →</span>
                </div>
              </Link>
            </div>
          )
        })}
      </div>

      <div className="mt-4">
        <Link
          href="/offers"
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 text-sm font-black text-amber-800 transition hover:bg-amber-100"
        >
          View all deals <span aria-hidden="true">→</span>
        </Link>
      </div>
    </section>
  )
}

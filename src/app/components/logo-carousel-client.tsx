'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'

type PartnerProfile = {
  id: string
  business_name: string | null
  display_name: string | null
  logo_url: string | null
  website_url: string | null
  google_maps_url: string | null
  phone: string | null
  address: string | null
  role: string | null
}

type LogoCarouselClientProps = {
  partners: PartnerProfile[]
}

const AUTO_ADVANCE_MS = 4800
const RESUME_DELAY_MS = 7000

export default function LogoCarouselClient({
  partners,
}: LogoCarouselClientProps) {
  const [selectedPartner, setSelectedPartner] =
    useState<PartnerProfile | null>(null)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const currentIndexRef = useRef(0)
  const pausedRef = useRef(false)
  const resumeTimerRef =
    useRef<ReturnType<typeof setTimeout> | null>(null)

  function getPartnerName(partner: PartnerProfile) {
    return (
      partner.display_name ||
      partner.business_name ||
      'Local Partner'
    )
  }

  function scrollToPartner(index: number, behavior: ScrollBehavior = 'smooth') {
    const element = scrollRef.current
    if (!element || partners.length === 0) return

    const nextIndex =
      ((index % partners.length) + partners.length) % partners.length
    const target = element.children.item(nextIndex) as HTMLElement | null

    if (!target) return

    currentIndexRef.current = nextIndex
    element.scrollTo({
      left: Math.max(0, target.offsetLeft - element.offsetLeft),
      behavior,
    })
  }

  function pauseAutoAdvance() {
    pausedRef.current = true

    if (resumeTimerRef.current) {
      clearTimeout(resumeTimerRef.current)
    }
  }

  function resumeAutoAdvanceLater() {
    if (resumeTimerRef.current) {
      clearTimeout(resumeTimerRef.current)
    }

    resumeTimerRef.current = setTimeout(() => {
      pausedRef.current = false
    }, RESUME_DELAY_MS)
  }

  useEffect(() => {
    if (partners.length < 2) return

    const interval = window.setInterval(() => {
      if (pausedRef.current || selectedPartner) return
      scrollToPartner(currentIndexRef.current + 1)
    }, AUTO_ADVANCE_MS)

    return () => window.clearInterval(interval)
  }, [partners.length, selectedPartner])

  useEffect(() => {
    return () => {
      if (resumeTimerRef.current) {
        clearTimeout(resumeTimerRef.current)
      }
    }
  }, [])

  if (!partners.length) return null

  return (
    <>
      <section
        className="mx-auto mt-10 w-full max-w-6xl sm:mt-14"
        aria-label="Local Partners carousel"
      >
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-green-700">
              Local Partners
            </p>
            <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
              Businesses backing local fundraising
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Discover participating businesses helping fund community goals while bringing supporters through their doors.
            </p>
          </div>

          {partners.length > 1 ? (
            <div className="hidden shrink-0 gap-2 sm:flex">
              <button
                type="button"
                onClick={() => {
                  pauseAutoAdvance()
                  scrollToPartner(currentIndexRef.current - 1)
                  resumeAutoAdvanceLater()
                }}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-xl font-black text-slate-700 shadow-sm hover:border-green-300 hover:text-green-700"
                aria-label="Previous local partner"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={() => {
                  pauseAutoAdvance()
                  scrollToPartner(currentIndexRef.current + 1)
                  resumeAutoAdvanceLater()
                }}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-xl font-black text-slate-700 shadow-sm hover:border-green-300 hover:text-green-700"
                aria-label="Next local partner"
              >
                ›
              </button>
            </div>
          ) : null}
        </div>

        <div
          ref={scrollRef}
          role="list"
          aria-label="Local partner businesses"
          onTouchStart={pauseAutoAdvance}
          onTouchEnd={resumeAutoAdvanceLater}
          onTouchCancel={resumeAutoAdvanceLater}
          onPointerDown={pauseAutoAdvance}
          onPointerUp={resumeAutoAdvanceLater}
          onPointerCancel={resumeAutoAdvanceLater}
          className="-mr-4 mt-5 flex snap-x snap-mandatory gap-3 overflow-x-auto pr-4 pb-2 [scrollbar-width:none] [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden sm:mr-0 sm:gap-4 sm:pr-0"
        >
          {partners.map((partner) => {
            const name = getPartnerName(partner)

            return (
              <div
                key={partner.id}
                role="listitem"
                className="w-[82%] min-w-[82%] snap-start sm:w-[420px] sm:min-w-[420px]"
              >
                <button
                  type="button"
                  onClick={() => {
                    pauseAutoAdvance()
                    setSelectedPartner(partner)
                  }}
                  aria-label={`View ${name} details`}
                  className="group relative flex min-h-48 w-full overflow-hidden rounded-3xl border border-slate-200 bg-slate-950 p-5 text-left text-white shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 sm:min-h-56 sm:p-6"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-green-500/25 via-slate-950 to-blue-600/20" />
                  <div className="absolute -right-8 -top-8 h-36 w-36 rounded-full bg-white/10 blur-2xl" />

                  <div className="relative z-10 flex w-full flex-col justify-between">
                    <div className="flex items-start justify-between gap-4">
                      <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-white p-3 shadow-lg sm:h-24 sm:w-24">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={partner.logo_url || '/default-business-logo.png'}
                          alt=""
                          className="max-h-full max-w-full object-contain"
                        />
                      </span>
                      <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-green-100">
                        Community Partner
                      </span>
                    </div>

                    <div className="mt-6">
                      <h3 className="text-xl font-black leading-tight sm:text-2xl">
                        {name}
                      </h3>
                      <p className="mt-2 line-clamp-2 text-sm leading-5 text-slate-300">
                        {partner.address || 'Supporting local fundraising through RaiseHub.'}
                      </p>
                      <span className="mt-4 inline-flex items-center gap-2 text-sm font-black text-green-200">
                        View partner <span aria-hidden="true">→</span>
                      </span>
                    </div>
                  </div>
                </button>
              </div>
            )
          })}
        </div>
      </section>

      {selectedPartner ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${getPartnerName(selectedPartner)} details`}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 backdrop-blur-sm"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedPartner(null)
              resumeAutoAdvanceLater()
            }
          }}
        >
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-start gap-4">
              <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={selectedPartner.logo_url || '/default-business-logo.png'}
                  alt=""
                  className="max-h-full max-w-full object-contain"
                />
              </span>

              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-green-700">
                  Local Partner
                </p>
                <h3 className="mt-1 break-words text-xl font-black text-slate-950">
                  {getPartnerName(selectedPartner)}
                </h3>
              </div>
            </div>

            <div className="mt-5 space-y-3 text-sm text-slate-700">
              {selectedPartner.phone ? (
                <div>
                  <p className="font-black text-slate-950">Phone</p>
                  <p className="mt-1">{selectedPartner.phone}</p>
                </div>
              ) : null}

              {selectedPartner.address ? (
                <div>
                  <p className="font-black text-slate-950">Address</p>
                  <p className="mt-1 break-words">{selectedPartner.address}</p>
                </div>
              ) : null}

              <div className="flex flex-wrap gap-3 pt-2">
                <Link
                  href={`/businesses/${selectedPartner.id}`}
                  onClick={() => {
                    setSelectedPartner(null)
                    resumeAutoAdvanceLater()
                  }}
                  className="rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-black text-white hover:bg-blue-800"
                >
                  View RaiseHub Profile
                </Link>

                {selectedPartner.website_url ? (
                  <a
                    href={
                      selectedPartner.website_url.startsWith('http')
                        ? selectedPartner.website_url
                        : `https://${selectedPartner.website_url}`
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-xl bg-green-700 px-4 py-2.5 text-sm font-black text-white hover:bg-green-800"
                  >
                    Visit Website
                  </a>
                ) : null}

                {selectedPartner.google_maps_url ? (
                  <a
                    href={
                      selectedPartner.google_maps_url.startsWith('http')
                        ? selectedPartner.google_maps_url
                        : `https://${selectedPartner.google_maps_url}`
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-xl border border-green-200 bg-green-50 px-4 py-2.5 text-sm font-black text-green-700 hover:bg-green-100"
                  >
                    View Map
                  </a>
                ) : null}
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setSelectedPartner(null)
                resumeAutoAdvanceLater()
              }}
              className="mt-6 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 hover:bg-slate-50"
            >
              Close
            </button>
          </div>
        </div>
      ) : null}

      <div className="mx-auto mt-4 w-full max-w-6xl">
        <Link
          href="/businesses"
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 text-sm font-black text-green-700 transition hover:bg-green-100"
        >
          Browse all local partners <span aria-hidden="true">→</span>
        </Link>
      </div>
    </>
  )
}

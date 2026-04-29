'use client'

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

export default function LogoCarouselClient({
  partners,
}: LogoCarouselClientProps) {
  const [selectedPartner, setSelectedPartner] =
    useState<PartnerProfile | null>(null)
  const [isPaused, setIsPaused] = useState(false)

  const scrollRef = useRef<HTMLDivElement | null>(null)
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const scrollResumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  )

  // =========================================
  // 🎠 AUTO-SCROLL USING REAL SCROLL POSITION
  // =========================================
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    if (!partners || partners.length === 0) return

    let animationFrame: number

    function scroll() {
      if (!isPaused && !selectedPartner && el) {
        el.scrollLeft += 2.5

        if (el.scrollLeft >= el.scrollWidth / 2) {
          el.scrollLeft = 2
        }
      }

      animationFrame = requestAnimationFrame(scroll)
    }

    animationFrame = requestAnimationFrame(scroll)

    return () => cancelAnimationFrame(animationFrame)
  }, [isPaused, selectedPartner, partners])

  // =========================================
  // ⏸️ PAUSE / RESUME HELPERS
  // =========================================
  function pauseCarousel() {
    if (resumeTimerRef.current) {
      clearTimeout(resumeTimerRef.current)
    }

    setIsPaused(true)
  }

  function resumeCarouselWithDelay() {
    if (resumeTimerRef.current) {
      clearTimeout(resumeTimerRef.current)
    }

    resumeTimerRef.current = setTimeout(() => {
      setIsPaused(false)
    }, 800)
  }

  // =========================================
  // 📱 MANUAL SCROLL RESUME HELPER
  // Pauses while the user scrolls horizontally,
  // then resumes after scrolling stops.
  // =========================================
  function handleManualScroll() {
    setIsPaused(true)

    if (scrollResumeTimerRef.current) {
      clearTimeout(scrollResumeTimerRef.current)
    }

    scrollResumeTimerRef.current = setTimeout(() => {
      setIsPaused(false)
    }, 1200)
  }

  if (!partners || partners.length === 0) return null

  const repeatedPartners = Array.from(
    { length: 24 },
    (_, index) => partners[index % partners.length]
  )

  // =========================================
  // 🧱 LOGO CARD
  // =========================================
  function LogoCard({
    partner,
    index,
  }: {
    partner: PartnerProfile
    index: number
  }) {
    const name =
      partner.display_name || partner.business_name || 'Local Partner'

    return (
      <button
        key={`${partner.id}-${index}`}
        type="button"
        onClick={() => {
          pauseCarousel()
          setSelectedPartner(partner)
        }}
        className="flex h-20 w-32 shrink-0 items-center justify-center rounded-2xl border border-gray-100 bg-white p-3 shadow-sm transition hover:scale-105 hover:border-green-200 sm:h-24 sm:w-40 sm:p-4"
        title={name}
      >
        <img
          src={partner.logo_url || '/default-business-logo.png'}
          alt={`${name} logo`}
          className="max-h-12 max-w-24 object-contain sm:max-h-16 sm:max-w-32"
        />
      </button>
    )
  }

  return (
    <>
      <section className="mx-auto mt-12 w-full max-w-5xl overflow-hidden rounded-3xl border border-green-100 bg-white/90 p-4 shadow-xl sm:p-6">
        {/* =========================================
            🏷️ SECTION HEADER
        ========================================= */}
        <div className="mb-5 text-center">
          <h2 className="text-2xl font-semibold text-green-700">
            Local Partners
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Businesses and organizations helping support local fundraising.
          </p>
        </div>

        {/* =========================================
            🎠 REAL SCROLL CAROUSEL
        ========================================= */}
        <div
          ref={scrollRef}
          onMouseEnter={pauseCarousel}
          onMouseLeave={resumeCarouselWithDelay}
          onTouchStart={pauseCarousel}
          onTouchEnd={resumeCarouselWithDelay}
          onTouchCancel={resumeCarouselWithDelay}
          onPointerDown={pauseCarousel}
          onPointerUp={resumeCarouselWithDelay}
          onWheel={pauseCarousel}
          onScroll={handleManualScroll}
          className="flex gap-4 overflow-x-auto scroll-smooth pb-2 sm:gap-6"
        >
          {repeatedPartners.map((partner, index) => (
            <LogoCard
              key={`${partner.id}-${index}`}
              partner={partner}
              index={index}
            />
          ))}
        </div>
      </section>

      {/* =========================================
          🪪 PARTNER DETAILS MODAL
      ========================================= */}
      {selectedPartner ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start gap-4">
              <img
                src={selectedPartner.logo_url || '/default-business-logo.png'}
                alt="Partner logo"
                className="h-16 w-16 rounded-xl border border-gray-200 object-contain"
              />

              <div>
                <h3 className="text-xl font-semibold text-green-700">
                  {selectedPartner.display_name ||
                    selectedPartner.business_name ||
                    'Local Partner'}
                </h3>

                <p className="mt-1 text-sm capitalize text-gray-500">
                  {selectedPartner.role || 'partner'}
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-3 text-sm text-gray-700">
              <div>
                <p className="font-medium text-gray-900">Phone</p>
                <p>{selectedPartner.phone || 'Not available yet'}</p>
              </div>

              <div>
                <p className="font-medium text-gray-900">Address</p>
                <p>{selectedPartner.address || 'Not available yet'}</p>
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                {selectedPartner.website_url ? (
                  <a
                    href={
                      selectedPartner.website_url.startsWith('http')
                        ? selectedPartner.website_url
                        : `https://${selectedPartner.website_url}`
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
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
                    className="rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm font-medium text-green-700 hover:bg-green-100"
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
                resumeCarouselWithDelay()
              }}
              className="mt-6 w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:border-gray-400"
            >
              Close
            </button>
          </div>
        </div>
      ) : null}
    </>
  )
}
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

// Logos are small and glanceable; a moderate speed is fine.
const SCROLL_PX_PER_FRAME = 3

export default function LogoCarouselClient({
  partners,
}: LogoCarouselClientProps) {
  const [selectedPartner, setSelectedPartner] =
    useState<PartnerProfile | null>(null)
  const [isPaused, setIsPaused] = useState(false)
  const [reducedMotion, setReducedMotion] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  })

  const scrollRef = useRef<HTMLDivElement | null>(null)
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const scrollResumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isAutoScrollingRef = useRef(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')

    function onChange(e: MediaQueryListEvent) {
      setReducedMotion(e.matches)
      if (e.matches) setIsPaused(true)
    }

    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  // =========================================
  // 🎠 AUTO-SCROLL
  // =========================================
  useEffect(() => {
    if (!scrollRef.current || !partners?.length || reducedMotion) return

    let raf: number

    function loop() {
      const currentEl = scrollRef.current
      if (!currentEl) return

      if (!isPaused && !selectedPartner) {
        isAutoScrollingRef.current = true
        currentEl.scrollLeft += SCROLL_PX_PER_FRAME

        setTimeout(() => {
          isAutoScrollingRef.current = false
        }, 50)

        if (currentEl.scrollLeft >= currentEl.scrollWidth / 2) {
          currentEl.scrollLeft = 0
        }
      }

      raf = requestAnimationFrame(loop)
    }

    raf = requestAnimationFrame(loop)

    return () => cancelAnimationFrame(raf)
  }, [isPaused, selectedPartner, partners, reducedMotion])

  // =========================================
  // ⏸️ PAUSE / RESUME HELPERS
  // =========================================
  function pauseCarousel() {
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current)
    if (scrollResumeTimerRef.current) clearTimeout(scrollResumeTimerRef.current)
    setIsPaused(true)
  }

  function resumeCarouselWithDelay() {
    if (reducedMotion) return
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current)
    resumeTimerRef.current = setTimeout(() => setIsPaused(false), 1500)
  }

  function handleManualScroll() {
    if (isAutoScrollingRef.current) return
    setIsPaused(true)
    if (scrollResumeTimerRef.current) clearTimeout(scrollResumeTimerRef.current)
    scrollResumeTimerRef.current = setTimeout(() => {
      if (!reducedMotion) setIsPaused(false)
    }, 1500)
  }

  if (!partners?.length) return null

  const displayPartners = reducedMotion
    ? partners
    : Array.from(
        { length: Math.max(partners.length * 6, 24) },
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
        className="flex h-20 w-32 shrink-0 items-center justify-center rounded-2xl border border-gray-100 bg-white p-3 shadow-sm transition hover:scale-105 hover:border-green-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 sm:h-24 sm:w-40 sm:p-4"
        aria-label={`View ${name} details`}
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
      <section
        className="mx-auto mt-12 w-full max-w-5xl overflow-hidden rounded-3xl border border-green-100 bg-white/90 p-4 shadow-xl sm:p-6"
        aria-label="Local Partners carousel"
      >
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
            🎠 CAROUSEL
        ========================================= */}
        <div
          ref={scrollRef}
          role="list"
          aria-label="Partner logos"
          onMouseEnter={pauseCarousel}
          onMouseLeave={resumeCarouselWithDelay}
          onTouchStart={pauseCarousel}
          onTouchEnd={resumeCarouselWithDelay}
          onTouchCancel={resumeCarouselWithDelay}
          onPointerDown={pauseCarousel}
          onPointerUp={resumeCarouselWithDelay}
          onWheel={pauseCarousel}
          onScroll={handleManualScroll}
          onFocus={pauseCarousel}
          onBlur={resumeCarouselWithDelay}
          className="flex gap-4 overflow-x-auto scroll-smooth pb-2 sm:gap-6"
          style={{ scrollSnapType: reducedMotion ? 'x mandatory' : undefined }}
        >
          {displayPartners.map((partner, index) => (
            <div
              key={`${partner.id}-${index}`}
              role="listitem"
              style={reducedMotion ? { scrollSnapAlign: 'start' } : undefined}
            >
              <LogoCard partner={partner} index={index} />
            </div>
          ))}
        </div>
      </section>

      {/* =========================================
          🪪 PARTNER DETAILS MODAL
      ========================================= */}
      {selectedPartner ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${selectedPartner.display_name || selectedPartner.business_name || 'Partner'} details`}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setSelectedPartner(null)
              resumeCarouselWithDelay()
            }
          }}
        >
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
'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'

type Offer = {
  id: string
  title: string | null
  discount: string | null
  description: string | null
  starts_at: string | null
  ends_at: string | null
  business_id: string
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

// Scroll speed in pixels per animation frame (~60 fps).
// Matches the campaign carousel for a consistent, readable experience.
const SCROLL_PX_PER_FRAME = 1.5

export default function FeaturedDealsCarouselClient({
  offers,
  profileById,
}: FeaturedDealsCarouselClientProps) {
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
  // 🎠 AUTO-SCROLL USING REAL SCROLL POSITION
  // =========================================
  useEffect(() => {
    if (!scrollRef.current || !offers?.length || reducedMotion) return

    let raf: number

    function loop() {
      const currentEl = scrollRef.current
      if (!currentEl) return

      if (!isPaused) {
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
  }, [isPaused, offers, reducedMotion])

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

  function scrollBy(direction: 'prev' | 'next') {
    if (!scrollRef.current) return
    pauseCarousel()
    const cardWidth = 288 + 24 // w-72 (288px) + gap-6 (24px)
    scrollRef.current.scrollBy({
      left: direction === 'next' ? cardWidth : -cardWidth,
      behavior: 'smooth',
    })
    resumeCarouselWithDelay()
  }

  if (!offers?.length) return null

  // =========================================
  // 🔁 LOOP DATA (only when not reduced-motion)
  // =========================================
  const displayOffers = reducedMotion
    ? offers
    : Array.from(
        { length: Math.max(offers.length * 6, 24) },
        (_, index) => offers[index % offers.length]
      )

  // =========================================
  // 🧱 DEAL CARD
  // =========================================
  function DealCard({ offer, index }: { offer: Offer; index: number }) {
    const profile = profileById[offer.business_id]
    const businessName =
      profile?.display_name || profile?.business_name || 'Local Business'

    return (
      <Link
        key={`${offer.id}-${index}`}
        href={`/offers/${offer.id}`}
        onClick={pauseCarousel}
        className="flex w-72 shrink-0 flex-col justify-between rounded-2xl border border-yellow-100 bg-white p-5 shadow-sm transition hover:scale-105 hover:border-yellow-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500"
        aria-label={`${businessName} — view deal`}
      >
        <div>
          <div className="flex items-center gap-3">
            <img
              src={profile?.logo_url || '/default-business-logo.png'}
              alt={`${businessName} logo`}
              className="h-12 w-12 rounded-xl border border-gray-200 object-cover"
            />
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-yellow-700">
                {businessName}
              </p>
              <h3 className="mt-1 text-base font-semibold text-gray-900">
                Exclusive Local Deal
              </h3>
            </div>
          </div>

          <div className="relative mt-4 overflow-hidden rounded-xl border border-yellow-100 bg-yellow-50 p-4">
            <div className="blur-sm">
              <p className="text-sm font-medium text-yellow-700">
                {offer.discount || 'Special savings available'}
              </p>
              <p className="mt-2 line-clamp-2 text-sm text-gray-600">
                {offer.description || 'Exclusive customer offer'}
              </p>
            </div>
            <div className="absolute inset-0 flex items-center justify-center bg-white/60">
              <span className="rounded-full bg-yellow-600 px-3 py-1 text-xs font-medium text-white">
                🔒 Members Only
              </span>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <p className="mb-3 text-xs text-gray-500">
            Valid until:{' '}
            {offer.ends_at
              ? new Date(offer.ends_at).toLocaleDateString()
              : '—'}
          </p>
          <div className="block rounded-lg bg-yellow-600 px-4 py-2 text-center text-sm font-medium text-white">
            View Deal
          </div>
        </div>
      </Link>
    )
  }

  return (
    <section
      className="mx-auto mt-12 max-w-5xl overflow-hidden rounded-3xl border border-yellow-100 bg-white/90 p-6 shadow-xl"
      aria-label="Exclusive Local Deals carousel"
    >
      {/* =========================================
          🏷️ SECTION HEADER
      ========================================= */}
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-yellow-600">
            Exclusive Local Deals
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            Log in to unlock full deal details from participating businesses.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Prev / Next controls */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => scrollBy('prev')}
              aria-label="Previous deals"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 shadow-sm hover:border-yellow-400 hover:text-yellow-700"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => scrollBy('next')}
              aria-label="Next deals"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 shadow-sm hover:border-yellow-400 hover:text-yellow-700"
            >
              ›
            </button>
          </div>

          <Link
            href="/offers"
            className="text-sm font-medium text-yellow-700 hover:underline"
          >
            View all deals →
          </Link>
        </div>
      </div>

      {/* =========================================
          🎠 CAROUSEL
      ========================================= */}
      <div
        ref={scrollRef}
        role="list"
        aria-label="Featured deals"
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
        className="flex gap-6 overflow-x-auto scroll-smooth pb-2"
        style={{ scrollSnapType: reducedMotion ? 'x mandatory' : undefined }}
      >
        {displayOffers.map((offer, index) => (
          <div
            key={`${offer.id}-${index}`}
            role="listitem"
            style={reducedMotion ? { scrollSnapAlign: 'start' } : undefined}
          >
            <DealCard offer={offer} index={index} />
          </div>
        ))}
      </div>
    </section>
  )
}
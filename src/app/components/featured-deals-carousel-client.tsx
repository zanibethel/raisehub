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

export default function FeaturedDealsCarouselClient({
  offers,
  profileById,
}: FeaturedDealsCarouselClientProps) {
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
    if (!offers || offers.length === 0) return

    let animationFrame: number

    function scroll() {
      if (!isPaused && el) {
        el.scrollLeft += 0.5

        if (el.scrollLeft >= el.scrollWidth / 2) {
          el.scrollLeft = 0
        }
      }

      animationFrame = requestAnimationFrame(scroll)
    }

    animationFrame = requestAnimationFrame(scroll)

    return () => cancelAnimationFrame(animationFrame)
  }, [isPaused, offers])

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
    }, 900)
  }

  if (!offers || offers.length === 0) return null

  const repeatedOffers = Array.from(
    { length: 24 },
    (_, index) => offers[index % offers.length]
  )

  // =========================================
  // 🧱 DEAL CARD
  // =========================================
  function DealCard({
    offer,
    index,
  }: {
    offer: Offer
    index: number
  }) {
    const profile = profileById[offer.business_id]
    const businessName =
      profile?.display_name || profile?.business_name || 'Local Business'

    return (
      <Link
        key={`${offer.id}-${index}`}
        href={`/offers/${offer.id}`}
        onClick={pauseCarousel}
        className="flex w-72 shrink-0 flex-col justify-between rounded-2xl border border-yellow-100 bg-white p-5 shadow-sm transition hover:scale-105 hover:border-yellow-200"
      >
        {/* =========================================
            🏪 BUSINESS + DEAL HEADER
        ========================================= */}
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

          {/* =========================================
              🔒 MASKED DEAL PREVIEW
          ========================================= */}
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

        {/* =========================================
            📅 VALID DATE + CTA
        ========================================= */}
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
    <section className="mx-auto mt-12 max-w-5xl overflow-hidden rounded-3xl border border-yellow-100 bg-white/90 p-6 shadow-xl">
      {/* =========================================
          🏷️ SECTION HEADER
      ========================================= */}
      <div className="mb-5 text-center">
        <h2 className="text-2xl font-semibold text-yellow-600">
          Exclusive Local Deals
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          Log in to unlock full deal details from participating businesses.
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
        className="flex gap-6 overflow-x-auto scroll-smooth pb-2"
      >
        {repeatedOffers.map((offer, index) => (
          <DealCard
            key={`${offer.id}-${index}`}
            offer={offer}
            index={index}
          />
        ))}
      </div>
    </section>
  )
}
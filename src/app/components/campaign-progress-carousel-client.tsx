'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'

type CampaignCard = {
  id: string
  name: string
  goal: number
  earnings: number
  progress: number
}

type CampaignProgressCarouselClientProps = {
  campaigns: CampaignCard[]
}

const SCROLL_PX_PER_FRAME = 1.5

export default function CampaignProgressCarouselClient({
  campaigns,
}: CampaignProgressCarouselClientProps) {
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
    if (!scrollRef.current || campaigns.length === 0 || reducedMotion) return

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
  }, [isPaused, campaigns, reducedMotion])

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
    const cardWidth = 288 + 24
    scrollRef.current.scrollBy({
      left: direction === 'next' ? cardWidth : -cardWidth,
      behavior: 'smooth',
    })
    resumeCarouselWithDelay()
  }

  if (!campaigns.length) return null

  const displayCampaigns = reducedMotion
    ? campaigns
    : Array.from(
        { length: Math.max(campaigns.length * 6, 24) },
        (_, index) => campaigns[index % campaigns.length]
      )

  return (
    <section
      className="mx-auto mt-12 max-w-5xl overflow-hidden rounded-3xl border border-blue-100 bg-white/90 p-6 shadow-xl"
      aria-label="Trending Fundraisers carousel"
    >
      {/* =========================================
          🏷️ SECTION HEADER
      ========================================= */}
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-blue-700">
            Trending Fundraisers
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            See local campaigns gaining momentum.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => scrollBy('prev')}
              aria-label="Previous fundraisers"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 shadow-sm hover:border-blue-400 hover:text-blue-700"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => scrollBy('next')}
              aria-label="Next fundraisers"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 shadow-sm hover:border-blue-400 hover:text-blue-700"
            >
              ›
            </button>
          </div>

          <Link
            href="/campaigns"
            className="text-sm font-medium text-blue-700 hover:underline"
          >
            Browse all fundraisers →
          </Link>
        </div>
      </div>

      {/* =========================================
          🎠 CAROUSEL
      ========================================= */}
      <div
        ref={scrollRef}
        role="list"
        aria-label="Trending fundraiser campaigns"
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
        {displayCampaigns.map((campaign, index) => (
          <div
            key={`${campaign.id}-${index}`}
            role="listitem"
            style={reducedMotion ? { scrollSnapAlign: 'start' } : undefined}
          >
            <Link
              href={`/campaigns/${campaign.id}`}
              onClick={pauseCarousel}
              aria-label={`${campaign.name} — ${campaign.progress.toFixed(0)}% of goal`}
              className="flex w-72 shrink-0 flex-col justify-between rounded-2xl border border-blue-100 bg-white p-5 shadow-sm transition hover:scale-105 hover:border-blue-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500"
            >
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-blue-700">
                  Fundraiser
                </p>
                <h3 className="mt-1 line-clamp-2 text-base font-semibold text-gray-900">
                  {campaign.name}
                </h3>
                <p className="mt-4 text-2xl font-bold text-blue-700">
                  {campaign.progress.toFixed(0)}% of goal!
                </p>
                <div className="mt-3 h-2 w-full rounded-full bg-gray-200">
                  <div
                    className="h-2 rounded-full bg-blue-600 transition-all"
                    style={{ width: `${Math.min(campaign.progress, 100)}%` }}
                    role="progressbar"
                    // aria-valuenow is clamped to 100 because the visual bar cannot exceed full.
                    // The unclamped percentage (e.g. "125% funded") is conveyed via aria-label
                    // and the text above, so screen readers see the same figure sighted users do.
                    aria-valuenow={Math.min(campaign.progress, 100)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${campaign.progress.toFixed(0)}% funded`}
                  />
                </div>
              </div>
              <div className="mt-4">
                <p className="text-xs text-gray-500">
                  Raised ${campaign.earnings.toLocaleString()} of $
                  {campaign.goal.toLocaleString()}
                </p>
                <div className="mt-3 rounded-lg bg-blue-600 px-4 py-2 text-center text-sm font-medium text-white">
                  View Campaign
                </div>
              </div>
            </Link>
          </div>
        ))}
      </div>
    </section>
  )
}
'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import CampaignCard from './campaign-card'
import type { SelectableCampaignCard } from '@/lib/types/campaigns'

type CampaignProgressCarouselClientProps = {
  campaigns: SelectableCampaignCard[]
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

    function onChange(event: MediaQueryListEvent) {
      setReducedMotion(event.matches)
      if (event.matches) setIsPaused(true)
    }

    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    if (!scrollRef.current || campaigns.length === 0 || reducedMotion) return

    let raf: number

    function loop() {
      const currentElement = scrollRef.current
      if (!currentElement) return

      if (!isPaused) {
        isAutoScrollingRef.current = true
        currentElement.scrollLeft += SCROLL_PX_PER_FRAME

        setTimeout(() => {
          isAutoScrollingRef.current = false
        }, 50)

        if (currentElement.scrollLeft >= currentElement.scrollWidth / 2) {
          currentElement.scrollLeft = 0
        }
      }

      raf = requestAnimationFrame(loop)
    }

    raf = requestAnimationFrame(loop)

    return () => cancelAnimationFrame(raf)
  }, [campaigns, isPaused, reducedMotion])

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
    scrollRef.current.scrollBy({
      left: direction === 'next' ? 384 : -384,
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
      className="mx-auto mt-12 max-w-6xl overflow-hidden rounded-3xl border border-blue-100 bg-white/90 p-6 shadow-xl"
      aria-label="Trending Fundraisers carousel"
    >
      <div className="mb-5 flex items-center justify-between gap-4">
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
            <CampaignCard
              campaign={campaign}
              href={`/campaigns/${campaign.id}`}
              onClick={pauseCarousel}
              actionLabel="View Campaign"
              className="w-[360px] min-w-[360px] shrink-0"
            />
          </div>
        ))}
      </div>
    </section>
  )
}

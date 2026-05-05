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

export default function CampaignProgressCarouselClient({
  campaigns,
}: CampaignProgressCarouselClientProps) {
  const [isPaused, setIsPaused] = useState(false)

  const scrollRef = useRef<HTMLDivElement | null>(null)
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const scrollResumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  )
  const isAutoScrollingRef = useRef(false)

  // =========================================
  // 🎠 AUTO-SCROLL USING REAL SCROLL POSITION
  // =========================================
  useEffect(() => {
    if (!scrollRef.current || campaigns.length === 0) return

    let raf: number

    function loop() {
      const currentEl = scrollRef.current
      if (!currentEl) return

      if (!isPaused) {
        isAutoScrollingRef.current = true
        currentEl.scrollLeft += 2.5

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
  }, [isPaused, campaigns])

  // =========================================
  // ⏸️ PAUSE / RESUME HELPERS
  // =========================================
  function pauseCarousel() {
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current)
    if (scrollResumeTimerRef.current) clearTimeout(scrollResumeTimerRef.current)

    setIsPaused(true)
  }

  function resumeCarouselWithDelay() {
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current)

    resumeTimerRef.current = setTimeout(() => {
      setIsPaused(false)
    }, 800)
  }

  // =========================================
  // 📱 MANUAL SCROLL RESUME HELPER
  // =========================================
  function handleManualScroll() {
    if (isAutoScrollingRef.current) return

    setIsPaused(true)

    if (scrollResumeTimerRef.current) {
      clearTimeout(scrollResumeTimerRef.current)
    }

    scrollResumeTimerRef.current = setTimeout(() => {
      setIsPaused(false)
    }, 900)
  }

  if (!campaigns.length) return null

  // =========================================
  // 🔁 LOOP DATA
  // =========================================
  const repeatedCampaigns = Array.from(
    { length: Math.max(campaigns.length * 6, 24) },
    (_, index) => campaigns[index % campaigns.length]
  )

  return (
    <section className="mx-auto mt-12 max-w-5xl overflow-hidden rounded-3xl border border-blue-100 bg-white/90 p-6 shadow-xl">
      {/* =========================================
          🏷️ SECTION HEADER
      ========================================= */}
      <div className="mb-5 text-center">
        <h2 className="text-2xl font-semibold text-blue-700">
          Trending Fundraisers
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          See local campaigns gaining momentum.
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
        {repeatedCampaigns.map((campaign, index) => (
          <Link
            key={`${campaign.id}-${index}`}
            href={`/campaigns/${campaign.id}`}
            onClick={pauseCarousel}
            className="flex w-72 shrink-0 flex-col justify-between rounded-2xl border border-blue-100 bg-white p-5 shadow-sm transition hover:scale-105 hover:border-blue-200"
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
                  style={{ width: `${campaign.progress}%` }}
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
        ))}
      </div>
    </section>
  )
}
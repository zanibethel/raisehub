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
  const scrollResumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isAutoScrollingRef = useRef(false)

  // =========================================
  // 🎠 AUTO SCROLL
  // =========================================
  useEffect(() => {
    if (!scrollRef.current || !offers?.length) return

    let raf: number

    function loop() {
      const currentEl = scrollRef.current
      if (!currentEl) return

      if (!isPaused) {
        isAutoScrollingRef.current = true
        currentEl.scrollLeft += 2.5

        requestAnimationFrame(() => {
          isAutoScrollingRef.current = false
        })

        if (currentEl.scrollLeft >= currentEl.scrollWidth / 2) {
          currentEl.scrollLeft = 0
        }
      }

      raf = requestAnimationFrame(loop)
    }

    raf = requestAnimationFrame(loop)

    return () => cancelAnimationFrame(raf)
  }, [isPaused, offers])

  // =========================================
  // ⏸️ PAUSE / RESUME
  // =========================================
  function pause() {
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current)
    setIsPaused(true)
  }

  function resume() {
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current)
    resumeTimerRef.current = setTimeout(() => setIsPaused(false), 700)
  }

  // =========================================
  // 📱 MANUAL SCROLL RESUME
  // =========================================
  function handleScroll() {
    if (isAutoScrollingRef.current) return

    setIsPaused(true)

    if (scrollResumeTimerRef.current) {
      clearTimeout(scrollResumeTimerRef.current)
    }

    scrollResumeTimerRef.current = setTimeout(() => {
      setIsPaused(false)
    }, 800)
  }

  if (!offers?.length) return null

  // =========================================
  // 🔁 LOOP DATA
  // =========================================
  const repeated = Array.from(
    { length: Math.max(offers.length * 6, 24) },
    (_, i) => offers[i % offers.length]
  )

  return (
    <section className="mx-auto mt-12 max-w-5xl rounded-3xl border bg-white/90 p-6 shadow-xl">
      <h2 className="text-center text-2xl font-semibold text-yellow-600">
        Featured Deals
      </h2>

      {/* =========================================
          🎠 CAROUSEL
      ========================================= */}
      <div
        ref={scrollRef}
        onMouseEnter={pause}
        onMouseLeave={resume}
        onTouchStart={pause}
        onTouchEnd={resume}
        onTouchCancel={resume}
        onPointerDown={pause}
        onPointerUp={resume}
        onWheel={pause}
        onScroll={handleScroll}
        className="mt-6 flex gap-6 overflow-x-auto scroll-smooth pb-2"
      >
        {repeated.map((offer, i) => {
          const profile = profileById[offer.business_id]
          const businessName =
            profile?.display_name || profile?.business_name || 'Local Business'

          return (
            <Link
              key={`${offer.id}-${i}`}
              href={`/offers/${offer.id}`}
              className="w-72 shrink-0 rounded-xl border p-4"
            >
              <img
                src={profile?.logo_url || '/default-business-logo.png'}
                alt={`${businessName} logo`}
                className="mb-2 h-10"
              />
              <p className="font-semibold">Exclusive Deal</p>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
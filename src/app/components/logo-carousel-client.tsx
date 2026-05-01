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

export default function LogoCarouselClient({ partners }: LogoCarouselClientProps) {
  const [selectedPartner, setSelectedPartner] = useState<PartnerProfile | null>(null)
  const [isPaused, setIsPaused] = useState(false)

  const scrollRef = useRef<HTMLDivElement | null>(null)
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const scrollResumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isAutoScrollingRef = useRef(false)

// =========================================
// 🎠 AUTO SCROLL
// =========================================
useEffect(() => {
  if (!scrollRef.current || !partners?.length) return

  let raf: number

  function loop() {
    const currentEl = scrollRef.current
    if (!currentEl) return

    if (!isPaused && !selectedPartner) {
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
}, [isPaused, selectedPartner, partners])

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

  function handleScroll() {
    if (isAutoScrollingRef.current) return
    setIsPaused(true)

    if (scrollResumeTimerRef.current) clearTimeout(scrollResumeTimerRef.current)

    scrollResumeTimerRef.current = setTimeout(() => {
      setIsPaused(false)
    }, 800)
  }

  if (!partners?.length) return null

  // =========================================
  // 🔁 LOOP DATA
  // =========================================
  const repeated = Array.from(
    { length: Math.max(partners.length * 6, 24) },
    (_, i) => partners[i % partners.length]
  )

  return (
    <>
      <section className="mx-auto mt-12 max-w-5xl rounded-3xl border bg-white/90 p-6 shadow-xl">
        <h2 className="text-center text-2xl font-semibold text-green-700">
          Local Partners
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
          className="mt-6 flex gap-4 overflow-x-auto scroll-smooth pb-2"
        >
          {repeated.map((p, i) => (
            <button
              key={`${p.id}-${i}`}
              onClick={() => {
                pause()
                setSelectedPartner(p)
              }}
              className="flex h-20 w-32 shrink-0 items-center justify-center rounded-xl border bg-white p-3"
            >
              <img
  src={p.logo_url || '/default-business-logo.png'}
  alt={`${p.display_name || p.business_name || 'Local Partner'} logo`}
  className="max-h-12 object-contain"
/>
            </button>
          ))}
        </div>
      </section>

      {/* =========================================
          🪪 MODAL
      ========================================= */}
      {selectedPartner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-xl font-bold">
              {selectedPartner.display_name || selectedPartner.business_name}
            </h3>

            <button
              onClick={() => {
                setSelectedPartner(null)
                resume()
              }}
              className="mt-4 rounded bg-gray-200 px-4 py-2"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  )
}
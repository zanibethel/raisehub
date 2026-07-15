'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef } from 'react'

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

const AUTO_SCROLL_PIXELS_PER_SECOND = 34
const RESUME_DELAY_MS = 1000
const MINIMUM_LOOP_ITEMS = 8
const CARD_SCROLL_DISTANCE = 312

export default function FeaturedDealsCarouselClient({
  offers,
  profileById,
}: FeaturedDealsCarouselClientProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const interactionRef = useRef(false)
  const lastFrameRef = useRef<number | null>(null)
  const fractionalDistanceRef = useRef(0)
  const resumeTimerRef =
    useRef<ReturnType<typeof setTimeout> | null>(null)

  const loopOffers = useMemo(() => {
    if (!offers.length) return []

    const count = Math.max(
      offers.length,
      MINIMUM_LOOP_ITEMS
    )

    const singleSet = Array.from(
      { length: count },
      (_, index) => offers[index % offers.length]
    )

    return [...singleSet, ...singleSet]
  }, [offers])

  useEffect(() => {
    const element = scrollRef.current

    if (!element || !offers.length) return

    let animationFrameId = 0

    function normalizePosition(
      currentElement: HTMLDivElement
    ) {
      const loopWidth =
        currentElement.scrollWidth / 2

      if (loopWidth <= 0) return

      if (currentElement.scrollLeft >= loopWidth) {
        currentElement.scrollLeft -= loopWidth
      }
    }

    function animate(timestamp: number) {
      const currentElement = scrollRef.current

      if (!currentElement) return

      if (lastFrameRef.current === null) {
        lastFrameRef.current = timestamp
      }

      const elapsedSeconds = Math.min(
        (timestamp - lastFrameRef.current) / 1000,
        0.05
      )

      lastFrameRef.current = timestamp

      if (!interactionRef.current) {
        fractionalDistanceRef.current +=
          AUTO_SCROLL_PIXELS_PER_SECOND *
          elapsedSeconds

        const wholePixels = Math.floor(
          fractionalDistanceRef.current
        )

        if (wholePixels > 0) {
          currentElement.scrollLeft += wholePixels

          fractionalDistanceRef.current -=
            wholePixels

          normalizePosition(currentElement)
        }
      }

      animationFrameId =
        requestAnimationFrame(animate)
    }

    animationFrameId =
      requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(animationFrameId)
      lastFrameRef.current = null
      fractionalDistanceRef.current = 0
    }
  }, [offers.length])

  useEffect(() => {
    return () => {
      if (resumeTimerRef.current) {
        clearTimeout(resumeTimerRef.current)
      }
    }
  }, [])

  function pauseForInteraction() {
    if (resumeTimerRef.current) {
      clearTimeout(resumeTimerRef.current)
    }

    interactionRef.current = true
  }

  function resumeAfterInteraction() {
    if (resumeTimerRef.current) {
      clearTimeout(resumeTimerRef.current)
    }

    resumeTimerRef.current = setTimeout(() => {
      interactionRef.current = false
      lastFrameRef.current = null
      fractionalDistanceRef.current = 0
    }, RESUME_DELAY_MS)
  }

  function scrollByDirection(
    direction: 'prev' | 'next'
  ) {
    const element = scrollRef.current

    if (!element) return

    pauseForInteraction()

    element.scrollBy({
      left:
        direction === 'next'
          ? CARD_SCROLL_DISTANCE
          : -CARD_SCROLL_DISTANCE,
      behavior: 'smooth',
    })

    resumeAfterInteraction()
  }

  if (!offers.length) return null

  return (
    <section
      className="mx-auto mt-12 w-full max-w-5xl overflow-hidden rounded-3xl border border-yellow-100 bg-white/90 p-4 shadow-xl sm:p-6"
      aria-label="Exclusive Local Deals carousel"
    >
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-yellow-600">
            Exclusive Local Deals
          </h2>

          <p className="mt-1 text-sm text-gray-600">
            Log in to unlock full deal details from participating businesses.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() =>
                scrollByDirection('prev')
              }
              aria-label="Previous deals"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 shadow-sm hover:border-yellow-400 hover:text-yellow-700"
            >
              ‹
            </button>

            <button
              type="button"
              onClick={() =>
                scrollByDirection('next')
              }
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

      <div
        ref={scrollRef}
        role="list"
        aria-label="Featured deals"
        onTouchStart={pauseForInteraction}
        onTouchEnd={resumeAfterInteraction}
        onTouchCancel={resumeAfterInteraction}
        onPointerDown={pauseForInteraction}
        onPointerUp={resumeAfterInteraction}
        onPointerCancel={resumeAfterInteraction}
        onMouseEnter={pauseForInteraction}
        onMouseLeave={resumeAfterInteraction}
        onFocus={pauseForInteraction}
        onBlur={resumeAfterInteraction}
        className="flex w-full touch-pan-x gap-6 overflow-x-auto pb-2 [scrollbar-width:none] [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden"
      >
        {loopOffers.map((offer, index) => {
          const duplicate =
            index >= loopOffers.length / 2

          const profile =
            profileById[offer.business_id]

          const businessName =
            profile?.display_name ||
            profile?.business_name ||
            'Local Business'

          return (
            <div
              key={`${offer.id}-${index}`}
              role="listitem"
              className="shrink-0"
              aria-hidden={
                duplicate ? true : undefined
              }
            >
              <Link
                href={`/offers/${offer.id}`}
                tabIndex={duplicate ? -1 : 0}
                onClick={pauseForInteraction}
                className="flex w-72 shrink-0 flex-col justify-between rounded-2xl border border-yellow-100 bg-white p-5 shadow-sm transition hover:scale-105 hover:border-yellow-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500"
                aria-label={
                  duplicate
                    ? undefined
                    : `${businessName} — view deal`
                }
              >
                <div>
                  <div className="flex items-center gap-3">
                    <img
                      src={
                        profile?.logo_url ||
                        '/default-business-logo.png'
                      }
                      alt={
                        duplicate
                          ? ''
                          : `${businessName} logo`
                      }
                      className="h-12 w-12 rounded-xl border border-gray-200 object-cover"
                    />

                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium uppercase tracking-wide text-yellow-700">
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
                        {offer.discount ||
                          'Special savings available'}
                      </p>

                      <p className="mt-2 line-clamp-2 text-sm text-gray-600">
                        {offer.description ||
                          'Exclusive customer offer'}
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
                      ? new Date(
                          offer.ends_at
                        ).toLocaleDateString()
                      : '—'}
                  </p>

                  <div className="block rounded-lg bg-yellow-600 px-4 py-2 text-center text-sm font-medium text-white">
                    View Deal
                  </div>
                </div>
              </Link>
            </div>
          )
        })}
      </div>
    </section>
  )
}

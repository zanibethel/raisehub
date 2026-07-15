'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef } from 'react'
import CampaignCard from './campaign-card'
import type { SelectableCampaignCard } from '@/lib/types/campaigns'

type CampaignProgressCarouselClientProps = {
  campaigns: SelectableCampaignCard[]
}

const BASE_SCROLL_PIXELS_PER_SECOND = 34
const MAX_EDGE_SCROLL_PIXELS_PER_SECOND = 150
const EDGE_ZONE_RATIO = 0.28
const RESUME_DELAY_MS = 1000
const MINIMUM_LOOP_ITEMS = 8

export default function CampaignProgressCarouselClient({
  campaigns,
}: CampaignProgressCarouselClientProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const interactionRef = useRef(false)
  const lastFrameRef = useRef<number | null>(null)
  const fractionalDistanceRef = useRef(0)
  const hoverDirectionRef = useRef<1 | -1>(1)
  const hoverSpeedRef = useRef(BASE_SCROLL_PIXELS_PER_SECOND)
  const resumeTimerRef =
    useRef<ReturnType<typeof setTimeout> | null>(null)

  const loopCampaigns = useMemo(() => {
    if (!campaigns.length) return []

    const count = Math.max(
      campaigns.length,
      MINIMUM_LOOP_ITEMS
    )

    const singleSet = Array.from(
      { length: count },
      (_, index) => campaigns[index % campaigns.length]
    )

    return [...singleSet, ...singleSet]
  }, [campaigns])

  useEffect(() => {
    const element = scrollRef.current

    if (!element || !campaigns.length) return

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

      if (currentElement.scrollLeft <= 0) {
        currentElement.scrollLeft += loopWidth
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
          hoverSpeedRef.current * elapsedSeconds

        const wholePixels = Math.floor(
          fractionalDistanceRef.current
        )

        if (wholePixels > 0) {
          currentElement.scrollLeft +=
            wholePixels * hoverDirectionRef.current

          fractionalDistanceRef.current -= wholePixels
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
  }, [campaigns.length])

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

  function handleMouseMove(
    event: React.MouseEvent<HTMLDivElement>
  ) {
    const element = scrollRef.current

    if (!element) return

    const bounds = element.getBoundingClientRect()
    const position =
      (event.clientX - bounds.left) / bounds.width

    if (position < EDGE_ZONE_RATIO) {
      const strength =
        (EDGE_ZONE_RATIO - position) /
        EDGE_ZONE_RATIO

      hoverDirectionRef.current = -1
      hoverSpeedRef.current =
        BASE_SCROLL_PIXELS_PER_SECOND +
        strength *
          (MAX_EDGE_SCROLL_PIXELS_PER_SECOND -
            BASE_SCROLL_PIXELS_PER_SECOND)

      return
    }

    if (position > 1 - EDGE_ZONE_RATIO) {
      const strength =
        (position - (1 - EDGE_ZONE_RATIO)) /
        EDGE_ZONE_RATIO

      hoverDirectionRef.current = 1
      hoverSpeedRef.current =
        BASE_SCROLL_PIXELS_PER_SECOND +
        strength *
          (MAX_EDGE_SCROLL_PIXELS_PER_SECOND -
            BASE_SCROLL_PIXELS_PER_SECOND)

      return
    }

    hoverDirectionRef.current = 1
    hoverSpeedRef.current =
      BASE_SCROLL_PIXELS_PER_SECOND
  }

  function resetDesktopHover() {
    hoverDirectionRef.current = 1
    hoverSpeedRef.current =
      BASE_SCROLL_PIXELS_PER_SECOND
  }

  if (!campaigns.length) return null

  return (
    <section
      className="mx-auto mt-12 w-full max-w-6xl overflow-hidden rounded-3xl border border-blue-100 bg-white/90 p-4 shadow-xl sm:p-6"
      aria-label="Trending Fundraisers carousel"
    >
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-blue-700">
            Trending Fundraisers
          </h2>

          <p className="mt-1 text-sm text-gray-600">
            See local campaigns gaining momentum.
          </p>
        </div>

        <Link
          href="/campaigns"
          className="w-fit text-sm font-medium text-blue-700 hover:underline"
        >
          Browse all fundraisers →
        </Link>
      </div>

      <div
        ref={scrollRef}
        role="list"
        aria-label="Trending fundraiser campaigns"
        onMouseMove={handleMouseMove}
        onMouseLeave={resetDesktopHover}
        onTouchStart={pauseForInteraction}
        onTouchEnd={resumeAfterInteraction}
        onTouchCancel={resumeAfterInteraction}
        onPointerDown={pauseForInteraction}
        onPointerUp={resumeAfterInteraction}
        onPointerCancel={resumeAfterInteraction}
        onFocus={pauseForInteraction}
        onBlur={resumeAfterInteraction}
        className="flex w-full touch-pan-x gap-6 overflow-x-auto pb-2 [scrollbar-width:none] [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden"
      >
        {loopCampaigns.map((campaign, index) => {
          const duplicate =
            index >= loopCampaigns.length / 2

          return (
            <div
              key={`${campaign.id}-${index}`}
              role="listitem"
              className="shrink-0"
              aria-hidden={
                duplicate ? true : undefined
              }
            >
              <CampaignCard
                campaign={campaign}
                href={`/campaigns/${campaign.id}`}
                onClick={pauseForInteraction}
                actionLabel="View Campaign"
                className="w-[min(360px,calc(100vw-5.5rem))] min-w-[min(360px,calc(100vw-5.5rem))] shrink-0 sm:w-[360px] sm:min-w-[360px]"
              />
            </div>
          )
        })}
      </div>
    </section>
  )
}

'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

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

const SCROLL_PIXELS_PER_SECOND = 36
const MOBILE_MINIMUM_ITEMS = 8
const RESUME_DELAY_MS = 1200

export default function LogoCarouselClient({
  partners,
}: LogoCarouselClientProps) {
  const [selectedPartner, setSelectedPartner] =
    useState<PartnerProfile | null>(null)
  const [isPaused, setIsPaused] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)

  const scrollRef = useRef<HTMLDivElement | null>(null)
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isAutoScrollingRef = useRef(false)
  const lastFrameTimeRef = useRef<number | null>(null)

  useEffect(() => {
    const mediaQuery = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    )

    function applyPreference() {
      setReducedMotion(mediaQuery.matches)
    }

    applyPreference()
    mediaQuery.addEventListener('change', applyPreference)

    return () => {
      mediaQuery.removeEventListener('change', applyPreference)
    }
  }, [])

  useEffect(() => {
    return () => {
      if (resumeTimerRef.current) {
        clearTimeout(resumeTimerRef.current)
      }
    }
  }, [])

  const loopSet = useMemo(() => {
    if (!partners.length) return []

    const itemCount = Math.max(
      partners.length,
      MOBILE_MINIMUM_ITEMS
    )

    return Array.from(
      { length: itemCount },
      (_, index) =>
        partners[index % partners.length]
    )
  }, [partners])

  const displayPartners = useMemo(
    () =>
      reducedMotion
        ? partners
        : [...loopSet, ...loopSet],
    [loopSet, partners, reducedMotion]
  )

  useEffect(() => {
    const element = scrollRef.current

    if (
      !element ||
      partners.length === 0 ||
      reducedMotion
    ) {
      return
    }

    let animationFrameId = 0

    function animate(timestamp: number) {
      const currentElement = scrollRef.current

      if (!currentElement) return

      if (lastFrameTimeRef.current === null) {
        lastFrameTimeRef.current = timestamp
      }

      const elapsedSeconds =
        (timestamp - lastFrameTimeRef.current) /
        1000

      lastFrameTimeRef.current = timestamp

      if (!isPaused && !selectedPartner) {
        isAutoScrollingRef.current = true

        currentElement.scrollLeft +=
          SCROLL_PIXELS_PER_SECOND *
          elapsedSeconds

        const loopWidth =
          currentElement.scrollWidth / 2

        if (
          loopWidth > 0 &&
          currentElement.scrollLeft >= loopWidth
        ) {
          currentElement.scrollLeft -= loopWidth
        }

        requestAnimationFrame(() => {
          isAutoScrollingRef.current = false
        })
      }

      animationFrameId =
        requestAnimationFrame(animate)
    }

    animationFrameId =
      requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(animationFrameId)
      lastFrameTimeRef.current = null
    }
  }, [
    isPaused,
    partners.length,
    reducedMotion,
    selectedPartner,
  ])

  function pauseCarousel() {
    if (resumeTimerRef.current) {
      clearTimeout(resumeTimerRef.current)
    }

    setIsPaused(true)
  }

  function resumeCarouselWithDelay() {
    if (reducedMotion) return

    if (resumeTimerRef.current) {
      clearTimeout(resumeTimerRef.current)
    }

    resumeTimerRef.current = setTimeout(
      () => setIsPaused(false),
      RESUME_DELAY_MS
    )
  }

  function handleManualScroll() {
    if (isAutoScrollingRef.current) return

    pauseCarousel()
    resumeCarouselWithDelay()
  }

  if (!partners.length) return null

  function LogoCard({
    partner,
    index,
  }: {
    partner: PartnerProfile
    index: number
  }) {
    const name =
      partner.display_name ||
      partner.business_name ||
      'Local Partner'

    return (
      <button
        type="button"
        onClick={() => {
          pauseCarousel()
          setSelectedPartner(partner)
        }}
        className="flex h-20 w-32 shrink-0 items-center justify-center rounded-2xl border border-gray-100 bg-white p-3 shadow-sm transition hover:scale-105 hover:border-green-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 sm:h-24 sm:w-40 sm:p-4"
        aria-label={`View ${name} details`}
      >
        <img
          src={
            partner.logo_url ||
            '/default-business-logo.png'
          }
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
        <div className="mb-5 text-center">
          <h2 className="text-2xl font-semibold text-green-700">
            Local Partners
          </h2>

          <p className="mt-2 text-sm text-gray-600">
            Local businesses helping support fundraising in the community.
          </p>
        </div>

        <div
          ref={scrollRef}
          role="list"
          aria-label="Partner logos"
          onMouseEnter={pauseCarousel}
          onMouseLeave={resumeCarouselWithDelay}
          onTouchStart={pauseCarousel}
          onTouchEnd={resumeCarouselWithDelay}
          onTouchCancel={resumeCarouselWithDelay}
          onScroll={handleManualScroll}
          onFocus={pauseCarousel}
          onBlur={resumeCarouselWithDelay}
          className="flex w-full gap-4 overflow-x-auto scroll-smooth pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:gap-6"
          style={{
            scrollSnapType: reducedMotion
              ? 'x mandatory'
              : undefined,
          }}
        >
          {displayPartners.map(
            (partner, index) => (
              <div
                key={`${partner.id}-${index}`}
                role="listitem"
                className="shrink-0"
                style={
                  reducedMotion
                    ? {
                        scrollSnapAlign: 'start',
                      }
                    : undefined
                }
              >
                <LogoCard
                  partner={partner}
                  index={index}
                />
              </div>
            )
          )}
        </div>
      </section>

      {selectedPartner ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${
            selectedPartner.display_name ||
            selectedPartner.business_name ||
            'Partner'
          } details`}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={(event) => {
            if (
              event.target === event.currentTarget
            ) {
              setSelectedPartner(null)
              resumeCarouselWithDelay()
            }
          }}
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start gap-4">
              <img
                src={
                  selectedPartner.logo_url ||
                  '/default-business-logo.png'
                }
                alt="Partner logo"
                className="h-16 w-16 rounded-xl border border-gray-200 object-contain"
              />

              <div className="min-w-0">
                <h3 className="break-words text-xl font-semibold text-green-700">
                  {selectedPartner.display_name ||
                    selectedPartner.business_name ||
                    'Local Partner'}
                </h3>

                <p className="mt-1 text-sm capitalize text-gray-500">
                  {selectedPartner.role ||
                    'business'}
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-3 text-sm text-gray-700">
              <div>
                <p className="font-medium text-gray-900">
                  Phone
                </p>
                <p>
                  {selectedPartner.phone ||
                    'Not available yet'}
                </p>
              </div>

              <div>
                <p className="font-medium text-gray-900">
                  Address
                </p>
                <p className="break-words">
                  {selectedPartner.address ||
                    'Not available yet'}
                </p>
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                {selectedPartner.website_url ? (
                  <a
                    href={
                      selectedPartner.website_url.startsWith(
                        'http'
                      )
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
                      selectedPartner.google_maps_url.startsWith(
                        'http'
                      )
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

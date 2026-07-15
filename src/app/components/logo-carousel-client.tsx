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

const AUTO_SCROLL_PIXELS_PER_SECOND = 34
const RESUME_DELAY_MS = 1000
const MINIMUM_LOOP_ITEMS = 8

export default function LogoCarouselClient({
  partners,
}: LogoCarouselClientProps) {
  const [selectedPartner, setSelectedPartner] =
    useState<PartnerProfile | null>(null)

  const scrollRef = useRef<HTMLDivElement | null>(null)
  const interactionRef = useRef(false)
  const lastFrameRef = useRef<number | null>(null)
  const resumeTimerRef =
    useRef<ReturnType<typeof setTimeout> | null>(null)

  const loopPartners = useMemo(() => {
    if (!partners.length) return []

    const count = Math.max(
      partners.length,
      MINIMUM_LOOP_ITEMS
    )

    const singleSet = Array.from(
      { length: count },
      (_, index) => partners[index % partners.length]
    )

    return [...singleSet, ...singleSet]
  }, [partners])

  useEffect(() => {
    const element = scrollRef.current

    if (!element || !partners.length) return

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

      if (
        !interactionRef.current &&
        !selectedPartner
      ) {
        currentElement.scrollLeft +=
          AUTO_SCROLL_PIXELS_PER_SECOND *
          elapsedSeconds

        normalizePosition(currentElement)
      }

      animationFrameId =
        requestAnimationFrame(animate)
    }

    animationFrameId =
      requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(animationFrameId)
      lastFrameRef.current = null
    }
  }, [partners.length, selectedPartner])

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
    }, RESUME_DELAY_MS)
  }

  function getPartnerName(
    partner: PartnerProfile
  ) {
    return (
      partner.display_name ||
      partner.business_name ||
      'Local Partner'
    )
  }

  if (!partners.length) return null

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
          className="flex w-full touch-pan-x gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden sm:gap-6"
        >
          {loopPartners.map((partner, index) => {
            const duplicate =
              index >= loopPartners.length / 2

            const name =
              getPartnerName(partner)

            return (
              <div
                key={`${partner.id}-${index}`}
                role="listitem"
                className="shrink-0"
                aria-hidden={
                  duplicate ? true : undefined
                }
              >
                <button
                  type="button"
                  tabIndex={duplicate ? -1 : 0}
                  onClick={() => {
                    if (duplicate) return

                    interactionRef.current = true
                    setSelectedPartner(partner)
                  }}
                  aria-label={
                    duplicate
                      ? undefined
                      : `View ${name} details`
                  }
                  className="flex h-20 w-32 shrink-0 items-center justify-center rounded-2xl border border-gray-100 bg-white p-3 shadow-sm transition hover:scale-105 hover:border-green-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 sm:h-24 sm:w-40 sm:p-4"
                >
                  <img
                    src={
                      partner.logo_url ||
                      '/default-business-logo.png'
                    }
                    alt={
                      duplicate
                        ? ''
                        : `${name} logo`
                    }
                    className="max-h-12 max-w-24 object-contain sm:max-h-16 sm:max-w-32"
                  />
                </button>
              </div>
            )
          })}
        </div>
      </section>

      {selectedPartner ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${getPartnerName(
            selectedPartner
          )} details`}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedPartner(null)
              resumeAfterInteraction()
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
                alt={`${getPartnerName(
                  selectedPartner
                )} logo`}
                className="h-16 w-16 rounded-xl border border-gray-200 object-contain"
              />

              <div className="min-w-0">
                <h3 className="break-words text-xl font-semibold text-green-700">
                  {getPartnerName(selectedPartner)}
                </h3>

                <p className="mt-1 text-sm capitalize text-gray-500">
                  {selectedPartner.role || 'business'}
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
                resumeAfterInteraction()
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

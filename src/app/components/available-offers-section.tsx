'use client'

import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import SaveOfferButton from './save-offer-button'

// =============================================================================
// Types
// =============================================================================

type Offer = {
  id: string
  title: string | null
  description: string | null
  discount: string | null
  starts_at: string | null
  ends_at: string | null
  business_name?: string
  phone?: string
  address?: string
  google_maps_url?: string
}

type AvailableOffersSectionProps = {
  offers: Offer[]
  savedOfferIds: string[]
}

type DealView = 'all' | 'saved'

type SortOption =
  | 'recommended'
  | 'expiring'
  | 'newest'
  | 'business'

// =============================================================================
// Constants
// =============================================================================

const EXPIRING_SOON_DAYS = 14

const ALL_OFFERS_HASH = '#offers-all'
const SAVED_OFFERS_HASH = '#offers-saved'
const EXPIRING_OFFERS_HASH = '#offers-expiring'
const LEGACY_AVAILABLE_OFFERS_HASH =
  '#available-offers'

// =============================================================================
// Helpers
// =============================================================================

function getDateValue(
  value: string | null | undefined,
  fallback: number
): number {
  if (!value) {
    return fallback
  }

  const dateValue = new Date(value).getTime()

  return Number.isNaN(dateValue)
    ? fallback
    : dateValue
}

function isEndingSoon(
  offer: Offer,
  now: number
): boolean {
  const expirationDate = getDateValue(
    offer.ends_at,
    Number.POSITIVE_INFINITY
  )

  if (!Number.isFinite(expirationDate)) {
    return false
  }

  const expirationWindow =
    now +
    EXPIRING_SOON_DAYS *
      24 *
      60 *
      60 *
      1000

  return (
    expirationDate >= now &&
    expirationDate <= expirationWindow
  )
}

function getSearchText(offer: Offer): string {
  return [
    offer.business_name,
    offer.title,
    offer.description,
    offer.discount,
    offer.address,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

function compareBusinessNames(
  firstOffer: Offer,
  secondOffer: Offer
): number {
  const firstName =
    firstOffer.business_name || 'Local Business'

  const secondName =
    secondOffer.business_name || 'Local Business'

  return firstName.localeCompare(secondName)
}

// =============================================================================
// Component
// =============================================================================

export default function AvailableOffersSection({
  offers,
  savedOfferIds,
}: AvailableOffersSectionProps) {
  const [searchQuery, setSearchQuery] =
    useState('')

  const [dealView, setDealView] =
    useState<DealView>('all')

  const [hideSaved, setHideSaved] =
    useState(false)

  const [endingSoonOnly, setEndingSoonOnly] =
    useState(false)

  const [sortOption, setSortOption] =
    useState<SortOption>('recommended')

  const savedOfferIdSet = useMemo(
    () => new Set(savedOfferIds),
    [savedOfferIds]
  )

  function resetToAllDeals() {
    setSearchQuery('')
    setDealView('all')
    setHideSaved(false)
    setEndingSoonOnly(false)
    setSortOption('recommended')
  }

  function applyHashPreset(hash: string) {
    if (hash === SAVED_OFFERS_HASH) {
      setSearchQuery('')
      setDealView('saved')
      setHideSaved(false)
      setEndingSoonOnly(false)
      setSortOption('recommended')
      return
    }

    if (hash === EXPIRING_OFFERS_HASH) {
      setSearchQuery('')
      setDealView('all')
      setHideSaved(false)
      setEndingSoonOnly(true)
      setSortOption('expiring')
      return
    }

    if (
      hash === ALL_OFFERS_HASH ||
      hash === LEGACY_AVAILABLE_OFFERS_HASH
    ) {
      resetToAllDeals()
    }
  }

  useEffect(() => {
    function handleHashChange() {
      applyHashPreset(window.location.hash)
    }

    handleHashChange()

    window.addEventListener(
      'hashchange',
      handleHashChange
    )

    return () => {
      window.removeEventListener(
        'hashchange',
        handleHashChange
      )
    }
  }, [])

  const visibleOffers = useMemo(() => {
    const normalizedSearchQuery =
      searchQuery.trim().toLowerCase()

    const now = Date.now()

    const matchingOffers = offers.filter(
      (offer) => {
        const isSaved =
          savedOfferIdSet.has(offer.id)

        if (
          dealView === 'saved' &&
          !isSaved
        ) {
          return false
        }

        if (
          dealView === 'all' &&
          hideSaved &&
          isSaved
        ) {
          return false
        }

        if (
          endingSoonOnly &&
          !isEndingSoon(offer, now)
        ) {
          return false
        }

        if (
          normalizedSearchQuery &&
          !getSearchText(offer).includes(
            normalizedSearchQuery
          )
        ) {
          return false
        }

        return true
      }
    )

    return [...matchingOffers].sort(
      (firstOffer, secondOffer) => {
        if (sortOption === 'business') {
          return compareBusinessNames(
            firstOffer,
            secondOffer
          )
        }

        if (sortOption === 'newest') {
          return (
            getDateValue(
              secondOffer.starts_at,
              0
            ) -
            getDateValue(
              firstOffer.starts_at,
              0
            )
          )
        }

        if (sortOption === 'expiring') {
          const expirationDifference =
            getDateValue(
              firstOffer.ends_at,
              Number.POSITIVE_INFINITY
            ) -
            getDateValue(
              secondOffer.ends_at,
              Number.POSITIVE_INFINITY
            )

          if (expirationDifference !== 0) {
            return expirationDifference
          }

          return compareBusinessNames(
            firstOffer,
            secondOffer
          )
        }

        const firstIsSaved =
          savedOfferIdSet.has(firstOffer.id)

        const secondIsSaved =
          savedOfferIdSet.has(secondOffer.id)

        if (firstIsSaved !== secondIsSaved) {
          return firstIsSaved ? -1 : 1
        }

        const expirationDifference =
          getDateValue(
            firstOffer.ends_at,
            Number.POSITIVE_INFINITY
          ) -
          getDateValue(
            secondOffer.ends_at,
            Number.POSITIVE_INFINITY
          )

        if (expirationDifference !== 0) {
          return expirationDifference
        }

        return compareBusinessNames(
          firstOffer,
          secondOffer
        )
      }
    )
  }, [
    offers,
    savedOfferIdSet,
    searchQuery,
    dealView,
    hideSaved,
    endingSoonOnly,
    sortOption,
  ])

  const hasSavedOffers =
    savedOfferIds.length > 0

  const hasActiveFilters =
    searchQuery.trim().length > 0 ||
    dealView !== 'all' ||
    hideSaved ||
    endingSoonOnly ||
    sortOption !== 'recommended'

  function clearFilters() {
    resetToAllDeals()

    if (
      window.location.hash ===
        SAVED_OFFERS_HASH ||
      window.location.hash ===
        EXPIRING_OFFERS_HASH
    ) {
      window.history.replaceState(
        null,
        '',
        ALL_OFFERS_HASH
      )
    }
  }

  function handleDealViewChange(
    nextView: DealView
  ) {
    setDealView(nextView)
    setHideSaved(false)

    if (nextView === 'saved') {
      window.history.replaceState(
        null,
        '',
        SAVED_OFFERS_HASH
      )
      return
    }

    window.history.replaceState(
      null,
      '',
      ALL_OFFERS_HASH
    )
  }

  return (
    <section
      id="deal-browser"
      aria-label="Available local deals"
      className="scroll-mt-6"
    >
      <div className="rounded-3xl border border-blue-100 bg-white/90 p-5 shadow-lg backdrop-blur sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
              Search &amp; Sort
            </p>

            <h3 className="mt-1 text-xl font-bold text-gray-900">
              Find your best local deal
            </h3>

            <p className="mt-1 text-sm text-gray-600">
              Search for a favorite business or
              narrow the list to the deals you need.
            </p>
          </div>

          <p
            className="text-sm text-gray-600"
            aria-live="polite"
          >
            Showing{' '}
            <span className="font-semibold text-gray-900">
              {visibleOffers.length}
            </span>{' '}
            {visibleOffers.length === 1
              ? 'deal'
              : 'deals'}
          </p>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_190px_220px]">
          <label className="block">
            <span className="text-sm font-semibold text-gray-700">
              Search businesses or offers
            </span>

            <div className="relative mt-2">
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 left-3 flex items-center"
              >
                🔎
              </span>

              <input
                type="search"
                value={searchQuery}
                onChange={(event) =>
                  setSearchQuery(
                    event.target.value
                  )
                }
                placeholder="Try Elysian, pizza, 20% off…"
                className="w-full rounded-xl border border-gray-300 bg-white py-3 pl-10 pr-4 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-gray-700">
              View deals
            </span>

            <select
              value={dealView}
              onChange={(event) =>
                handleDealViewChange(
                  event.target.value as DealView
                )
              }
              className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="all">
                All Available
              </option>

              <option
                value="saved"
                disabled={!hasSavedOffers}
              >
                My Pass
              </option>
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-gray-700">
              Sort deals
            </span>

            <select
              value={sortOption}
              onChange={(event) =>
                setSortOption(
                  event.target.value as SortOption
                )
              }
              className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="recommended">
                Recommended
              </option>

              <option value="expiring">
                Expiring Soon
              </option>

              <option value="newest">
                Newest
              </option>

              <option value="business">
                Business Name
              </option>
            </select>
          </label>
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <label className="flex items-center gap-2 rounded-xl border border-orange-100 bg-orange-50 px-4 py-3 text-sm font-medium text-orange-800">
            <input
              type="checkbox"
              checked={endingSoonOnly}
              onChange={(event) =>
                setEndingSoonOnly(
                  event.target.checked
                )
              }
              className="h-4 w-4 rounded border-gray-300"
            />

            Ending within {EXPIRING_SOON_DAYS} days
          </label>

          {hasSavedOffers &&
          dealView === 'all' ? (
            <label className="flex items-center gap-2 rounded-xl border border-green-100 bg-green-50 px-4 py-3 text-sm font-medium text-green-800">
              <input
                type="checkbox"
                checked={hideSaved}
                onChange={(event) =>
                  setHideSaved(
                    event.target.checked
                  )
                }
                className="h-4 w-4 rounded border-gray-300"
              />

              Hide deals already saved
            </label>
          ) : null}

          {hasActiveFilters ? (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              Clear Filters
            </button>
          ) : null}
        </div>

        {dealView === 'saved' ? (
          <div className="mt-4 rounded-xl border border-yellow-100 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
            Showing deals saved to My Pass.
          </div>
        ) : endingSoonOnly ? (
          <div className="mt-4 rounded-xl border border-orange-100 bg-orange-50 px-4 py-3 text-sm text-orange-800">
            Showing deals ending within the next{' '}
            {EXPIRING_SOON_DAYS} days.
          </div>
        ) : null}

        <p className="mt-4 text-xs text-gray-500">
          Nearby sorting will become available after
          location access and business distances are
          connected.
        </p>
      </div>

      <div className="mt-6">
        {visibleOffers.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-3">
            {visibleOffers.map((offer) => (
              <article
                key={offer.id}
                className="rounded-2xl border border-yellow-100 bg-white/90 p-6 shadow-xl backdrop-blur"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-yellow-700">
                      {offer.business_name ||
                        'Local Business'}
                    </p>

                    <h3 className="mt-2 text-lg font-semibold text-yellow-600">
                      {offer.title ||
                        'Local Deal'}
                    </h3>
                  </div>

                  <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
                    Active
                  </span>
                </div>

                {offer.discount ? (
                  <p className="mt-1 text-sm font-medium text-gray-500">
                    {offer.discount}
                  </p>
                ) : null}

                {offer.description ? (
                  <p className="mt-2 text-sm leading-6 text-gray-600">
                    {offer.description}
                  </p>
                ) : null}

                <div className="mt-3 space-y-1 text-xs text-gray-500">
                  {offer.phone ? (
                    <p>📞 {offer.phone}</p>
                  ) : null}

                  {offer.address ? (
                    <p>📍 {offer.address}</p>
                  ) : null}

                  {offer.google_maps_url ? (
                    <a
                      href={offer.google_maps_url}
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium text-yellow-700 underline"
                    >
                      View Map
                    </a>
                  ) : null}
                </div>

                <div className="mt-4 space-y-1 text-xs text-gray-500">
                  <p>
                    Starts:{' '}
                    {offer.starts_at
                      ? new Date(
                          offer.starts_at
                        ).toLocaleDateString()
                      : 'Available now'}
                  </p>

                  <p>
                    Ends:{' '}
                    {offer.ends_at
                      ? new Date(
                          offer.ends_at
                        ).toLocaleDateString()
                      : 'No listed end date'}
                  </p>
                </div>

                {savedOfferIdSet.has(
                  offer.id
                ) ? (
                  <div className="mt-4 rounded-lg bg-green-50 px-4 py-2 text-center text-sm font-medium text-green-700">
                    Saved to My Pass
                  </div>
                ) : (
                  <SaveOfferButton
                    offerId={offer.id}
                  />
                )}
              </article>
            ))}
          </div>
        ) : dealView === 'saved' ? (
          <div className="rounded-3xl border border-yellow-100 bg-yellow-50 p-6 text-center shadow-sm">
            <p className="text-sm font-semibold text-yellow-900">
              No saved deals match these filters.
            </p>

            <p className="mt-2 text-sm text-gray-600">
              Clear the filters or switch back to
              All Available to find a deal to save.
            </p>

            <button
              type="button"
              onClick={clearFilters}
              className="mt-4 inline-flex items-center justify-center rounded-xl bg-yellow-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-yellow-700"
            >
              Show All Available
            </button>
          </div>
        ) : hasActiveFilters ? (
          <div className="rounded-3xl border border-blue-100 bg-blue-50 p-6 text-center shadow-sm">
            <p className="text-sm font-semibold text-blue-900">
              No deals match these filters.
            </p>

            <p className="mt-2 text-sm text-gray-600">
              Try another business name or clear
              your current filters.
            </p>

            <button
              type="button"
              onClick={clearFilters}
              className="mt-4 inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="rounded-3xl border border-yellow-100 bg-yellow-50 p-6 text-center shadow-sm">
            <p className="text-sm font-semibold text-yellow-800">
              No active local deals are available
              right now.
            </p>

            <p className="mt-2 text-sm text-gray-600">
              New participating-business offers
              will appear here automatically.
            </p>
          </div>
        )}
      </div>
    </section>
  )
}
'use client'

import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  calculateDistanceMiles,
  formatDistanceMiles,
} from '@/lib/geo/distance'

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
  business_latitude?: number | null
  business_longitude?: number | null
  business_location_source?: string | null
  google_place_id?: string | null
  google_business_name?: string | null
  google_primary_category?: string | null
  google_rating?: number | null
  google_review_count?: number | null
  google_website_url?: string | null
}

type AvailableOffersSectionProps = {
  offers: Offer[]
  savedOfferIds: string[]
}

type DealView = 'all' | 'saved'

type SortOption =
  | 'recommended'
  | 'nearest'
  | 'expiring'
  | 'newest'
  | 'business'

type LocationStatus =
  | 'idle'
  | 'requesting'
  | 'ready'
  | 'denied'
  | 'unavailable'
  | 'timeout'
  | 'unsupported'

type CustomerLocation = {
  latitude: number
  longitude: number
}

// =============================================================================
// Constants
// =============================================================================

const EXPIRING_SOON_DAYS = 14

const ALL_OFFERS_HASH = '#offers-all'
const SAVED_OFFERS_HASH = '#offers-saved'
const EXPIRING_OFFERS_HASH =
  '#offers-expiring'

const LEGACY_AVAILABLE_OFFERS_HASH =
  '#available-offers'

// =============================================================================
// Date and search helpers
// =============================================================================

function getDateValue(
  value: string | null | undefined,
  fallback: number
): number {
  if (!value) {
    return fallback
  }

  const dateValue =
    new Date(value).getTime()

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

function getSearchText(
  offer: Offer
): string {
  return [
    offer.business_name,
    offer.google_business_name,
    offer.google_primary_category,
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
    firstOffer.business_name ||
    'Local Business'

  const secondName =
    secondOffer.business_name ||
    'Local Business'

  return firstName.localeCompare(
    secondName
  )
}

// =============================================================================
// Distance helpers
// =============================================================================

function getOfferDistanceMiles(
  offer: Offer,
  customerLocation: CustomerLocation | null
): number | null {
  if (!customerLocation) {
    return null
  }

  if (
    typeof offer.business_latitude !==
      'number' ||
    typeof offer.business_longitude !==
      'number'
  ) {
    return null
  }

  return calculateDistanceMiles(
    customerLocation,
    {
      latitude:
        offer.business_latitude,
      longitude:
        offer.business_longitude,
    }
  )
}

function compareOfferDistances(
  firstOffer: Offer,
  secondOffer: Offer,
  customerLocation: CustomerLocation
): number {
  const firstDistance =
    getOfferDistanceMiles(
      firstOffer,
      customerLocation
    )

  const secondDistance =
    getOfferDistanceMiles(
      secondOffer,
      customerLocation
    )

  if (
    firstDistance === null &&
    secondDistance === null
  ) {
    return compareBusinessNames(
      firstOffer,
      secondOffer
    )
  }

  if (firstDistance === null) {
    return 1
  }

  if (secondDistance === null) {
    return -1
  }

  const distanceDifference =
    firstDistance - secondDistance

  if (distanceDifference !== 0) {
    return distanceDifference
  }

  return compareBusinessNames(
    firstOffer,
    secondOffer
  )
}

// =============================================================================
// Location helpers
// =============================================================================

function getLocationErrorStatus(
  error: GeolocationPositionError
): LocationStatus {
  if (
    error.code ===
    GeolocationPositionError.PERMISSION_DENIED
  ) {
    return 'denied'
  }

  if (
    error.code ===
    GeolocationPositionError.POSITION_UNAVAILABLE
  ) {
    return 'unavailable'
  }

  if (
    error.code ===
    GeolocationPositionError.TIMEOUT
  ) {
    return 'timeout'
  }

  return 'unavailable'
}

function getLocationMessage(
  status: LocationStatus,
  locatedBusinessCount: number
): string {
  if (status === 'requesting') {
    return 'Waiting for your browser to share your location.'
  }

  if (status === 'ready') {
    if (locatedBusinessCount === 0) {
      return 'Your location is ready, but participating businesses have not added coordinates yet.'
    }

    return `Showing the closest deals first. ${locatedBusinessCount} ${
      locatedBusinessCount === 1
        ? 'deal has'
        : 'deals have'
    } a confirmed business location.`
  }

  if (status === 'denied') {
    return 'Location access was denied. You can allow it in your browser settings or continue browsing all offers.'
  }

  if (status === 'unavailable') {
    return 'Your current location could not be determined. Check your device location settings and try again.'
  }

  if (status === 'timeout') {
    return 'The location request took too long. Try again when your device has a stronger location signal.'
  }

  if (status === 'unsupported') {
    return 'This browser does not support location access. You can still search and sort all available offers.'
  }

  return 'Use your current location to find the closest participating businesses.'
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

  const [
    endingSoonOnly,
    setEndingSoonOnly,
  ] = useState(false)

  const [sortOption, setSortOption] =
    useState<SortOption>('recommended')

  const [
    locationStatus,
    setLocationStatus,
  ] = useState<LocationStatus>('idle')

  const [
    customerLocation,
    setCustomerLocation,
  ] = useState<CustomerLocation | null>(
    null
  )

  const savedOfferIdSet = useMemo(
    () => new Set(savedOfferIds),
    [savedOfferIds]
  )

  const locatedBusinessCount =
    useMemo(
      () =>
        offers.filter(
          (offer) =>
            typeof offer.business_latitude ===
              'number' &&
            typeof offer.business_longitude ===
              'number'
        ).length,
      [offers]
    )

  // ===========================================================================
  // Presets
  // ===========================================================================

  function resetToAllDeals() {
    setSearchQuery('')
    setDealView('all')
    setHideSaved(false)
    setEndingSoonOnly(false)

    setSortOption(
      customerLocation
        ? 'nearest'
        : 'recommended'
    )
  }

  function applyHashPreset(
    hash: string
  ) {
    if (hash === SAVED_OFFERS_HASH) {
      setSearchQuery('')
      setDealView('saved')
      setHideSaved(false)
      setEndingSoonOnly(false)

      setSortOption(
        customerLocation
          ? 'nearest'
          : 'recommended'
      )

      return
    }

    if (
      hash === EXPIRING_OFFERS_HASH
    ) {
      setSearchQuery('')
      setDealView('all')
      setHideSaved(false)
      setEndingSoonOnly(true)
      setSortOption('expiring')
      return
    }

    if (
      hash === ALL_OFFERS_HASH ||
      hash ===
        LEGACY_AVAILABLE_OFFERS_HASH
    ) {
      resetToAllDeals()
    }
  }

  useEffect(() => {
    function handleHashChange() {
      applyHashPreset(
        window.location.hash
      )
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

  // ===========================================================================
  // Filtering and sorting
  // ===========================================================================

  const visibleOffers = useMemo(() => {
    const normalizedSearchQuery =
      searchQuery.trim().toLowerCase()

    const now = Date.now()

    const matchingOffers =
      offers.filter((offer) => {
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
      })

    return [...matchingOffers].sort(
      (firstOffer, secondOffer) => {
        if (
          sortOption === 'nearest' &&
          customerLocation
        ) {
          return compareOfferDistances(
            firstOffer,
            secondOffer,
            customerLocation
          )
        }

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

          if (
            expirationDifference !== 0
          ) {
            return expirationDifference
          }

          return compareBusinessNames(
            firstOffer,
            secondOffer
          )
        }

        const firstIsSaved =
          savedOfferIdSet.has(
            firstOffer.id
          )

        const secondIsSaved =
          savedOfferIdSet.has(
            secondOffer.id
          )

        if (
          firstIsSaved !== secondIsSaved
        ) {
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

        if (
          expirationDifference !== 0
        ) {
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
    customerLocation,
  ])

  const hasSavedOffers =
    savedOfferIds.length > 0

  const hasActiveFilters =
    searchQuery.trim().length > 0 ||
    dealView !== 'all' ||
    hideSaved ||
    endingSoonOnly ||
    sortOption !==
      (customerLocation
        ? 'nearest'
        : 'recommended')

  const locationMessage =
    getLocationMessage(
      locationStatus,
      locatedBusinessCount
    )

  const isRequestingLocation =
    locationStatus === 'requesting'

  const hasLocation =
    locationStatus === 'ready' &&
    customerLocation !== null

  // ===========================================================================
  // Browser actions
  // ===========================================================================

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

  function requestCustomerLocation() {
    if (!navigator.geolocation) {
      setCustomerLocation(null)
      setLocationStatus('unsupported')

      if (sortOption === 'nearest') {
        setSortOption('recommended')
      }

      return
    }

    setLocationStatus('requesting')

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCustomerLocation({
          latitude:
            position.coords.latitude,
          longitude:
            position.coords.longitude,
        })

        setLocationStatus('ready')
        setSortOption('nearest')
      },
      (error) => {
        setCustomerLocation(null)
        setLocationStatus(
          getLocationErrorStatus(error)
        )

        if (
          sortOption === 'nearest'
        ) {
          setSortOption('recommended')
        }
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge:
          5 * 60 * 1000,
      }
    )
  }

  // ===========================================================================
  // Render
  // ===========================================================================

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
              Search for a favorite
              business or narrow the list
              to the deals you need.
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

        <div className="mt-5 rounded-2xl border border-green-100 bg-green-50 p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-3">
              <span
                aria-hidden="true"
                className="text-2xl"
              >
                📍
              </span>

              <div>
                <p className="text-sm font-bold text-green-900">
                  Nearby Offers
                </p>

                <p
                  className="mt-1 text-sm text-green-800"
                  aria-live="polite"
                >
                  {locationMessage}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={
                requestCustomerLocation
              }
              disabled={
                isRequestingLocation
              }
              className="inline-flex shrink-0 items-center justify-center rounded-xl bg-green-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-green-800 disabled:cursor-not-allowed disabled:bg-green-400"
            >
              {isRequestingLocation
                ? 'Finding Location…'
                : hasLocation
                  ? 'Refresh Location'
                  : 'Use My Location'}
            </button>
          </div>

          {hasLocation ? (
            <p className="mt-3 text-xs text-green-700">
              Distances are approximate
              straight-line measurements.
              Your precise coordinates
              remain in this browser
              session and are not saved
              by this page.
            </p>
          ) : null}
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_190px_220px]">
          <label className="block">
            <span className="text-sm font-semibold text-gray-700">
              Search businesses or
              offers
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
                  event.target
                    .value as DealView
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
                  event.target
                    .value as SortOption
                )
              }
              className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="recommended">
                Recommended
              </option>

              <option
                value="nearest"
                disabled={!hasLocation}
              >
                Nearest First
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

            Ending within{' '}
            {EXPIRING_SOON_DAYS} days
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
            Showing deals saved to My
            Pass.
          </div>
        ) : endingSoonOnly ? (
          <div className="mt-4 rounded-xl border border-orange-100 bg-orange-50 px-4 py-3 text-sm text-orange-800">
            Showing deals ending within
            the next{' '}
            {EXPIRING_SOON_DAYS} days.
          </div>
        ) : sortOption === 'nearest' &&
          hasLocation ? (
          <div className="mt-4 rounded-xl border border-green-100 bg-green-50 px-4 py-3 text-sm text-green-800">
            Showing businesses with
            confirmed locations nearest
            to you first.
          </div>
        ) : null}
      </div>

      <div className="mt-6">
        {visibleOffers.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-3">
            {visibleOffers.map(
              (offer) => {
                const distanceMiles =
                  getOfferDistanceMiles(
                    offer,
                    customerLocation
                  )

                const distanceLabel =
                  formatDistanceMiles(
                    distanceMiles
                  )

                return (
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

                    {distanceLabel ? (
                      <div className="mt-3 inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                        📍 {distanceLabel}{' '}
                        away
                      </div>
                    ) : hasLocation ? (
                      <p className="mt-3 text-xs text-gray-400">
                        Distance not
                        available
                      </p>
                    ) : null}

                    {offer.discount ? (
                      <p className="mt-2 text-sm font-medium text-gray-500">
                        {offer.discount}
                      </p>
                    ) : null}

                    {offer.description ? (
                      <p className="mt-2 text-sm leading-6 text-gray-600">
                        {
                          offer.description
                        }
                      </p>
                    ) : null}

                    <div className="mt-3 space-y-1 text-xs text-gray-500">
                      {offer.phone ? (
                        <p>
                          📞 {offer.phone}
                        </p>
                      ) : null}

                      {offer.address ? (
                        <p>
                          📍 {offer.address}
                        </p>
                      ) : null}

                      {offer.google_maps_url ? (
                        <a
                          href={
                            offer.google_maps_url
                          }
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
                )
              }
            )}
          </div>
        ) : dealView === 'saved' ? (
          <div className="rounded-3xl border border-yellow-100 bg-yellow-50 p-6 text-center shadow-sm">
            <p className="text-sm font-semibold text-yellow-900">
              No saved deals match these
              filters.
            </p>

            <p className="mt-2 text-sm text-gray-600">
              Clear the filters or switch
              back to All Available to
              find a deal to save.
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
              No deals match these
              filters.
            </p>

            <p className="mt-2 text-sm text-gray-600">
              Try another business name
              or clear your current
              filters.
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
              No active local deals are
              available right now.
            </p>

            <p className="mt-2 text-sm text-gray-600">
              New participating-business
              offers will appear here
              automatically.
            </p>
          </div>
        )}
      </div>
    </section>
  )
}
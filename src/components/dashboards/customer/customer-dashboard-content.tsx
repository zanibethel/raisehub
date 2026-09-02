'use client'

import { useState } from 'react'

import {
  CUSTOMER_DEAL_FILTER_OPTIONS,
  DEFAULT_CUSTOMER_DEAL_FILTER,
  filterCustomerDeals,
  getCustomerDealFilterCounts,
  type CustomerDealFilter,
} from './customer-deal-filters'
import CustomerAvailableDealsSection from './sections/customer-available-deals-section'

import type { CustomerRedemptionEvent } from './customer-redemption-history'
import type {
  CustomerDashboardOffer,
  OrganizationLookup,
  PurchasedPass,
} from '@/types/customer-dashboard'

type Props = {
  purchasedPasses: PurchasedPass[]
  organizationById: Map<string, OrganizationLookup>
  enrichedOffers: CustomerDashboardOffer[]
  historicalOffers?: CustomerDashboardOffer[]
  savedOfferIds: Set<string>
  redeemedOfferIds: Set<string>
  redemptionEvents: CustomerRedemptionEvent[]
  confirmedRedemptionEvents: CustomerRedemptionEvent[]
  redeemableOfferIds: Set<string>
  redemptionDateByOfferId: Map<string, string>
  hasPurchasedPass: boolean
}

function matchesDealSearch(
  offer: CustomerDashboardOffer,
  query: string,
  hasPurchasedPass: boolean
) {
  const normalizedQuery = query.trim().toLowerCase()
  if (!normalizedQuery) return true

  const publicFields = [
    offer.business_name,
    offer.address,
    offer.google_primary_category,
    offer.google_business_name,
    typeof offer.customer_value === 'number' ? String(offer.customer_value) : '',
  ]

  const memberFields = hasPurchasedPass
    ? [offer.title, offer.discount, offer.description, offer.usage_rule]
    : []

  return [...publicFields, ...memberFields].some((value) =>
    String(value ?? '').toLowerCase().includes(normalizedQuery)
  )
}

export default function CustomerDashboardContent(props: Props) {
  const [activeDealFilter, setActiveDealFilter] = useState<CustomerDealFilter>(
    DEFAULT_CUSTOMER_DEAL_FILTER
  )
  const [searchQuery, setSearchQuery] = useState('')

  const currentlyAvailableOffers = props.enrichedOffers.filter((offer) =>
    props.redeemableOfferIds.has(offer.id)
  )

  const filterCounts = getCustomerDealFilterCounts({
    offers: currentlyAvailableOffers,
    savedOfferIds: props.savedOfferIds,
  })

  const filteredByCategory = filterCustomerDeals({
    offers: currentlyAvailableOffers,
    filter: activeDealFilter,
    savedOfferIds: props.savedOfferIds,
  })

  const filteredOffers = filteredByCategory.filter((offer) =>
    matchesDealSearch(offer, searchQuery, props.hasPurchasedPass)
  )

  const hasActiveSearch = searchQuery.trim().length > 0
  const hasActiveFilter = activeDealFilter !== 'all'

  function clearSearchAndFilters() {
    setSearchQuery('')
    setActiveDealFilter('all')
  }

  return (
    <div className="mt-5 space-y-5 sm:mt-6 sm:space-y-6">
      <section
        id="available-offers"
        aria-labelledby="explore-offers-heading"
        className="scroll-mt-24"
      >
        <div className="rounded-3xl border border-blue-100 bg-white p-4 shadow-sm sm:p-6">
          <div className="flex min-w-0 items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-700">
                Explore offers
              </p>
              <h1
                id="explore-offers-heading"
                className="mt-1 text-xl font-black leading-tight text-slate-950 sm:text-2xl"
              >
                Find a local deal
              </h1>
            </div>
            <span className="shrink-0 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
              {filteredOffers.length} {filteredOffers.length === 1 ? 'deal' : 'deals'}
            </span>
          </div>

          <label htmlFor="deal-search" className="sr-only">
            Search local offers
          </label>
          <div className="relative mt-4">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-400"
            >
              ⌕
            </span>
            <input
              id="deal-search"
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search business, deal, category, or location"
              autoComplete="off"
              className="min-h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-base text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
            />
          </div>

          <div className="mt-3 flex gap-2 overflow-x-auto pb-1" aria-label="Deal filters">
            {CUSTOMER_DEAL_FILTER_OPTIONS.map((option) => {
              const count = filterCounts[option.id]
              const isActive = option.id === activeDealFilter

              return (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => setActiveDealFilter(option.id)}
                  className={`inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-bold transition sm:text-sm ${
                    isActive
                      ? 'border-blue-700 bg-blue-700 text-white'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:bg-blue-50'
                  }`}
                >
                  <span aria-hidden="true">{option.icon}</span>
                  <span>{option.label}</span>
                  <span className={isActive ? 'text-blue-100' : 'text-slate-400'}>{count}</span>
                </button>
              )
            })}
          </div>
        </div>
      </section>

      {filteredOffers.length > 0 ? (
        <CustomerAvailableDealsSection
          hasPurchasedPass={props.hasPurchasedPass}
          enrichedOffers={filteredOffers}
          savedOfferIds={props.savedOfferIds}
        />
      ) : (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 text-center shadow-sm sm:p-8">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
            No matching deals
          </p>
          <h2 className="mt-2 text-xl font-black text-slate-950">
            Try a broader search
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">
            Change your search words or filters to see more participating local offers.
          </p>
          {hasActiveSearch || hasActiveFilter ? (
            <button
              type="button"
              onClick={clearSearchAndFilters}
              className="mt-4 inline-flex min-h-11 items-center justify-center rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-bold text-white"
            >
              Show all available offers
            </button>
          ) : null}
        </section>
      )}
    </div>
  )
}

'use client'

import Link from 'next/link'
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
    <div className="mt-5 space-y-6 sm:mt-6 sm:space-y-8">
      <section
        id="available-offers"
        aria-labelledby="explore-offers-heading"
        className="scroll-mt-24"
      >
        <div
          className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 ${
            props.hasPurchasedPass
              ? 'border-green-200 bg-green-50'
              : 'border-amber-200 bg-amber-50'
          }`}
        >
          <div className="min-w-0">
            <p
              className={`text-xs font-black uppercase tracking-[0.14em] ${
                props.hasPurchasedPass ? 'text-green-700' : 'text-amber-700'
              }`}
            >
              {props.hasPurchasedPass ? 'Pass active' : 'Pass preview'}
            </p>
            <p className="mt-0.5 text-sm font-bold leading-5 text-slate-800">
              {props.hasPurchasedPass
                ? 'Your RaiseHub Pass unlocks full local deal details.'
                : 'Browse participating businesses now, then support a fundraiser to unlock the offers.'}
            </p>
          </div>

          {!props.hasPurchasedPass ? (
            <Link
              href="/campaigns"
              className="shrink-0 rounded-xl bg-green-700 px-3 py-2 text-xs font-black text-white transition hover:bg-green-800"
            >
              Find fundraiser
            </Link>
          ) : (
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-100 text-lg text-green-700" aria-hidden="true">
              ✓
            </span>
          )}
        </div>

        <div className="mt-6 flex min-w-0 items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-700">
              Explore offers
            </p>
            <h1
              id="explore-offers-heading"
              className="mt-1 text-3xl font-black tracking-tight text-slate-950"
            >
              Local Deals
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
              Search participating businesses and find offers available through RaiseHub.
            </p>
          </div>

          <span className="shrink-0 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-black text-blue-700">
            {filteredOffers.length} {filteredOffers.length === 1 ? 'deal' : 'deals'}
          </span>
        </div>

        <label htmlFor="deal-search" className="sr-only">
          Search local offers
        </label>
        <div className="relative mt-5">
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
            placeholder="Search businesses, deals, categories, or location"
            autoComplete="off"
            className="min-h-12 w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-base text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
          />
        </div>

        <div
          className="-mr-3 mt-3 flex gap-2 overflow-x-auto pr-3 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mr-0 sm:pr-0"
          aria-label="Deal filters"
        >
          {CUSTOMER_DEAL_FILTER_OPTIONS.map((option) => {
            const count = filterCounts[option.id]
            const isActive = option.id === activeDealFilter

            return (
              <button
                key={option.id}
                type="button"
                aria-pressed={isActive}
                onClick={() => setActiveDealFilter(option.id)}
                className={`inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-black transition sm:text-sm ${
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
      </section>

      {filteredOffers.length > 0 ? (
        <CustomerAvailableDealsSection
          hasPurchasedPass={props.hasPurchasedPass}
          enrichedOffers={filteredOffers}
          savedOfferIds={props.savedOfferIds}
        />
      ) : (
        <section className="border-t border-slate-200 py-8 text-center sm:py-10">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
            No matching deals
          </p>
          <h2 className="mt-2 text-xl font-black text-slate-950">
            {currentlyAvailableOffers.length === 0
              ? 'New local deals are coming'
              : 'Try a broader search'}
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">
            {currentlyAvailableOffers.length === 0
              ? 'Participating businesses do not have any currently redeemable offers for this pass yet.'
              : 'Change your search words or filters to see more participating local offers.'}
          </p>

          {hasActiveSearch || hasActiveFilter ? (
            <button
              type="button"
              onClick={clearSearchAndFilters}
              className="mt-4 inline-flex min-h-11 items-center justify-center rounded-xl border border-blue-200 bg-blue-50 px-5 py-2.5 text-sm font-black text-blue-700 transition hover:bg-blue-100"
            >
              Show all available offers
            </button>
          ) : null}
        </section>
      )}
    </div>
  )
}

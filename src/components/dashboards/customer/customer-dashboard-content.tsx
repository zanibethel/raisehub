'use client'

import { useState } from 'react'

import {
  CUSTOMER_DEAL_FILTER_OPTIONS,
  DEFAULT_CUSTOMER_DEAL_FILTER,
  filterCustomerDeals,
  getCustomerDealEmptyMessage,
  getCustomerDealFilterCounts,
  getCustomerDealFilterLabel,
  type CustomerDealFilter,
} from './customer-deal-filters'
import CustomerAvailableDealsSection from './sections/customer-available-deals-section'
import CustomerPassesSection from './sections/customer-passes-section'
import CustomerRedemptionHistorySection from './sections/customer-redemption-history-section'
import CustomerSavedDealsSection from './sections/customer-saved-deals-section'

// =============================================================================
// Infer section prop types
// =============================================================================

type PassesProps = React.ComponentProps<
  typeof CustomerPassesSection
>

type SavedDealsProps = React.ComponentProps<
  typeof CustomerSavedDealsSection
>

type AvailableDealsProps = React.ComponentProps<
  typeof CustomerAvailableDealsSection
>

// =============================================================================
// Component props
// =============================================================================

type Props = {
  purchasedPasses:
    PassesProps['purchasedPasses']
  organizationById:
    PassesProps['organizationById']

  enrichedOffers:
    AvailableDealsProps['enrichedOffers']

  savedOfferIds:
    SavedDealsProps['savedOfferIds']
  redeemedOfferIds:
    SavedDealsProps['redeemedOfferIds']
  redemptionDateByOfferId:
    SavedDealsProps['redemptionDateByOfferId']

  hasPurchasedPass:
    AvailableDealsProps['hasPurchasedPass']
}

// =============================================================================
// Display helpers
// =============================================================================

function getFilterCardClasses({
  filter,
  isActive,
}: {
  filter: CustomerDealFilter
  isActive: boolean
}): string {
  const activeClasses =
    isActive
      ? 'ring-2 ring-offset-2 shadow-md -translate-y-0.5'
      : 'hover:-translate-y-0.5 hover:shadow-md'

  switch (filter) {
    case 'nearby':
      return `border-green-100 bg-green-50 hover:border-green-200 ${
        isActive
          ? 'ring-green-500'
          : ''
      } ${activeClasses}`

    case 'saved':
      return `border-yellow-100 bg-yellow-50 hover:border-yellow-200 ${
        isActive
          ? 'ring-yellow-500'
          : ''
      } ${activeClasses}`

    case 'expiring':
      return `border-orange-100 bg-orange-50 hover:border-orange-200 ${
        isActive
          ? 'ring-orange-500'
          : ''
      } ${activeClasses}`

    case 'all':
      return `border-blue-100 bg-blue-50 hover:border-blue-200 ${
        isActive
          ? 'ring-blue-500'
          : ''
      } ${activeClasses}`
  }
}

function getFilterCountClasses(
  filter: CustomerDealFilter
): string {
  switch (filter) {
    case 'nearby':
      return 'text-green-700'

    case 'saved':
      return 'text-yellow-700'

    case 'expiring':
      return 'text-orange-700'

    case 'all':
      return 'text-blue-700'
  }
}

function getFilterHeadingClasses(
  filter: CustomerDealFilter
): string {
  switch (filter) {
    case 'nearby':
      return 'group-hover:text-green-700'

    case 'saved':
      return 'group-hover:text-yellow-700'

    case 'expiring':
      return 'group-hover:text-orange-700'

    case 'all':
      return 'group-hover:text-blue-700'
  }
}

// =============================================================================
// Component
// =============================================================================

export default function CustomerDashboardContent({
  purchasedPasses,
  organizationById,
  enrichedOffers,
  savedOfferIds,
  redeemedOfferIds,
  redemptionDateByOfferId,
  hasPurchasedPass,
}: Props) {
  const [
    activeDealFilter,
    setActiveDealFilter,
  ] = useState<CustomerDealFilter>(
    DEFAULT_CUSTOMER_DEAL_FILTER
  )

  const filterCounts =
    getCustomerDealFilterCounts({
      offers: enrichedOffers,
      savedOfferIds,
    })

  const filteredOffers =
    filterCustomerDeals({
      offers: enrichedOffers,
      filter: activeDealFilter,
      savedOfferIds,
    })

  const activeFilterLabel =
    getCustomerDealFilterLabel(
      activeDealFilter
    )

  const emptyFilterMessage =
    getCustomerDealEmptyMessage(
      activeDealFilter
    )

  function selectDealFilter(
    filter: CustomerDealFilter
  ) {
    setActiveDealFilter(filter)

    window.requestAnimationFrame(() => {
      document
        .getElementById(
          'available-offers'
        )
        ?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        })
    })
  }

  return (
    <div className="mt-8 space-y-8">
      <section
        aria-labelledby="customer-deal-shortcuts-heading"
        className="rounded-3xl border border-blue-100 bg-white/90 p-5 shadow-xl backdrop-blur sm:p-6"
      >
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
            Quick Access
          </p>

          <h2
            id="customer-deal-shortcuts-heading"
            className="mt-2 text-2xl font-bold text-gray-900"
          >
            Find the deals you need
          </h2>

          <p className="mt-2 text-sm text-gray-600">
            Choose a filter to update the
            available deal list below.
          </p>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {CUSTOMER_DEAL_FILTER_OPTIONS.map(
            (option) => {
              const isActive =
                activeDealFilter ===
                option.id

              return (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() =>
                    selectDealFilter(
                      option.id
                    )
                  }
                  className={`group rounded-2xl border p-5 text-left transition ${getFilterCardClasses(
                    {
                      filter:
                        option.id,
                      isActive,
                    }
                  )}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span
                      aria-hidden="true"
                      className="text-2xl"
                    >
                      {option.icon}
                    </span>

                    <span
                      className={`rounded-full bg-white px-2 py-1 text-xs font-semibold ${getFilterCountClasses(
                        option.id
                      )}`}
                    >
                      {
                        filterCounts[
                          option.id
                        ]
                      }
                    </span>
                  </div>

                  <h3
                    className={`mt-4 font-semibold text-gray-900 ${getFilterHeadingClasses(
                      option.id
                    )}`}
                  >
                    {option.label}
                  </h3>

                  <p className="mt-1 text-sm text-gray-600">
                    {option.description}
                  </p>

                  {isActive ? (
                    <p className="mt-3 text-xs font-semibold text-gray-700">
                      Showing now
                    </p>
                  ) : null}
                </button>
              )
            }
          )}
        </div>
      </section>

      <div
        id="my-pass"
        className="scroll-mt-6"
      >
        <CustomerSavedDealsSection
          enrichedOffers={
            enrichedOffers
          }
          savedOfferIds={
            savedOfferIds
          }
          redeemedOfferIds={
            redeemedOfferIds
          }
          redemptionDateByOfferId={
            redemptionDateByOfferId
          }
        />
      </div>

      <div
        id="available-offers"
        className="scroll-mt-6"
      >
        <div className="mb-4 flex flex-col gap-2 rounded-2xl border border-blue-100 bg-blue-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
              Current Filter
            </p>

            <p className="mt-1 font-semibold text-gray-900">
              {activeFilterLabel}
            </p>
          </div>

          <p className="text-sm text-gray-600">
            {filteredOffers.length}{' '}
            {filteredOffers.length === 1
              ? 'deal matches'
              : 'deals match'}
          </p>
        </div>

        {filteredOffers.length > 0 ? (
          <CustomerAvailableDealsSection
            hasPurchasedPass={
              hasPurchasedPass
            }
            enrichedOffers={
              filteredOffers
            }
            savedOfferIds={
              savedOfferIds
            }
          />
        ) : (
          <section className="rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-green-50 p-6 shadow-lg sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
              No Matching Deals
            </p>

            <h2 className="mt-2 text-xl font-bold text-gray-900">
              {
                emptyFilterMessage.title
              }
            </h2>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-600">
              {
                emptyFilterMessage.description
              }
            </p>

            {activeDealFilter !==
            'all' ? (
              <button
                type="button"
                onClick={() =>
                  selectDealFilter('all')
                }
                className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800"
              >
                Show All Available Offers
              </button>
            ) : null}
          </section>
        )}
      </div>

      <div
        id="redemption-history"
        className="scroll-mt-6"
      >
        <CustomerRedemptionHistorySection
          enrichedOffers={
            enrichedOffers
          }
          redemptionDateByOfferId={
            redemptionDateByOfferId
          }
        />
      </div>

      <div
        id="support-history"
        className="scroll-mt-6"
      >
        <CustomerPassesSection
          purchasedPasses={
            purchasedPasses
          }
          organizationById={
            organizationById
          }
        />
      </div>
    </div>
  )
}
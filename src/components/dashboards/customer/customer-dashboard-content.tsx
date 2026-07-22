'use client'

import { useState } from 'react'

import {
  getCustomerDealFilterMatchLabel,
  getCustomerDealShortcutAriaLabel,
  getCustomerDealShortcutCardClasses,
  getCustomerDealShortcutCountClasses,
  getCustomerDealShortcutHeadingClasses,
  getCustomerDealShortcutStatus,
  getCustomerDealShortcutStatusClasses,
} from './customer-deal-shortcuts'
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
import CustomerNearbyBusinessesSection from './sections/customer-nearby-businesses-section'
import CustomerNextStepSection from './sections/customer-next-step-section'
import CustomerNotificationCenter from './sections/customer-notification-center'
import CustomerPassesSection from './sections/customer-passes-section'
import CustomerRecommendationsSection from './sections/customer-recommendations-section'
import CustomerRedemptionHistorySection from './sections/customer-redemption-history-section'
import CustomerSavedDealsSection from './sections/customer-saved-deals-section'
import CustomerSavingsSection from './sections/customer-savings-section'

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
  historicalOffers?:
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
// Component
// =============================================================================

export default function CustomerDashboardContent({
  purchasedPasses,
  organizationById,
  enrichedOffers,
  historicalOffers = [],
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

  const customerHistoryOffers = [
    ...new Map(
      [
        ...enrichedOffers,
        ...historicalOffers,
      ].map((offer) => [
        offer.id,
        offer,
      ])
    ).values(),
  ]

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

  const filteredOfferMatchLabel =
    getCustomerDealFilterMatchLabel(
      filteredOffers.length
    )

  const emptyFilterMessage =
    getCustomerDealEmptyMessage(
      activeDealFilter
    )

  const readyToUseDealCount = [
    ...savedOfferIds,
  ].filter(
    (offerId) =>
      !redeemedOfferIds.has(offerId)
  ).length

  function selectDealFilter(
    filter: CustomerDealFilter
  ) {
    if (filterCounts[filter] === 0) {
      return
    }

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
      <div
        id="customer-updates"
        className="scroll-mt-6"
      >
        <CustomerNotificationCenter
          hasActivePass={
            hasPurchasedPass
          }
          enrichedOffers={
            enrichedOffers
          }
          savedOfferIds={
            savedOfferIds
          }
          redeemedOfferIds={
            redeemedOfferIds
          }
        />
      </div>

      <CustomerNextStepSection
        hasActivePass={hasPurchasedPass}
        availableOfferCount={
          enrichedOffers.length
        }
        savedDealCount={
          savedOfferIds.size
        }
        readyToUseDealCount={
          readyToUseDealCount
        }
        purchaseCount={
          purchasedPasses.length
        }
      />

      <section
        aria-labelledby="customer-deal-shortcuts-heading"
        className="overflow-hidden rounded-3xl border border-blue-100 bg-white/90 p-4 shadow-xl backdrop-blur sm:p-6"
      >
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
            Quick Access
          </p>

          <h2
            id="customer-deal-shortcuts-heading"
            className="mt-2 break-words text-2xl font-bold leading-tight text-gray-900"
          >
            Find the deals you need
          </h2>

          <p className="mt-2 text-sm leading-6 text-gray-600">
            Choose an available filter to
            update the deal list below.
          </p>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {CUSTOMER_DEAL_FILTER_OPTIONS.map(
            (option) => {
              const count =
                filterCounts[option.id]

              const isActive =
                activeDealFilter ===
                option.id

              const isDisabled =
                count === 0

              const shortcutStatus =
                getCustomerDealShortcutStatus({
                  isActive,
                  isDisabled,
                })

              return (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={isActive}
                  aria-label={getCustomerDealShortcutAriaLabel(
                    {
                      label:
                        option.label,
                      count,
                    }
                  )}
                  disabled={isDisabled}
                  onClick={() =>
                    selectDealFilter(
                      option.id
                    )
                  }
                  className={`group min-h-32 min-w-0 rounded-2xl border p-4 text-left transition sm:min-h-36 sm:p-5 ${getCustomerDealShortcutCardClasses(
                    {
                      filter:
                        option.id,
                      isActive,
                      isDisabled,
                    }
                  )}`}
                >
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <span
                      aria-hidden="true"
                      className="shrink-0 text-xl sm:text-2xl"
                    >
                      {option.icon}
                    </span>

                    <span
                      className={`shrink-0 rounded-full bg-white px-2 py-1 text-xs font-semibold ${getCustomerDealShortcutCountClasses(
                        option.id
                      )}`}
                    >
                      {count}
                    </span>
                  </div>

                  <h3
                    className={`mt-3 break-words text-sm font-semibold leading-snug text-gray-900 sm:mt-4 sm:text-base ${getCustomerDealShortcutHeadingClasses(
                      {
                        filter:
                          option.id,
                        isDisabled,
                      }
                    )}`}
                  >
                    {option.label}
                  </h3>

                  <p className="mt-1 hidden break-words text-sm leading-6 text-gray-600 sm:block">
                    {option.description}
                  </p>

                  <p
                    className={`mt-3 text-xs font-semibold ${getCustomerDealShortcutStatusClasses(
                      {
                        isActive,
                        isDisabled,
                      }
                    )}`}
                  >
                    {shortcutStatus}
                  </p>
                </button>
              )
            }
          )}
        </div>
      </section>

      <div
        id="nearby-businesses"
        className="scroll-mt-6"
      >
        <CustomerNearbyBusinessesSection
          enrichedOffers={
            enrichedOffers
          }
          hasActivePass={
            hasPurchasedPass
          }
        />
      </div>

      <div
        id="recommended-deals"
        className="scroll-mt-6"
      >
        <CustomerRecommendationsSection
          enrichedOffers={
            enrichedOffers
          }
          savedOfferIds={
            savedOfferIds
          }
          redeemedOfferIds={
            redeemedOfferIds
          }
        />
      </div>

      <div
        id="my-pass"
        className="scroll-mt-6"
      >
        <CustomerSavedDealsSection
          enrichedOffers={
            customerHistoryOffers
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
        id="customer-savings"
        className="scroll-mt-6"
      >
        <CustomerSavingsSection
          enrichedOffers={
            customerHistoryOffers
          }
          redeemedOfferIds={
            redeemedOfferIds
          }
        />
      </div>

      <div
        id="available-offers"
        className="scroll-mt-6"
      >
        <div
          role="status"
          aria-live="polite"
          className="mb-4 flex min-w-0 flex-col gap-2 rounded-2xl border border-blue-100 bg-blue-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
              Current Filter
            </p>

            <p className="mt-1 break-words font-semibold text-gray-900">
              {activeFilterLabel}
            </p>
          </div>

          <p className="shrink-0 text-sm text-gray-600">
            {filteredOfferMatchLabel}
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
          <section className="overflow-hidden rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-green-50 p-5 shadow-lg sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
              No Matching Deals
            </p>

            <h2 className="mt-2 break-words text-xl font-bold leading-snug text-gray-900">
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
                className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-blue-700 px-5 py-3 text-center text-sm font-semibold text-white transition hover:bg-blue-800 sm:w-auto"
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
            customerHistoryOffers
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

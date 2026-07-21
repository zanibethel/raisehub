'use client'

import Link from 'next/link'
import {
  useRouter,
} from 'next/navigation'
import {
  useState,
} from 'react'

import UseOfferButton from '@/app/components/use-offer-button'
import {
  removeSavedOfferAction,
} from '@/app/offers/actions'
import {
  getCustomerSavedDealCountLabel,
  getCustomerSavedDealGuidance,
  getCustomerUnusedSavedDealCountLabel,
} from '../customer-saved-deal-guidance'
import {
  formatCustomerSavedDealEndDate,
  formatCustomerSavedDealRedemptionDate,
  getCustomerSavedDealAddress,
  getCustomerSavedDealBenefitLabel,
  getCustomerSavedDealBusinessName,
  getCustomerSavedDealDescription,
  getCustomerSavedDealMapUrl,
  getCustomerSavedDealPhone,
  getCustomerSavedDeals,
  getCustomerSavedDealTitle,
} from '../customer-saved-deals'

import type {
  CustomerDashboardOffer,
} from '@/types/customer-dashboard'

// =============================================================================
// Types
// =============================================================================

type Props = {
  enrichedOffers:
    CustomerDashboardOffer[]
  savedOfferIds: Set<string>
  redeemedOfferIds: Set<string>
  redemptionDateByOfferId: Map<
    string,
    string
  >
}

type RemoveSavedOfferButtonProps = {
  offerId: string
  offerTitle: string
}

// =============================================================================
// Remove saved offer button
// =============================================================================

function RemoveSavedOfferButton({
  offerId,
  offerTitle,
}: RemoveSavedOfferButtonProps) {
  const router = useRouter()

  const [isRemoving, setIsRemoving] =
    useState(false)

  const [message, setMessage] =
    useState('')

  async function handleRemove() {
    const confirmed =
      window.confirm(
        `Remove “${offerTitle}” from My Pass?`
      )

    if (!confirmed) {
      return
    }

    setIsRemoving(true)
    setMessage('')

    const result =
      await removeSavedOfferAction(
        offerId
      )

    if (
      result.status === 'error'
    ) {
      setMessage(result.message)
      setIsRemoving(false)
      return
    }

    if (
      result.status === 'not-saved'
    ) {
      setMessage(
        'This offer is no longer saved.'
      )
      setIsRemoving(false)
      router.refresh()
      return
    }

    setMessage(
      'Removed from My Pass.'
    )

    router.refresh()
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleRemove}
        disabled={isRemoving}
        className="inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-red-200 bg-white px-4 py-3 text-center text-sm font-semibold text-red-700 transition hover:border-red-300 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isRemoving
          ? 'Removing...'
          : 'Remove from My Pass'}
      </button>

      {message ? (
        <p
          aria-live="polite"
          className="mt-2 text-center text-xs text-gray-600"
        >
          {message}
        </p>
      ) : null}
    </div>
  )
}

// =============================================================================
// Component
// =============================================================================

export default function CustomerSavedDealsSection({
  enrichedOffers,
  savedOfferIds,
  redeemedOfferIds,
  redemptionDateByOfferId,
}: Props) {
  const savedDeals =
    getCustomerSavedDeals({
      offers: enrichedOffers,
      savedOfferIds,
      redeemedOfferIds,
    })

  const unusedSavedDealCount =
    savedDeals.filter(
      (deal) => !deal.isRedeemed
    ).length

  const savedDealCountLabel =
    getCustomerSavedDealCountLabel(
      savedDeals.length
    )

  const unusedSavedDealCountLabel =
    getCustomerUnusedSavedDealCountLabel(
      unusedSavedDealCount
    )

  const guidance =
    getCustomerSavedDealGuidance({
      savedDealCount:
        savedDeals.length,
      unusedSavedDealCount,
    })

  return (
    <section
      aria-labelledby="customer-saved-deals-heading"
    >
      <div className="rounded-3xl border border-green-100 bg-white/90 p-5 shadow-xl backdrop-blur sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-green-700">
              My Pass
            </p>

            <h2
              id="customer-saved-deals-heading"
              className="mt-2 break-words text-2xl font-bold text-gray-900"
            >
              My Saved Deals
            </h2>

            <p className="mt-2 text-sm leading-6 text-gray-600">
              Your saved offers stay here
              for quick access. Unused
              deals appear first.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="w-fit shrink-0 rounded-full bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700">
              {savedDealCountLabel}
            </span>

            {unusedSavedDealCount > 0 ? (
              <span className="w-fit shrink-0 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
                {
                  unusedSavedDealCountLabel
                }
              </span>
            ) : null}
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-green-100 bg-gradient-to-br from-green-50 via-white to-blue-50 p-4 sm:p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-green-700">
            {guidance.eyebrow}
          </p>

          <h3 className="mt-2 break-words text-lg font-bold leading-snug text-gray-900">
            {guidance.title}
          </h3>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
            {guidance.description}
          </p>

          {savedDeals.length === 0 ||
          unusedSavedDealCount === 0 ? (
            <Link
              href="#available-offers"
              className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-green-700 px-4 py-2.5 text-center text-sm font-semibold text-white shadow-sm transition hover:bg-green-800 sm:w-auto"
            >
              Browse Available Deals
            </Link>
          ) : null}
        </div>
      </div>

      <div className="mt-5 sm:mt-6">
        {savedDeals.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {savedDeals.map(
              ({
                offer,
                isRedeemed,
              }) => {
                const offerTitle =
                  getCustomerSavedDealTitle(
                    offer
                  )

                const businessName =
                  getCustomerSavedDealBusinessName(
                    offer
                  )

                const benefitLabel =
                  getCustomerSavedDealBenefitLabel(
                    offer
                  )

                const description =
                  getCustomerSavedDealDescription(
                    offer
                  )

                const phone =
                  getCustomerSavedDealPhone(
                    offer
                  )

                const address =
                  getCustomerSavedDealAddress(
                    offer
                  )

                const mapUrl =
                  getCustomerSavedDealMapUrl(
                    offer
                  )

                return (
                  <article
                    key={offer.id}
                    className="flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-green-100 bg-white/90 p-5 shadow-xl backdrop-blur sm:p-6"
                  >
                    <div className="flex min-w-0 items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="break-words text-xs font-semibold uppercase tracking-wide text-green-700">
                          {businessName}
                        </p>

                        <h3 className="mt-2 break-words text-lg font-bold leading-snug text-gray-900">
                          {offerTitle}
                        </h3>
                      </div>

                      <span
                        className={
                          isRedeemed
                            ? 'shrink-0 rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700'
                            : 'shrink-0 rounded-full bg-yellow-50 px-3 py-1 text-xs font-semibold text-yellow-700'
                        }
                      >
                        {isRedeemed
                          ? 'Used'
                          : 'Saved'}
                      </span>
                    </div>

                    <p className="mt-3 break-words font-semibold text-green-700">
                      {benefitLabel}
                    </p>

                    <p className="mt-2 break-words text-sm leading-6 text-gray-600">
                      {description}
                    </p>

                    <dl className="mt-4 space-y-4 rounded-2xl bg-gray-50 p-4 text-sm">
                      {phone ? (
                        <div>
                          <dt className="font-semibold text-gray-900">
                            Phone
                          </dt>

                          <dd className="mt-1">
                            <a
                              href={`tel:${phone}`}
                              className="break-words font-medium text-blue-700 underline underline-offset-4"
                            >
                              {phone}
                            </a>
                          </dd>
                        </div>
                      ) : null}

                      {address ? (
                        <div>
                          <dt className="font-semibold text-gray-900">
                            Location
                          </dt>

                          <dd className="mt-1 break-words leading-6 text-gray-600">
                            {address}
                          </dd>
                        </div>
                      ) : null}

                      <div>
                        <dt className="font-semibold text-gray-900">
                          Offer ends
                        </dt>

                        <dd className="mt-1 text-gray-600">
                          {formatCustomerSavedDealEndDate(
                            offer.ends_at
                          )}
                        </dd>
                      </div>
                    </dl>

                    {mapUrl ? (
                      <a
                        href={mapUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-green-200 bg-white px-4 py-2.5 text-center text-sm font-semibold text-green-700 transition hover:bg-green-50"
                      >
                        View Map
                      </a>
                    ) : null}

                    <div className="mt-auto space-y-3 pt-5">
                      <Link
                        href={`/offers/${offer.id}`}
                        className="inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-blue-200 bg-white px-4 py-3 text-center text-sm font-semibold text-blue-700 transition hover:bg-blue-50"
                      >
                        View Deal Details
                      </Link>

                      {isRedeemed ? (
                        <div className="rounded-xl bg-gray-100 px-4 py-3 text-center">
                          <p className="text-sm font-semibold text-gray-700">
                            Used
                          </p>

                          <p className="mt-1 break-words text-xs leading-5 text-gray-500">
                            Used on{' '}
                            {formatCustomerSavedDealRedemptionDate(
                              redemptionDateByOfferId.get(
                                offer.id
                              )
                            )}
                          </p>
                        </div>
                      ) : (
                        <UseOfferButton
                          offerId={offer.id}
                        />
                      )}

                      <RemoveSavedOfferButton
                        offerId={offer.id}
                        offerTitle={
                          offerTitle
                        }
                      />
                    </div>
                  </article>
                )
              }
            )}
          </div>
        ) : null}
      </div>
    </section>
  )
}
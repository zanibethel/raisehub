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
// Helpers
// =============================================================================

function formatRedemptionDate(
  value: string | undefined
): string {
  if (!value) {
    return 'Date unavailable'
  }

  const date = new Date(value)

  if (
    Number.isNaN(date.getTime())
  ) {
    return 'Date unavailable'
  }

  return date.toLocaleString()
}

function formatOfferEndDate(
  value: string | null | undefined
): string {
  if (!value) {
    return 'No listed end date'
  }

  const date = new Date(value)

  if (
    Number.isNaN(date.getTime())
  ) {
    return 'Date unavailable'
  }

  return date.toLocaleDateString()
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
        className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:border-red-300 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
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
  const savedOffers =
    enrichedOffers.filter((offer) =>
      savedOfferIds.has(offer.id)
    )

  return (
    <section
      aria-labelledby="customer-saved-deals-heading"
    >
      <div className="rounded-3xl border border-green-100 bg-white/90 p-6 shadow-xl backdrop-blur sm:p-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-green-700">
              Quick Access
            </p>

            <h2
              id="customer-saved-deals-heading"
              className="mt-2 text-2xl font-bold text-gray-900"
            >
              My Saved Deals
            </h2>

            <p className="mt-2 text-sm text-gray-600">
              Offers you&apos;ve saved for
              quick access.
            </p>
          </div>

          <span className="w-fit rounded-full bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700">
            {savedOffers.length}{' '}
            {savedOffers.length === 1
              ? 'saved deal'
              : 'saved deals'}
          </span>
        </div>
      </div>

      <div className="mt-6">
        {savedOffers.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {savedOffers.map(
              (offer) => {
                const offerTitle =
                  offer.title ||
                  'Local offer'

                const isRedeemed =
                  redeemedOfferIds.has(
                    offer.id
                  )

                return (
                  <article
                    key={offer.id}
                    className="flex h-full flex-col rounded-2xl border border-green-100 bg-white/90 p-6 shadow-xl backdrop-blur"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-green-700">
                          {offer.business_name ||
                            'Local Business'}
                        </p>

                        <h3 className="mt-2 text-lg font-bold text-gray-900">
                          {offerTitle}
                        </h3>
                      </div>

                      <span className="rounded-full bg-yellow-50 px-3 py-1 text-xs font-semibold text-yellow-700">
                        Saved
                      </span>
                    </div>

                    <p className="mt-3 font-semibold text-green-700">
                      {offer.discount ||
                        'Member benefit available'}
                    </p>

                    <p className="mt-2 text-sm leading-6 text-gray-600">
                      {offer.description ||
                        'Offer details are available through your RaiseHub Pass.'}
                    </p>

                    <div className="mt-4 space-y-2 text-sm text-gray-600">
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
                          className="inline-flex font-semibold text-green-700 underline underline-offset-2"
                        >
                          View Map
                        </a>
                      ) : null}

                      <p>
                        Ends:{' '}
                        {formatOfferEndDate(
                          offer.ends_at
                        )}
                      </p>
                    </div>

                    <div className="mt-auto space-y-3 pt-5">
                      {isRedeemed ? (
                        <div className="rounded-xl bg-gray-100 px-4 py-3 text-center">
                          <p className="text-sm font-semibold text-gray-700">
                            ✅ Used
                          </p>

                          <p className="mt-1 text-xs text-gray-500">
                            Used on{' '}
                            {formatRedemptionDate(
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
        ) : (
          <div className="rounded-3xl border border-green-100 bg-gradient-to-br from-green-50 via-white to-blue-50 p-6 shadow-lg sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-wide text-green-700">
              Nothing Saved Yet
            </p>

            <h3 className="mt-2 text-xl font-bold text-gray-900">
              Keep your favorite local
              deals within reach
            </h3>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-600">
              Browse the deals available
              through your RaiseHub Pass
              and save the ones you plan
              to use. They will appear
              here for quick access.
            </p>

            <Link
              href="#available-offers"
              className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-green-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-green-800"
            >
              View Available Deals
            </Link>
          </div>
        )}
      </div>
    </section>
  )
}
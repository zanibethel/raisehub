import Link from 'next/link'

import {
  formatCustomerRedemptionDate,
  formatCustomerRedemptionTime,
  getCustomerRedemptionBenefitLabel,
  getCustomerRedemptionBusinessName,
  getCustomerRedemptionHistory,
  getCustomerRedemptionMapUrl,
  getCustomerRedemptionOfferTitle,
} from '../customer-redemption-history'

import type {
  CustomerRedemptionEvent,
} from '../customer-redemption-history'
import type {
  CustomerDashboardOffer,
} from '@/types/customer-dashboard'

type Props = {
  enrichedOffers: CustomerDashboardOffer[]
  redemptions: CustomerRedemptionEvent[]
}

function getStatusLabel(status: string | null): string {
  switch (status) {
    case 'pending':
      return 'In 24-hour review'
    case 'confirmed':
      return 'Confirmed'
    default:
      return 'Recorded'
  }
}

function getStatusClasses(status: string | null): string {
  return status === 'pending'
    ? 'bg-amber-50 text-amber-800'
    : 'bg-green-50 text-green-700'
}

export default function CustomerRedemptionHistorySection({
  enrichedOffers,
  redemptions,
}: Props) {
  const redemptionHistory = getCustomerRedemptionHistory({
    offers: enrichedOffers,
    redemptions,
  })

  return (
    <section aria-labelledby="customer-redemption-history-heading">
      <div className="overflow-hidden rounded-3xl border border-purple-100 bg-white/90 p-5 shadow-xl backdrop-blur sm:p-8">
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-purple-700">
              Pass Activity
            </p>
            <h2
              id="customer-redemption-history-heading"
              className="mt-2 break-words text-2xl font-bold leading-tight text-gray-900"
            >
              Redemption History
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
              Each use is preserved separately, including repeat uses of daily, weekly, and unlimited offers.
            </p>
          </div>

          <span className="w-fit shrink-0 rounded-full bg-purple-50 px-3 py-1.5 text-xs font-semibold text-purple-700">
            {redemptionHistory.length} {redemptionHistory.length === 1 ? 'redemption' : 'redemptions'}
          </span>
        </div>
      </div>

      <div className="mt-5 sm:mt-6">
        {redemptionHistory.length > 0 ? (
          <div className="space-y-4">
            {redemptionHistory.map(({ redemption, offer, redeemedAt }) => {
              const businessName = getCustomerRedemptionBusinessName(offer)
              const offerTitle = getCustomerRedemptionOfferTitle(offer, redemption)
              const benefitLabel = getCustomerRedemptionBenefitLabel(offer, redemption)
              const redemptionTime = formatCustomerRedemptionTime(redeemedAt)
              const mapUrl = getCustomerRedemptionMapUrl(offer)

              return (
                <article
                  key={redemption.id}
                  className="min-w-0 overflow-hidden rounded-2xl border border-purple-100 bg-white p-5 shadow-sm sm:p-6"
                >
                  <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${getStatusClasses(redemption.status)}`}>
                          {getStatusLabel(redemption.status)}
                        </span>
                        <span className="min-w-0 break-words text-xs font-semibold uppercase tracking-wide text-purple-700">
                          {businessName}
                        </span>
                      </div>

                      <h3 className="mt-3 break-words text-lg font-bold leading-snug text-gray-900">
                        {offerTitle}
                      </h3>
                      <p className="mt-2 break-words font-semibold leading-6 text-green-700">
                        {benefitLabel}
                      </p>

                      {offer?.description ? (
                        <p className="mt-2 max-w-2xl break-words text-sm leading-6 text-gray-600">
                          {offer.description}
                        </p>
                      ) : null}
                    </div>

                    <div className="w-full shrink-0 rounded-2xl bg-purple-50 px-4 py-3 text-left sm:w-auto sm:text-right">
                      <p className="text-xs font-semibold uppercase tracking-wide text-purple-700">
                        Used
                      </p>
                      <p className="mt-1 font-semibold text-gray-900">
                        {formatCustomerRedemptionDate(redeemedAt)}
                      </p>
                      {redemptionTime ? (
                        <p className="mt-1 text-xs text-gray-600">{redemptionTime}</p>
                      ) : null}
                    </div>
                  </div>

                  {offer?.address ? (
                    <div className="mt-4 rounded-2xl bg-gray-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Location
                      </p>
                      <p className="mt-1 break-words text-sm leading-6 text-gray-600">
                        {offer.address}
                      </p>
                    </div>
                  ) : null}

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    {offer ? (
                      <Link
                        href={`/offers/${offer.id}`}
                        className="inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-purple-200 bg-white px-4 py-3 text-center text-sm font-semibold text-purple-700 transition hover:bg-purple-50"
                      >
                        View Deal Details
                      </Link>
                    ) : null}

                    {mapUrl ? (
                      <a
                        href={mapUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-purple-700 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-purple-800"
                      >
                        View Business Map
                      </a>
                    ) : null}
                  </div>
                </article>
              )
            })}
          </div>
        ) : (
          <div className="rounded-3xl border border-purple-100 bg-gradient-to-br from-purple-50 via-white to-blue-50 p-5 shadow-lg sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-wide text-purple-700">
              No Redemptions Yet
            </p>
            <h3 className="mt-2 break-words text-xl font-bold leading-snug text-gray-900">
              Your used offers will appear here
            </h3>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-600">
              When you redeem a local offer, RaiseHub keeps each redemption event here for easy reference.
            </p>
            <Link
              href="#available-offers"
              className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-purple-700 px-5 py-3 text-center text-sm font-semibold text-white transition hover:bg-purple-800 sm:w-auto"
            >
              Browse Available Deals
            </Link>
          </div>
        )}
      </div>
    </section>
  )
}

import Link from 'next/link'

import type {
  CustomerDashboardOffer,
} from '@/types/customer-dashboard'

type Props = {
  hasPurchasedPass: boolean
  enrichedOffers: CustomerDashboardOffer[]
  savedOfferIds: Set<string>
}

function formatOfferDate(
  value: string | null | undefined
): string {
  if (!value) {
    return 'No listed expiration'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return 'Date unavailable'
  }

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatCustomerValue(value: number): string {
  return Number.isInteger(value)
    ? `$${value.toFixed(0)}`
    : `$${value.toFixed(2)}`
}

export default function CustomerAvailableDealsSection({
  hasPurchasedPass,
  enrichedOffers,
  savedOfferIds,
}: Props) {
  return (
    <section
      id="available-deals"
      aria-labelledby="customer-available-deals-heading"
    >
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-green-700">
            Local benefits
          </p>
          <h2
            id="customer-available-deals-heading"
            className="mt-1 text-2xl font-black tracking-tight text-slate-950"
          >
            Available Local Deals
          </h2>
        </div>

        <span className="shrink-0 text-xs font-black text-slate-500">
          {enrichedOffers.length}{' '}
          {enrichedOffers.length === 1 ? 'offer' : 'offers'}
        </span>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {enrichedOffers.map((offer) => {
          const isSaved = savedOfferIds.has(offer.id)
          const businessName = offer.business_name || 'Local Business'
          const customerValue =
            typeof offer.customer_value === 'number' &&
            Number.isFinite(offer.customer_value)
              ? `${formatCustomerValue(offer.customer_value)} value`
              : null

          return (
            <article
              key={offer.id}
              className="flex min-w-0 h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-200 hover:shadow-md sm:p-6"
            >
              <div className="flex min-w-0 items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="break-words text-xs font-black uppercase tracking-[0.12em] text-blue-700">
                    {businessName}
                  </p>

                  <h3 className="mt-2 break-words text-lg font-black leading-snug text-slate-950">
                    {hasPurchasedPass
                      ? offer.title || 'Local offer'
                      : 'Exclusive Local Deal'}
                  </h3>
                </div>

                {isSaved && hasPurchasedPass ? (
                  <span className="shrink-0 rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-800">
                    Saved
                  </span>
                ) : null}
              </div>

              <p className="mt-3 break-words font-black leading-6 text-green-700">
                {hasPurchasedPass
                  ? offer.discount || 'Member benefit available'
                  : customerValue || 'Member value available'}
              </p>

              <p className="mt-2 break-words text-sm leading-6 text-slate-600">
                {hasPurchasedPass
                  ? offer.description || 'Offer details are available through your RaiseHub Pass.'
                  : 'Activate a RaiseHub Pass to reveal the exact offer and redemption details.'}
              </p>

              <div className="mt-4 space-y-2 border-t border-slate-200 pt-4 text-xs leading-5 text-slate-500">
                {offer.address ? (
                  <p>
                    <span className="font-black text-slate-700">Location:</span>{' '}
                    {offer.address}
                  </p>
                ) : null}

                {hasPurchasedPass && offer.phone ? (
                  <p>
                    <span className="font-black text-slate-700">Phone:</span>{' '}
                    <a
                      href={`tel:${offer.phone}`}
                      className="font-bold text-blue-700 underline underline-offset-4"
                    >
                      {offer.phone}
                    </a>
                  </p>
                ) : null}

                <p>
                  <span className="font-black text-slate-700">Offer:</span>{' '}
                  {formatOfferDate(offer.ends_at)}
                </p>
              </div>

              <div className="mt-auto pt-5">
                {hasPurchasedPass ? (
                  <Link
                    href={`/offers/${offer.id}`}
                    className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-blue-700 px-4 py-3 text-center text-sm font-black text-white transition hover:bg-blue-800"
                  >
                    View Deal Details
                  </Link>
                ) : (
                  <Link
                    href="/campaigns"
                    className="inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-center text-sm font-black text-amber-800 transition hover:bg-amber-100"
                  >
                    Unlock With a Pass
                  </Link>
                )}
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}

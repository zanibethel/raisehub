import Link from 'next/link'

// =============================================================================
// Types
// =============================================================================

type Purchase = {
  id: string
  created_at: string
  amount_paid: number | null
  donation_amount?: number | null
  selected_organization_id: string | null
  campaigns?: {
    id?: string
    name?: string | null
  } | null
}

type Organization = {
  display_name?: string | null
  business_name?: string | null
}

type Props = {
  purchasedPasses: Purchase[]
  organizationById: Map<
    string,
    Organization
  >
}

// =============================================================================
// Helpers
// =============================================================================

function getTimestamp(
  value: string
): number {
  const timestamp =
    new Date(value).getTime()

  return Number.isNaN(timestamp)
    ? 0
    : timestamp
}

function formatPurchaseDate(
  value: string
): string {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return 'Date unavailable'
  }

  return date.toLocaleDateString(
    undefined,
    {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }
  )
}

function formatCurrency(
  value: number | null | undefined
): string {
  const amount = Number(value ?? 0)

  if (!Number.isFinite(amount)) {
    return '$0.00'
  }

  return amount.toLocaleString(
    undefined,
    {
      style: 'currency',
      currency: 'USD',
    }
  )
}

function getSafeAmount(
  value: number | null | undefined
): number {
  const amount = Number(value ?? 0)

  return Number.isFinite(amount)
    ? Math.max(0, amount)
    : 0
}

function getPassAmount(
  purchase: Purchase
): number {
  return Math.max(
    0,
    getSafeAmount(purchase.amount_paid) -
      getSafeAmount(purchase.donation_amount)
  )
}

function getPurchaseReference(
  purchaseId: string
): string {
  const normalized = purchaseId
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase()

  if (!normalized) {
    return 'Unavailable'
  }

  return normalized.slice(-8)
}

// =============================================================================
// Component
// =============================================================================

export default function CustomerPassesSection({
  purchasedPasses,
  organizationById,
}: Props) {
  const sortedPurchases = [
    ...purchasedPasses,
  ].sort(
    (firstPurchase, secondPurchase) =>
      getTimestamp(
        secondPurchase.created_at
      ) -
      getTimestamp(
        firstPurchase.created_at
      )
  )

  const totalContributed =
    sortedPurchases.reduce(
      (total, purchase) =>
        total +
        getSafeAmount(
          purchase.amount_paid
        ),
      0
    )

  const totalDonated =
    sortedPurchases.reduce(
      (total, purchase) =>
        total +
        getSafeAmount(
          purchase.donation_amount
        ),
      0
    )

  return (
    <section
      aria-labelledby="customer-purchase-history-heading"
      className="rounded-3xl border border-blue-100 bg-white/90 p-6 shadow-xl backdrop-blur sm:p-8"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
            Your Impact
          </p>

          <h2
            id="customer-purchase-history-heading"
            className="mt-2 text-2xl font-bold text-gray-900"
          >
            Purchase History
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
            Review completed RaiseHub Pass
            purchases, optional donations,
            and the fundraisers you supported.
          </p>
        </div>

        {sortedPurchases.length > 0 ? (
          <Link
            href="/campaigns"
            className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800"
          >
            Support Another Fundraiser
          </Link>
        ) : null}
      </div>

      {sortedPurchases.length > 0 ? (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                Pass Purchases
              </p>

              <p className="mt-2 text-3xl font-bold text-gray-900">
                {sortedPurchases.length}
              </p>

              <p className="mt-1 text-sm text-gray-600">
                {sortedPurchases.length === 1
                  ? 'Completed purchase'
                  : 'Completed purchases'}
              </p>
            </div>

            <div className="rounded-2xl border border-green-100 bg-green-50 p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-green-700">
                Total Paid
              </p>

              <p className="mt-2 text-3xl font-bold text-gray-900">
                {formatCurrency(
                  totalContributed
                )}
              </p>

              <p className="mt-1 text-sm text-gray-600">
                Passes and optional donations
              </p>
            </div>

            <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-5 sm:col-span-2 lg:col-span-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-yellow-700">
                Extra Donations
              </p>

              <p className="mt-2 text-3xl font-bold text-gray-900">
                {formatCurrency(totalDonated)}
              </p>

              <p className="mt-1 text-sm text-gray-600">
                Added beyond pass prices
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {sortedPurchases.map(
              (purchase, index) => {
                const campaign =
                  purchase.campaigns

                const organization =
                  purchase.selected_organization_id
                    ? organizationById.get(
                        purchase.selected_organization_id
                      )
                    : undefined

                const organizationName =
                  organization?.display_name ||
                  organization
                    ?.business_name ||
                  'Participating organization'

                const donationAmount =
                  getSafeAmount(
                    purchase.donation_amount
                  )

                const passAmount =
                  getPassAmount(purchase)

                return (
                  <article
                    key={purchase.id}
                    className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm sm:p-6"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                            Completed
                          </span>

                          {index === 0 ? (
                            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                              Most Recent
                            </span>
                          ) : null}

                          {donationAmount > 0 ? (
                            <span className="rounded-full bg-yellow-50 px-3 py-1 text-xs font-semibold text-yellow-700">
                              Includes Donation
                            </span>
                          ) : null}
                        </div>

                        <h3 className="mt-3 break-words text-lg font-bold text-gray-900">
                          {campaign?.name ||
                            'RaiseHub Pass'}
                        </h3>

                        <p className="mt-1 text-sm text-gray-600">
                          Supporting{' '}
                          <span className="font-semibold text-gray-900">
                            {organizationName}
                          </span>
                        </p>

                        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                          <div>
                            <dt className="font-semibold text-gray-900">
                              Purchase date
                            </dt>
                            <dd className="mt-1 text-gray-600">
                              {formatPurchaseDate(
                                purchase.created_at
                              )}
                            </dd>
                          </div>

                          <div>
                            <dt className="font-semibold text-gray-900">
                              Reference
                            </dt>
                            <dd className="mt-1 font-mono text-gray-600">
                              {getPurchaseReference(
                                purchase.id
                              )}
                            </dd>
                          </div>
                        </dl>
                      </div>

                      <div className="shrink-0 rounded-2xl bg-blue-50 px-5 py-4 text-left sm:min-w-52 sm:text-right">
                        <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                          Total Paid
                        </p>

                        <p className="mt-1 text-2xl font-bold text-gray-900">
                          {formatCurrency(
                            purchase.amount_paid
                          )}
                        </p>

                        <dl className="mt-3 space-y-1 border-t border-blue-100 pt-3 text-xs text-gray-600">
                          <div className="flex items-center justify-between gap-4 sm:justify-end">
                            <dt>Pass</dt>
                            <dd className="font-semibold text-gray-900">
                              {formatCurrency(
                                passAmount
                              )}
                            </dd>
                          </div>

                          <div className="flex items-center justify-between gap-4 sm:justify-end">
                            <dt>Donation</dt>
                            <dd className="font-semibold text-gray-900">
                              {formatCurrency(
                                donationAmount
                              )}
                            </dd>
                          </div>
                        </dl>
                      </div>
                    </div>

                    {campaign?.id ? (
                      <div className="mt-5 border-t border-gray-100 pt-4">
                        <Link
                          href={`/campaigns/${campaign.id}`}
                          className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-blue-200 bg-white px-4 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-50 sm:w-auto"
                        >
                          View Supported Campaign
                        </Link>
                      </div>
                    ) : null}
                  </article>
                )
              }
            )}
          </div>
        </>
      ) : (
        <div className="mt-6 rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-yellow-50 p-6 shadow-sm sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
            No Purchases Yet
          </p>

          <h3 className="mt-2 text-xl font-bold text-gray-900">
            Make your first fundraiser count
          </h3>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-600">
            Choose a participating school,
            team, or organization to support.
            Your completed RaiseHub Pass
            purchase will appear here
            automatically.
          </p>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/campaigns"
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800"
            >
              Choose a Fundraiser
            </Link>

            <Link
              href="/how-it-works/supporters"
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-blue-200 bg-white px-5 py-3 text-sm font-semibold text-blue-700 transition hover:bg-blue-50"
            >
              See How It Works
            </Link>
          </div>
        </div>
      )}
    </section>
  )
}

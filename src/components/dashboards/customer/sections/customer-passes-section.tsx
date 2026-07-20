import Link from 'next/link'

// =============================================================================
// Types
// =============================================================================

type Purchase = {
  id: string
  created_at: string
  amount_paid: number | null
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
  organizationById: Map<string, Organization>
}

// =============================================================================
// Component
// =============================================================================

export default function CustomerPassesSection({
  purchasedPasses,
  organizationById,
}: Props) {
  return (
    <section className="rounded-3xl border border-blue-100 bg-white/90 p-6 shadow-xl backdrop-blur sm:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
            Your Impact
          </p>

          <h2 className="mt-2 text-2xl font-semibold text-blue-700">
            Fundraiser Support History
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
            This section records the fundraisers you have supported through a
            RaiseHub Pass purchase. Current pass access and expiration are
            verified separately above.
          </p>
        </div>

        {purchasedPasses.length > 0 ? (
          <Link
            href="/campaigns"
            className="inline-flex shrink-0 items-center justify-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            Support Another Fundraiser
          </Link>
        ) : null}
      </div>

      {purchasedPasses.length > 0 ? (
        <div className="mt-6 grid gap-4">
          {purchasedPasses.map((purchase, index) => {
            const campaign = purchase.campaigns

            const organization = purchase.selected_organization_id
              ? organizationById.get(purchase.selected_organization_id)
              : undefined

            const organizationName =
              organization?.display_name ||
              organization?.business_name ||
              'Organization'

            return (
              <div
                key={purchase.id}
                className="rounded-2xl border border-blue-100 bg-blue-50 p-5"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-blue-700">
                      {index === 0
                        ? 'Most Recent Support'
                        : 'Fundraiser Purchase'}
                    </p>

                    <h3 className="mt-1 text-lg font-semibold text-gray-900">
                      {campaign?.name || 'Fundraiser Pass'}
                    </h3>

                    <p className="mt-1 text-sm text-gray-600">
                      Supporting {organizationName}
                    </p>

                    <p className="mt-2 text-xs text-gray-500">
                      Purchased{' '}
                      {new Date(purchase.created_at).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="text-left sm:text-right">
                    <p className="text-sm text-gray-500">Total Paid</p>

                    <p className="text-2xl font-bold text-blue-700">
                      ${Number(purchase.amount_paid ?? 0).toFixed(2)}
                    </p>
                  </div>
                </div>

                {campaign?.id ? (
                  <div className="mt-4">
                    <Link
                      href={`/campaigns/${campaign.id}`}
                      className="inline-flex rounded-lg border border-blue-200 bg-white px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100"
                    >
                      View Campaign
                    </Link>
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="mt-6 rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-yellow-50 p-6 shadow-sm sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
            No Support History Yet
          </p>

          <h3 className="mt-2 text-xl font-bold text-gray-900">
            Make your first fundraiser count
          </h3>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-600">
            Choose a participating school, team, or organization to support.
            After your RaiseHub Pass purchase is completed, the fundraiser will
            appear here as part of your support history.
          </p>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/campaigns"
              className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
            >
              Choose Your First Fundraiser
            </Link>

            <Link
              href="/how-it-works/supporters"
              className="inline-flex items-center justify-center rounded-xl border border-blue-200 bg-white px-5 py-3 text-sm font-semibold text-blue-700 transition hover:bg-blue-50"
            >
              See How It Works
            </Link>
          </div>
        </div>
      )}
    </section>
  )
}
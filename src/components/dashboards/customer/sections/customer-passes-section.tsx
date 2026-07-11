import Link from 'next/link'

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

export default function CustomerPassesSection({
  purchasedPasses,
  organizationById,
}: Props) {
  return (
    <section className="rounded-3xl border border-blue-100 bg-white/90 p-8 shadow-xl backdrop-blur">
      <h2 className="text-2xl font-semibold text-blue-700">
        My Fundraiser Passes
      </h2>

      <p className="mt-2 text-sm text-gray-600">
        Your purchased passes unlock participating local deals.
      </p>

      {purchasedPasses.length > 0 ? (
        <div className="mt-6 grid gap-4">
          {purchasedPasses.map((purchase) => {
            const campaign = purchase.campaigns

            const organization = purchase.selected_organization_id
              ? organizationById.get(
                  purchase.selected_organization_id
                )
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
                      Active Pass
                    </p>

                    <h3 className="mt-1 text-lg font-semibold text-gray-900">
                      {campaign?.name || 'Fundraiser Pass'}
                    </h3>

                    <p className="mt-1 text-sm text-gray-600">
                      Supporting {organizationName}
                    </p>

                    <p className="mt-2 text-xs text-gray-500">
                      Purchased{' '}
                      {new Date(
                        purchase.created_at
                      ).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="text-left sm:text-right">
                    <p className="text-sm text-gray-500">
                      Total Paid
                    </p>

                    <p className="text-2xl font-bold text-blue-700">
                      $
                      {Number(
                        purchase.amount_paid ?? 0
                      ).toFixed(2)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                  {campaign?.id ? (
                    <Link
                      href={`/campaigns/${campaign.id}`}
                      className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                    >
                      View Campaign
                    </Link>
                  ) : null}

                  <a
                    href="#available-deals"
                    className="rounded-lg border border-blue-200 bg-white px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100"
                  >
                    View Available Deals
                  </a>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50 p-5">
          <p className="text-sm text-blue-800">
            You have not purchased any fundraiser passes yet.
          </p>

          <Link
            href="/campaigns"
            className="mt-4 inline-flex rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Browse Fundraisers
          </Link>
        </div>
      )}
    </section>
  )
}
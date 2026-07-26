// =============================================================================
// Types
// =============================================================================

type TopSeller = {
  seller: string
  sold: number
  earnings: number
}

type OrganizationTopSellersSectionProps = {
  sellers: TopSeller[]
}

// =============================================================================
// Component
// =============================================================================

export default function OrganizationTopSellersSection({
  sellers,
}: OrganizationTopSellersSectionProps) {
  const topSellers = sellers.slice(0, 5)

  return (
    <section className="rounded-2xl border border-yellow-100 bg-white/90 p-6 shadow-xl backdrop-blur">
      <h2 className="text-lg font-semibold text-yellow-700">
        Top sellers by recorded sales
      </h2>
      <p className="mt-1 text-xs text-gray-500">
        Historical sales attribution is separate from the current active checkout roster.
      </p>

      {topSellers.length > 0 ? (
        <div className="mt-4 space-y-3">
          {topSellers.map((seller, index) => (
            <div
              key={seller.seller}
              className="flex items-center justify-between rounded-xl border border-yellow-100 bg-yellow-50 p-4"
            >
              <div>
                <p className="font-semibold text-gray-900">
                  #{index + 1} {seller.seller}
                </p>

                <p className="text-sm text-gray-600">
                  {seller.sold} passes sold
                </p>
              </div>

              <p className="font-semibold text-yellow-700">
                ${seller.earnings.toLocaleString()} raised
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm text-gray-600">
          No seller sales have been recorded yet.
        </p>
      )}
    </section>
  )
}

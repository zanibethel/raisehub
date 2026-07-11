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
        Top Sellers
      </h2>

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
          No seller referrals tracked yet.
        </p>
      )}
    </section>
  )
}
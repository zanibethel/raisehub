// =============================================================================
// Types
// =============================================================================

type TopSeller = {
  id: string
  name: string
  passesSold: number
  earnings: number
}

type Props = {
  sellers: TopSeller[]
}

// =============================================================================
// Component
// =============================================================================

export default function OrganizationTopSellersSection({
  sellers,
}: Props) {
  return (
    <section className="rounded-3xl border border-blue-100 bg-white/90 p-8 shadow-xl backdrop-blur">
      <h2 className="text-2xl font-semibold text-blue-700">
        Top Sellers
      </h2>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-blue-100 text-sm text-gray-500">
              <th className="pb-3">Seller</th>
              <th className="pb-3 text-right">Passes</th>
              <th className="pb-3 text-right">Earned</th>
            </tr>
          </thead>

          <tbody>
            {sellers.length === 0 ? (
              <tr>
                <td
                  colSpan={3}
                  className="py-8 text-center text-sm text-gray-500"
                >
                  No sales yet.
                </td>
              </tr>
            ) : (
              sellers.map((seller) => (
                <tr
                  key={seller.id}
                  className="border-b border-gray-100"
                >
                  <td className="py-4 font-medium">
                    {seller.name}
                  </td>

                  <td className="py-4 text-right">
                    {seller.passesSold}
                  </td>

                  <td className="py-4 text-right font-semibold text-green-700">
                    ${seller.earnings.toFixed(2)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
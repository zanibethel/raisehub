import type {
  OwnerOrganizationSellersResult,
  ReadOnlyOrganizationSeller,
} from '@/lib/services/owner-organization-seller-service'

type Props = {
  sellersResult: OwnerOrganizationSellersResult | null
}

function formatMoney(value: number) {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
  }).format(value)
}

function SellerCard({ seller }: { seller: ReadOnlyOrganizationSeller }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="break-words font-bold text-slate-950">{seller.displayName}</h4>
          <p className="mt-1 text-sm text-slate-600">{seller.campaignName}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${seller.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
            {seller.status.replaceAll('_', ' ')}
          </span>
          <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${seller.claimed ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-800'}`}>
            {seller.claimed ? 'Account linked' : 'Unclaimed'}
          </span>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <div className="rounded-lg bg-slate-50 p-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Paid sales</p>
          <p className="mt-1 text-lg font-black text-slate-950">{seller.paidSales}</p>
        </div>
        <div className="rounded-lg bg-slate-50 p-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Gross</p>
          <p className="mt-1 text-sm font-black text-slate-950">{formatMoney(seller.grossSales)}</p>
        </div>
        <div className="rounded-lg bg-slate-50 p-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Org earned</p>
          <p className="mt-1 text-sm font-black text-green-700">{formatMoney(seller.organizationEarnings)}</p>
        </div>
      </div>
    </article>
  )
}

export default function ReadOnlyOrganizationSellersSection({ sellersResult }: Props) {
  if (!sellersResult || !sellersResult.success) {
    return (
      <section className="border-t border-slate-200 p-4 sm:p-6">
        <p className="text-sm font-semibold text-rose-800">
          {sellersResult && !sellersResult.success
            ? sellersResult.message
            : 'Seller activity could not be loaded.'}
        </p>
      </section>
    )
  }

  const { sellers, summary } = sellersResult

  return (
    <section className="border-t border-slate-200 p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Organization sellers</p>
          <h3 className="mt-1 text-lg font-bold text-slate-950">Seller roster & performance</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Review roster linkage and paid sales without entering the organization workspace.
          </p>
        </div>
        <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800">Read-only</span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
        {[
          ['Roster', summary.total],
          ['Active', summary.active],
          ['Linked', summary.claimed],
          ['Paid sales', summary.paidSales],
          ['Gross', formatMoney(summary.grossSales)],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
            <p className="mt-1 break-words text-lg font-black text-slate-950">{value}</p>
          </div>
        ))}
      </div>

      {sellers.length === 0 ? (
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-800">No seller roster entries yet.</p>
        </div>
      ) : (
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {sellers.map((seller) => (
            <SellerCard key={seller.id} seller={seller} />
          ))}
        </div>
      )}
    </section>
  )
}

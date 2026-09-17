import type {
  OwnerBusinessAnalyticsResult,
  ReadOnlyBusinessOfferAnalytics,
} from '@/lib/services/owner-business-analytics-service'

type Props = {
  analyticsResult: OwnerBusinessAnalyticsResult | null
}

function formatRate(value: number | null) {
  return value === null ? '—' : `${(value * 100).toFixed(1)}%`
}

function OfferAnalyticsRow({ offer }: { offer: ReadOnlyBusinessOfferAnalytics }) {
  return (
    <div className="grid gap-3 border-t border-slate-100 px-4 py-4 first:border-t-0 lg:grid-cols-[minmax(0,1.5fr)_repeat(5,minmax(70px,0.5fr))] lg:items-center">
      <div className="min-w-0">
        <p className="break-words font-bold text-slate-950">{offer.title}</p>
      </div>
      {[
        ['Views', offer.views],
        ['Clicks', offer.clicks],
        ['Saves', offer.saves],
        ['Redeemed', offer.confirmedRedemptions],
        ['Conversion', formatRate(offer.conversionRate)],
      ].map(([label, value]) => (
        <div key={String(label)} className="rounded-lg bg-slate-50 px-3 py-2 lg:bg-transparent lg:px-0 lg:py-0">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 lg:hidden">{label}</p>
          <p className="mt-1 text-sm font-black text-slate-900 lg:mt-0">{value}</p>
        </div>
      ))}
    </div>
  )
}

export default function ReadOnlyBusinessAnalyticsSection({ analyticsResult }: Props) {
  if (!analyticsResult || !analyticsResult.success) {
    return (
      <section className="border-t border-slate-200 p-4 sm:p-6">
        <p className="text-sm font-semibold text-rose-800">
          {analyticsResult && !analyticsResult.success
            ? analyticsResult.message
            : 'Business analytics could not be loaded.'}
        </p>
      </section>
    )
  }

  const { summary, offers } = analyticsResult

  return (
    <section className="border-t border-slate-200 p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Business analytics</p>
          <h3 className="mt-1 text-lg font-bold text-slate-950">Offer engagement</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Read-only engagement uses RaiseHub’s existing offer view, click, save, and confirmed-redemption records.
          </p>
        </div>
        <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800">Read-only</span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
        {[
          ['Views', summary.views],
          ['Clicks', summary.clicks],
          ['Saves', summary.saves],
          ['Confirmed', summary.confirmedRedemptions],
          ['Conversion', formatRate(summary.conversionRate)],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
            <p className="mt-1 text-xl font-black text-slate-950">{value}</p>
          </div>
        ))}
      </div>

      {offers.length === 0 ? (
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-800">This business has no offers to analyze yet.</p>
        </div>
      ) : (
        <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="hidden grid-cols-[minmax(0,1.5fr)_repeat(5,minmax(70px,0.5fr))] gap-3 bg-slate-50 px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-slate-500 lg:grid">
            <span>Offer</span>
            <span>Views</span>
            <span>Clicks</span>
            <span>Saves</span>
            <span>Redeemed</span>
            <span>Conversion</span>
          </div>
          {offers.map((offer) => (
            <OfferAnalyticsRow key={offer.offerId} offer={offer} />
          ))}
        </div>
      )}
    </section>
  )
}

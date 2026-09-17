import type {
  OwnerBusinessRedemptionsResult,
  ReadOnlyBusinessRedemption,
} from '@/lib/services/owner-business-redemption-service'

type Props = {
  redemptionsResult: OwnerBusinessRedemptionsResult | null
}

function formatTimestamp(value: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString()
}

function formatMoney(value: number | null) {
  if (value === null) return 'Not valued'
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
  }).format(value)
}

function statusClass(status: string) {
  if (status === 'confirmed') return 'bg-green-50 text-green-700'
  if (status === 'rejected' || status === 'voided') return 'bg-rose-50 text-rose-700'
  return 'bg-amber-50 text-amber-800'
}

function statusLabel(status: string) {
  if (status === 'confirmed') return 'Confirmed'
  if (status === 'rejected') return 'Rejected'
  if (status === 'voided') return 'Voided'
  if (status === 'pending') return 'In review window'
  return status.replaceAll('_', ' ')
}

function methodLabel(method: string | null) {
  if (!method) return '24-hour workflow'
  return method.replaceAll('_', ' ')
}

function RedemptionCard({ redemption }: { redemption: ReadOnlyBusinessRedemption }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="break-words font-bold text-slate-950">
            {redemption.offerTitle}
          </h4>
          {redemption.benefit ? (
            <p className="mt-1 break-words text-sm font-semibold text-blue-700">
              {redemption.benefit}
            </p>
          ) : null}
        </div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-bold capitalize ${statusClass(redemption.status)}`}>
          {statusLabel(redemption.status)}
        </span>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <div className="rounded-lg bg-slate-50 px-3 py-2">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Redeemed</p>
          <p className="mt-1 text-sm font-semibold text-slate-900">{formatTimestamp(redemption.createdAt)}</p>
        </div>
        <div className="rounded-lg bg-slate-50 px-3 py-2">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Customer value</p>
          <p className="mt-1 text-sm font-semibold text-slate-900">{formatMoney(redemption.customerValue)}</p>
        </div>
        <div className="rounded-lg bg-slate-50 px-3 py-2">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Confirmation</p>
          <p className="mt-1 text-sm font-semibold capitalize text-slate-900">{methodLabel(redemption.confirmationMethod)}</p>
        </div>
      </div>

      {redemption.status === 'pending' && redemption.autoConfirmAt ? (
        <p className="mt-3 text-xs font-semibold text-amber-800">
          Auto-confirms {formatTimestamp(redemption.autoConfirmAt)} unless the business reports a problem.
        </p>
      ) : null}

      {redemption.confirmedAt ? (
        <p className="mt-3 text-xs text-slate-500">
          Confirmed {formatTimestamp(redemption.confirmedAt)}
        </p>
      ) : null}

      {redemption.rejectedAt ? (
        <div className="mt-3 rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-xs text-rose-800">
          <p className="font-bold">Rejected {formatTimestamp(redemption.rejectedAt)}</p>
          {redemption.rejectionReason ? <p className="mt-1">{redemption.rejectionReason}</p> : null}
        </div>
      ) : null}
    </article>
  )
}

export default function ReadOnlyBusinessRedemptionsSection({ redemptionsResult }: Props) {
  if (!redemptionsResult) {
    return (
      <section className="border-t border-slate-200 p-4 sm:p-6">
        <p className="text-sm font-semibold text-rose-800">Redemption history could not be loaded.</p>
      </section>
    )
  }

  if (!redemptionsResult.success) {
    return (
      <section className="border-t border-slate-200 p-4 sm:p-6">
        <p className="text-sm font-semibold text-rose-800">{redemptionsResult.message}</p>
      </section>
    )
  }

  const { summary, redemptions } = redemptionsResult

  return (
    <section className="border-t border-slate-200 p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Business redemptions</p>
          <h3 className="mt-1 text-lg font-bold text-slate-950">Redemption activity</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Review the latest customer redemption records without changing business data.
          </p>
        </div>
        <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800">Read-only</span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          ['Total', summary.total],
          ['Reviewing', summary.pending],
          ['Confirmed', summary.confirmed],
          ['Rejected', summary.rejected],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
            <p className="mt-1 text-xl font-black text-slate-950">{value}</p>
          </div>
        ))}
      </div>

      {redemptions.length === 0 ? (
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-800">This business has no redemption activity yet.</p>
        </div>
      ) : (
        <div className="mt-4 grid gap-3">
          {redemptions.map((redemption) => (
            <RedemptionCard key={redemption.id} redemption={redemption} />
          ))}
        </div>
      )}
    </section>
  )
}

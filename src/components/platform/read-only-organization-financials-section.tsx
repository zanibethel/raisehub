import type {
  OwnerOrganizationFinancialsResult,
  ReadOnlyOrganizationTransfer,
} from '@/lib/services/owner-organization-financial-service'

type Props = {
  financialsResult: OwnerOrganizationFinancialsResult | null
}

function formatMoney(value: number) {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
  }).format(value)
}

function formatCents(value: number) {
  return formatMoney(value / 100)
}

function formatTimestamp(value: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString()
}

function TransferRow({ transfer }: { transfer: ReadOnlyOrganizationTransfer }) {
  const tone = transfer.status === 'completed'
    ? 'bg-green-50 text-green-700'
    : transfer.status === 'failed'
      ? 'bg-rose-50 text-rose-700'
      : 'bg-amber-50 text-amber-800'

  return (
    <div className="grid gap-2 border-t border-slate-100 px-4 py-3 first:border-t-0 sm:grid-cols-[1fr_auto] sm:items-center">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${tone}`}>
            {transfer.status.replaceAll('_', ' ')}
          </span>
          <span className="text-xs text-slate-500">
            {formatTimestamp(transfer.completedAt ?? transfer.failedAt ?? transfer.initiatedAt)}
          </span>
        </div>
        {transfer.failureMessage ? (
          <p className="mt-2 text-xs font-semibold text-rose-700">{transfer.failureMessage}</p>
        ) : null}
      </div>
      <p className="text-lg font-black text-slate-950">{formatCents(transfer.amountCents)}</p>
    </div>
  )
}

export default function ReadOnlyOrganizationFinancialsSection({ financialsResult }: Props) {
  if (!financialsResult || !financialsResult.success) {
    return (
      <section className="border-t border-slate-200 p-4 sm:p-6">
        <p className="text-sm font-semibold text-rose-800">
          {financialsResult && !financialsResult.success
            ? financialsResult.message
            : 'Financial activity could not be loaded.'}
        </p>
      </section>
    )
  }

  const { summary, transfers } = financialsResult

  return (
    <section className="border-t border-slate-200 p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Organization financials</p>
          <h3 className="mt-1 text-lg font-bold text-slate-950">Sales & payout activity</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Read-only totals come from paid campaign purchases and the organization transfer ledger.
          </p>
        </div>
        <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800">Read-only</span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          ['Passes sold', String(summary.passesSold)],
          ['Gross volume', formatMoney(summary.grossVolume)],
          ['Organization earned', formatMoney(summary.organizationEarnings)],
          ['Platform fees', formatMoney(summary.platformFees)],
          ['Donations', formatMoney(summary.donations)],
          ['Transferred', formatCents(summary.transferredCents)],
          ['Pending transfer', formatCents(summary.pendingTransferCents)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
            <p className="mt-1 break-words text-lg font-black text-slate-950">{value}</p>
          </div>
        ))}
      </div>

      <div className="mt-4">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Recent transfers</p>
        {transfers.length === 0 ? (
          <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-800">No organization transfers recorded yet.</p>
          </div>
        ) : (
          <div className="mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white">
            {transfers.slice(0, 10).map((transfer) => (
              <TransferRow key={transfer.id} transfer={transfer} />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

import OwnerPaymentRiskControls from './owner-payment-risk-controls'
import { getOwnerPaymentRiskSnapshot } from '@/lib/payment-risk/owner-payment-risk-repository'

function money(cents: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(cents ?? 0) / 100)
}

export default async function OwnerFinancialHealthSection() {
  const snapshot = await getOwnerPaymentRiskSnapshot()
  const { health } = snapshot
  const attentionCount =
    Number(health.negative_organization_count ?? 0) +
    Number(health.threshold_organization_count ?? 0) +
    Number(health.manual_review_count ?? 0)
  const status = health.open_dispute_count > 0 || attentionCount > 0 ? 'Needs attention' : 'Healthy'

  const metrics = [
    ['Funds currently held', money(health.held_cents)],
    ['Rolling reserve balance', money(health.reserve_cents)],
    ['Eligible for payout', money(health.eligible_cents)],
    ['Refund totals', money(health.refund_cents)],
    ['Open disputes', `${health.open_dispute_count} · ${money(health.open_dispute_cents)}`],
    ['Lost dispute totals', money(health.lost_dispute_cents)],
    ['Platform-absorbed losses', money(health.platform_loss_cents)],
    ['Organizations with negative balances', String(health.negative_organization_count)],
    ['Organizations exceeding thresholds', String(health.threshold_organization_count)],
    ['Upcoming reserve releases', money(health.upcoming_reserve_release_cents)],
    ['Payouts requiring manual review', String(health.manual_review_count)],
  ]

  return (
    <details className="group rounded-3xl border border-slate-200 bg-white shadow-sm">
      <summary className="cursor-pointer list-none p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-700">Financial Health</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-bold text-slate-950">Payment risk and payout readiness</h2>
              <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${status === 'Healthy' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'}`}>{status}</span>
            </div>
            <p className="mt-1 text-sm text-slate-600">{attentionCount} organizations need attention</p>
          </div>
          <span className="shrink-0 text-2xl font-bold text-slate-500 transition group-open:rotate-45">+</span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-600">Held funds</p><p className="mt-1 font-bold text-slate-950">{money(health.held_cents)}</p></div>
          <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-600">Eligible payout</p><p className="mt-1 font-bold text-slate-950">{money(health.eligible_cents)}</p></div>
          <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-600">Open disputes</p><p className="mt-1 font-bold text-slate-950">{health.open_dispute_count}</p></div>
          <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-600">Needs attention</p><p className="mt-1 font-bold text-slate-950">{attentionCount}</p></div>
        </div>
      </summary>

      <div className="space-y-5 border-t border-slate-200 p-4 sm:p-6">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {metrics.map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">{label}</p>
              <p className="mt-2 text-lg font-bold text-slate-950">{value}</p>
            </div>
          ))}
        </div>

        <OwnerPaymentRiskControls policy={snapshot.policy} organizations={snapshot.organizations} />

        <details className="group rounded-2xl border border-slate-200">
          <summary className="flex cursor-pointer list-none items-center justify-between p-4">
            <div><h4 className="font-bold text-slate-950">Immutable audit history</h4><p className="text-sm text-slate-600">Most recent 25 payment-risk actions</p></div>
            <span className="text-xl font-bold text-slate-500 transition group-open:rotate-45">+</span>
          </summary>
          <div className="space-y-2 border-t border-slate-200 p-4">
            {snapshot.auditEvents.length === 0 ? <p className="text-sm text-slate-600">No policy changes have been recorded yet.</p> : snapshot.auditEvents.map((event: any) => (
              <div key={event.id} className="rounded-xl bg-slate-50 p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2"><strong>{String(event.action_type).replaceAll('_', ' ')}</strong><span className="text-xs text-slate-500">{new Date(event.created_at).toLocaleString()}</span></div>
                <p className="mt-1 text-slate-700">{event.reason}</p>
              </div>
            ))}
          </div>
        </details>
      </div>
    </details>
  )
}

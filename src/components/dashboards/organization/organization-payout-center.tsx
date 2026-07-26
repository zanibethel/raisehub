import OrganizationPayoutDashboardCard from './organization-payout-dashboard-card'
import {
  getOrganizationPayoutSnapshot,
  type OrganizationLedgerEntry,
} from '@/lib/payment-risk/organization-payout-repository'

function money(cents: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(Number(cents ?? 0) / 100)
}

function shortDate(value: string | null) {
  if (!value) return 'Not scheduled'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value))
}

function entryLabel(entry: OrganizationLedgerEntry) {
  const labels: Record<string, string> = {
    purchase_earning: 'Campaign earning',
    platform_fee: 'Platform fee',
    processing_fee: 'Processing fee',
    refund: 'Refund adjustment',
    dispute: 'Dispute adjustment',
    dispute_reversal: 'Dispute reversed',
    transfer: 'Transfer sent',
    transfer_reversal: 'Transfer reversed',
    reserve_hold: 'Rolling reserve held',
    reserve_release: 'Rolling reserve release',
    manual_adjustment: 'Manual adjustment',
    platform_loss: 'RaiseHub-absorbed loss',
  }
  return labels[entry.entry_type] ?? entry.entry_type.replaceAll('_', ' ')
}

function resolvePayoutState(snapshot: Awaited<ReturnType<typeof getOrganizationPayoutSnapshot>>) {
  const stripeReady = Boolean(
    snapshot.stripeAccount?.details_submitted &&
      snapshot.stripeAccount?.payouts_enabled &&
      snapshot.stripeAccount?.onboarding_status === 'enabled'
  )

  if (!stripeReady) {
    return {
      badge: 'Setup required',
      badgeClass: 'bg-amber-100 text-amber-900',
      title: 'Finish Stripe payout setup',
      body: 'Complete Stripe verification so RaiseHub can transfer eligible campaign earnings.',
    }
  }
  if (snapshot.policy.payouts_paused) {
    return {
      badge: 'Action required',
      badgeClass: 'bg-rose-100 text-rose-900',
      title: 'Payouts are temporarily paused',
      body: 'RaiseHub is reviewing this Organization. Your balance and history remain visible while payouts are paused.',
    }
  }
  if (snapshot.ledgerBalanceCents < 0 || snapshot.availableBalanceCents < 0) {
    return {
      badge: 'Action required',
      badgeClass: 'bg-rose-100 text-rose-900',
      title: 'Resolve the negative balance',
      body: 'Refunds or disputes currently exceed available earnings. Future earnings may first restore this balance.',
    }
  }
  if (snapshot.pendingTransferCents > 0) {
    return {
      badge: 'Processing',
      badgeClass: 'bg-blue-100 text-blue-900',
      title: 'Your payout is processing',
      body: 'RaiseHub submitted a transfer. The timeline below will update as Stripe processes it.',
    }
  }
  if (snapshot.availableBalanceCents > 0 && snapshot.policy.manual_payout_approval_required) {
    return {
      badge: 'Awaiting review',
      badgeClass: 'bg-amber-100 text-amber-900',
      title: 'Your eligible balance needs Owner approval',
      body: 'No action is required from you unless RaiseHub requests more information.',
    }
  }
  if (snapshot.availableBalanceCents > 0) {
    return {
      badge: 'Ready for payout',
      badgeClass: 'bg-emerald-100 text-emerald-900',
      title: 'Funds are eligible for payout',
      body: 'Your eligible balance is ready for the next RaiseHub payout run.',
    }
  }
  if (snapshot.heldFundsCents > 0 || snapshot.reserveBalanceCents > 0) {
    return {
      badge: 'Funds on hold',
      badgeClass: 'bg-amber-100 text-amber-900',
      title: 'Wait for the next release date',
      body: `Your next scheduled release is ${shortDate(snapshot.nextReleaseAt)}. Holds help protect the fundraiser from refunds and disputes.`,
    }
  }
  return {
    badge: 'Building balance',
    badgeClass: 'bg-slate-100 text-slate-800',
    title: 'Keep sharing your campaign',
    body: 'Eligible payout information will appear here after paid campaign purchases create Organization earnings.',
  }
}

export default async function OrganizationPayoutCenter({
  organizationId,
}: {
  organizationId: string | null
}) {
  if (!organizationId) return <OrganizationPayoutDashboardCard />

  const snapshot = await getOrganizationPayoutSnapshot(organizationId)
  const state = resolvePayoutState(snapshot)
  const availableAfterPending = snapshot.availableBalanceCents - snapshot.pendingTransferCents

  return (
    <details className="group/payout rounded-3xl border border-blue-100 bg-white shadow-lg">
      <summary className="cursor-pointer list-none p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-700">
              Payout Center
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-bold text-slate-950">Your Organization earnings</h2>
              <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${state.badgeClass}`}>
                {state.badge}
              </span>
            </div>
            <p className="mt-2 text-sm font-semibold text-slate-800">What should I do next?</p>
            <p className="mt-0.5 text-sm text-slate-600">{state.title}</p>
          </div>
          <span className="shrink-0 text-2xl font-bold text-slate-500 group-open/payout:hidden">+</span>
          <span className="hidden shrink-0 text-2xl font-bold text-slate-500 group-open/payout:inline">×</span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
          <div className="rounded-xl bg-emerald-50 p-3">
            <p className="text-xs text-emerald-800">Available</p>
            <p className="mt-1 font-bold text-emerald-950">{money(Math.max(availableAfterPending, 0))}</p>
          </div>
          <div className="rounded-xl bg-amber-50 p-3">
            <p className="text-xs text-amber-800">Held</p>
            <p className="mt-1 font-bold text-amber-950">{money(snapshot.heldFundsCents)}</p>
          </div>
          <div className="rounded-xl bg-blue-50 p-3">
            <p className="text-xs text-blue-800">Reserve</p>
            <p className="mt-1 font-bold text-blue-950">{money(snapshot.reserveBalanceCents)}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-xs text-slate-600">Processing</p>
            <p className="mt-1 font-bold text-slate-950">{money(snapshot.pendingTransferCents)}</p>
          </div>
        </div>
      </summary>

      <div className="space-y-5 border-t border-blue-100 p-4 sm:p-6">
        <section className={`rounded-2xl p-4 ${state.badgeClass}`}>
          <p className="text-xs font-bold uppercase tracking-wide">Next step</p>
          <h3 className="mt-1 text-lg font-bold">{state.title}</h3>
          <p className="mt-1 text-sm leading-6">{state.body}</p>
        </section>

        <OrganizationPayoutDashboardCard />

        <section>
          <h3 className="font-bold text-slate-950">Balance details</h3>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
            {[
              ['Ledger balance', money(snapshot.ledgerBalanceCents)],
              ['Available now', money(snapshot.availableBalanceCents)],
              ['Pending transfers', money(snapshot.pendingTransferCents)],
              ['Completed transfers', money(snapshot.completedTransferCents)],
              ['Refund adjustments', money(snapshot.refundTotalCents)],
              ['Dispute adjustments', money(snapshot.disputeTotalCents)],
              ['Next release', shortDate(snapshot.nextReleaseAt)],
              ['Stripe payouts', snapshot.stripeAccount?.payouts_enabled ? 'Enabled' : 'Not ready'],
            ].map(([label, value]) => (
              <div key={label} className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-[11px] font-semibold uppercase leading-4 tracking-wide text-slate-500">{label}</p>
                <p className="mt-1 break-words text-sm font-bold text-slate-950">{value}</p>
              </div>
            ))}
          </div>
        </section>

        <details className="group/policy rounded-2xl border border-slate-200">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4">
            <div>
              <h3 className="font-bold text-slate-950">Your payout policy</h3>
              <p className="text-sm text-slate-600">Read-only rules currently applied to this Organization</p>
            </div>
            <span className="font-bold text-slate-500 group-open/policy:hidden">+</span>
            <span className="hidden font-bold text-slate-500 group-open/policy:inline">×</span>
          </summary>
          <div className="grid grid-cols-2 gap-2 border-t border-slate-200 p-3 sm:grid-cols-4">
            {[
              ['Standard hold', `${snapshot.policy.standard_hold_days} days`],
              ['First payout hold', `${snapshot.policy.first_payout_hold_days} days`],
              ['Rolling reserve', `${snapshot.policy.reserve_percent_bps / 100}%`],
              ['Reserve release', `${snapshot.policy.reserve_days} days`],
              ['Payouts paused', snapshot.policy.payouts_paused ? 'Yes' : 'No'],
              ['Manual approval', snapshot.policy.manual_payout_approval_required ? 'Required' : 'Not required'],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl bg-slate-50 p-3">
                <p className="text-[11px] font-semibold uppercase leading-4 text-slate-500">{label}</p>
                <p className="mt-1 text-sm font-bold text-slate-950">{value}</p>
              </div>
            ))}
          </div>
        </details>

        <details className="group/activity rounded-2xl border border-slate-200">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4">
            <div>
              <h3 className="font-bold text-slate-950">Earnings activity</h3>
              <p className="text-sm text-slate-600">Recent earnings, holds, refunds, disputes, and releases</p>
            </div>
            <span className="font-bold text-slate-500 group-open/activity:hidden">+</span>
            <span className="hidden font-bold text-slate-500 group-open/activity:inline">×</span>
          </summary>
          <div className="space-y-2 border-t border-slate-200 p-3">
            {snapshot.recentLedgerEntries.length === 0 ? (
              <p className="p-2 text-sm text-slate-600">No earnings activity has been recorded yet.</p>
            ) : (
              snapshot.recentLedgerEntries.map((entry) => (
                <div key={entry.id} className="flex items-start justify-between gap-3 rounded-xl bg-slate-50 p-3 text-sm">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-950">{entryLabel(entry)}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {shortDate(entry.created_at)}
                      {entry.available_on ? ` · Available ${shortDate(entry.available_on)}` : ''}
                    </p>
                  </div>
                  <p className={`shrink-0 font-bold ${entry.amount_cents < 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                    {entry.amount_cents > 0 ? '+' : ''}{money(entry.amount_cents)}
                  </p>
                </div>
              ))
            )}
          </div>
        </details>

        <details className="group/history rounded-2xl border border-slate-200">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4">
            <div>
              <h3 className="font-bold text-slate-950">Payout history</h3>
              <p className="text-sm text-slate-600">RaiseHub transfers and connected-account bank payouts</p>
            </div>
            <span className="font-bold text-slate-500 group-open/history:hidden">+</span>
            <span className="hidden font-bold text-slate-500 group-open/history:inline">×</span>
          </summary>
          <div className="space-y-3 border-t border-slate-200 p-3">
            {snapshot.recentTransfers.length === 0 && snapshot.recentPayoutEvents.length === 0 ? (
              <p className="p-2 text-sm text-slate-600">No payout history is available yet.</p>
            ) : null}
            {snapshot.recentTransfers.map((transfer) => (
              <div key={transfer.id} className="rounded-xl bg-slate-50 p-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-slate-950">RaiseHub transfer</p>
                  <p className="font-bold text-slate-950">{money(transfer.amount_cents, transfer.currency)}</p>
                </div>
                <p className="mt-1 text-xs capitalize text-slate-600">{transfer.status} · {shortDate(transfer.completed_at ?? transfer.initiated_at ?? transfer.created_at)}</p>
                {transfer.failure_message ? <p className="mt-2 text-xs text-rose-700">{transfer.failure_message}</p> : null}
              </div>
            ))}
            {snapshot.recentPayoutEvents.map((payout) => (
              <div key={payout.id} className="rounded-xl bg-blue-50 p-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-slate-950">Stripe bank payout</p>
                  <p className="font-bold text-slate-950">{money(payout.amount_cents, payout.currency)}</p>
                </div>
                <p className="mt-1 text-xs capitalize text-slate-600">{payout.status} · Arrival {shortDate(payout.arrival_date)}</p>
                {payout.failure_message ? <p className="mt-2 text-xs text-rose-700">{payout.failure_message}</p> : null}
              </div>
            ))}
          </div>
        </details>
      </div>
    </details>
  )
}

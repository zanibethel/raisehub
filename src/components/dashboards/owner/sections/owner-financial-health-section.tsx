import OwnerPaymentRiskControls from './owner-payment-risk-controls'
import { getOwnerPaymentRiskSnapshot } from '@/lib/payment-risk/owner-payment-risk-repository'

function money(cents: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(Number(cents ?? 0) / 100)
}

const fieldLabels: Record<string, string> = {
  standard_hold_days: 'Standard payout hold',
  first_payout_hold_days: 'First-payout hold',
  reserve_percent_bps: 'Rolling reserve',
  reserve_days: 'Reserve release window',
  minimum_loss_tolerance_cents: 'Minimum loss tolerance',
  lifetime_payout_tolerance_bps: 'Lifetime payout tolerance',
  pattern_count_threshold: 'Return/dispute count threshold',
  pattern_rate_threshold_bps: 'Return/dispute rate threshold',
  payouts_paused: 'Payouts paused',
  manual_payout_approval_required: 'Manual payout approval',
}

function formatAuditValue(key: string, value: unknown) {
  if (value === null || value === undefined || value === '') return 'Inherited / not set'
  if (typeof value === 'boolean') return value ? 'On' : 'Off'
  if (key === 'minimum_loss_tolerance_cents') return money(Number(value))
  if (key.endsWith('_bps')) return `${Number(value) / 100}%`
  if (key.endsWith('_days')) return `${value} days`
  return String(value)
}

function changedFields(previousValue: unknown, newValue: unknown) {
  const previous =
    previousValue && typeof previousValue === 'object'
      ? (previousValue as Record<string, unknown>)
      : {}
  const next =
    newValue && typeof newValue === 'object'
      ? (newValue as Record<string, unknown>)
      : {}

  return Array.from(new Set([...Object.keys(previous), ...Object.keys(next)]))
    .filter((key) => key in fieldLabels)
    .filter((key) => JSON.stringify(previous[key]) !== JSON.stringify(next[key]))
    .map((key) => ({
      key,
      label: fieldLabels[key] ?? key.replaceAll('_', ' '),
      before: formatAuditValue(key, previous[key]),
      after: formatAuditValue(key, next[key]),
    }))
}

function actionLabel(actionType: string) {
  const labels: Record<string, string> = {
    global_policy_updated: 'Global policy updated',
    organization_override_updated: 'Organization override updated',
    organization_override_reset: 'Organization override reset',
  }

  return labels[actionType] ?? actionType.replaceAll('_', ' ')
}

function MetricGroup({
  title,
  metrics,
}: {
  title: string
  metrics: Array<[string, string]>
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-slate-50/60 p-3 sm:p-4">
      <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-slate-600">
        {title}
      </h3>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:gap-3">
        {metrics.map(([label, value]) => (
          <div key={label} className="min-w-0 rounded-xl bg-white p-3 shadow-sm">
            <p className="text-[11px] font-semibold uppercase leading-4 tracking-wide text-slate-500">
              {label}
            </p>
            <p className="mt-1 break-words text-base font-bold text-slate-950 sm:text-lg">
              {value}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}

export default async function OwnerFinancialHealthSection() {
  const snapshot = await getOwnerPaymentRiskSnapshot()
  const { health } = snapshot
  const organizationNames = new Map(
    snapshot.organizations.map((organization) => [organization.id, organization.name])
  )
  const attentionCount =
    Number(health.negative_organization_count ?? 0) +
    Number(health.threshold_organization_count ?? 0) +
    Number(health.manual_review_count ?? 0)
  const status =
    health.open_dispute_count > 0 || attentionCount > 0
      ? 'Needs attention'
      : 'Healthy'

  const metricGroups: Array<{
    title: string
    metrics: Array<[string, string]>
  }> = [
    {
      title: 'Payout readiness',
      metrics: [
        ['Funds held', money(health.held_cents)],
        ['Rolling reserve', money(health.reserve_cents)],
        ['Eligible payout', money(health.eligible_cents)],
        ['Upcoming releases', money(health.upcoming_reserve_release_cents)],
      ],
    },
    {
      title: 'Refunds and disputes',
      metrics: [
        ['Refunds', money(health.refund_cents)],
        ['Open disputes', `${health.open_dispute_count} · ${money(health.open_dispute_cents)}`],
        ['Lost disputes', money(health.lost_dispute_cents)],
        ['Platform losses', money(health.platform_loss_cents)],
      ],
    },
    {
      title: 'Organization risk',
      metrics: [
        ['Negative balances', String(health.negative_organization_count)],
        ['Over thresholds', String(health.threshold_organization_count)],
        ['Manual review', String(health.manual_review_count)],
      ],
    },
  ]

  return (
    <details className="group rounded-3xl border border-slate-200 bg-white shadow-sm">
      <summary className="cursor-pointer list-none p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-700">
              Financial Health
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-bold text-slate-950">
                Payment risk and payout readiness
              </h2>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                  status === 'Healthy'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-900'
                }`}
              >
                {status}
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-600">
              {attentionCount} organizations need attention
            </p>
          </div>
          <span className="shrink-0 text-2xl font-bold text-slate-500 transition group-open:rotate-45">
            +
          </span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-xs text-slate-600">Held funds</p>
            <p className="mt-1 font-bold text-slate-950">{money(health.held_cents)}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-xs text-slate-600">Eligible payout</p>
            <p className="mt-1 font-bold text-slate-950">{money(health.eligible_cents)}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-xs text-slate-600">Open disputes</p>
            <p className="mt-1 font-bold text-slate-950">{health.open_dispute_count}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-xs text-slate-600">Needs attention</p>
            <p className="mt-1 font-bold text-slate-950">{attentionCount}</p>
          </div>
        </div>
      </summary>

      <div className="space-y-5 border-t border-slate-200 p-4 sm:p-6">
        <div className="space-y-3">
          {metricGroups.map((group) => (
            <MetricGroup key={group.title} title={group.title} metrics={group.metrics} />
          ))}
        </div>

        <OwnerPaymentRiskControls
          policy={snapshot.policy}
          organizations={snapshot.organizations}
        />

        <details className="group/audit-history rounded-2xl border border-slate-200">
          <summary className="flex cursor-pointer list-none items-center justify-between p-4">
            <div>
              <h4 className="font-bold text-slate-950">Immutable audit history</h4>
              <p className="text-sm text-slate-600">
                Most recent 25 payment-risk actions with expandable diffs
              </p>
            </div>
            <span className="text-xl font-bold text-slate-500 transition group-open/audit-history:rotate-45">
              +
            </span>
          </summary>
          <div className="space-y-3 border-t border-slate-200 p-3 sm:p-4">
            {snapshot.auditEvents.length === 0 ? (
              <p className="text-sm text-slate-600">
                No policy changes have been recorded yet.
              </p>
            ) : (
              snapshot.auditEvents.map((event: any) => {
                const changes = changedFields(event.previous_value, event.new_value)
                const organizationName = event.organization_id
                  ? organizationNames.get(event.organization_id) ?? 'Unknown organization'
                  : null
                const summary =
                  changes.length === 1
                    ? `${changes[0].label}: ${changes[0].before} → ${changes[0].after}`
                    : `${changes.length} policy fields changed`

                return (
                  <details
                    key={event.id}
                    className="group/audit rounded-xl border border-slate-200 bg-slate-50"
                  >
                    <summary className="cursor-pointer list-none p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <strong className="block capitalize text-slate-950">
                            {actionLabel(String(event.action_type))}
                          </strong>
                          {organizationName ? (
                            <p className="mt-0.5 text-xs font-semibold text-blue-700">
                              {organizationName}
                            </p>
                          ) : null}
                          <p className="mt-1 break-words text-sm text-slate-700">
                            {changes.length > 0 ? summary : event.reason}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <span className="text-xs text-slate-500">
                            {new Date(event.created_at).toLocaleString()}
                          </span>
                          <span className="font-bold text-slate-500 transition group-open/audit:rotate-45">
                            +
                          </span>
                        </div>
                      </div>
                    </summary>

                    <div className="space-y-3 border-t border-slate-200 p-3">
                      {changes.length > 0 ? (
                        <div className="space-y-2">
                          {changes.map((change) => (
                            <div key={change.key} className="rounded-lg bg-white p-3">
                              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                                {change.label}
                              </p>
                              <div className="mt-2 grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-sm">
                                <span className="min-w-0 break-words rounded-md bg-rose-50 px-2 py-1.5 text-rose-900">
                                  {change.before}
                                </span>
                                <span aria-hidden="true" className="text-slate-400">→</span>
                                <span className="min-w-0 break-words rounded-md bg-emerald-50 px-2 py-1.5 text-emerald-900">
                                  {change.after}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-slate-600">
                          No field-level difference is available for this action.
                        </p>
                      )}

                      <dl className="grid gap-2 text-sm sm:grid-cols-2">
                        <div>
                          <dt className="font-semibold text-slate-500">Reason</dt>
                          <dd className="mt-0.5 text-slate-800">{event.reason}</dd>
                        </div>
                        <div>
                          <dt className="font-semibold text-slate-500">Actor profile</dt>
                          <dd className="mt-0.5 break-all text-slate-800">
                            {event.actor_profile_id}
                          </dd>
                        </div>
                        {event.related_resource_type || event.related_resource_id ? (
                          <div className="sm:col-span-2">
                            <dt className="font-semibold text-slate-500">Related record</dt>
                            <dd className="mt-0.5 break-all text-slate-800">
                              {[event.related_resource_type, event.related_resource_id]
                                .filter(Boolean)
                                .join(' · ')}
                            </dd>
                          </div>
                        ) : null}
                      </dl>
                    </div>
                  </details>
                )
              })
            )}
          </div>
        </details>
      </div>
    </details>
  )
}

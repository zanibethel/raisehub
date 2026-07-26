'use client'

import { useActionState, useMemo, useState } from 'react'

import {
  resetOrganizationPaymentRiskOverride,
  updateGlobalPaymentRiskPolicy,
  upsertOrganizationPaymentRiskOverride,
} from '@/app/dashboard/actions/owner-payment-risk-actions'
import type {
  OrganizationRiskRow,
  PaymentRiskPolicy,
} from '@/lib/payment-risk/owner-payment-risk-repository'

const initialState = { ok: false, message: '' }

function Field({ label, name, defaultValue, help, min = 0, max }: {
  label: string
  name: string
  defaultValue?: number | string
  help: string
  min?: number
  max?: number
}) {
  return (
    <label className="block min-w-0 rounded-2xl border border-slate-200 bg-slate-50 p-3">
      <span className="block text-sm font-bold leading-5 text-slate-950">{label}</span>
      <input
        name={name}
        type="number"
        min={min}
        max={max}
        defaultValue={defaultValue}
        className="mt-2 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
      />
      <span className="mt-1 block text-xs leading-4 text-slate-600">{help}</span>
    </label>
  )
}

function Result({ state }: { state: typeof initialState }) {
  if (!state.message) return null
  return (
    <p className={`rounded-xl px-3 py-2 text-sm font-semibold ${state.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`}>
      {state.message}
    </p>
  )
}

export default function OwnerPaymentRiskControls({
  policy,
  organizations,
}: {
  policy: PaymentRiskPolicy
  organizations: OrganizationRiskRow[]
}) {
  const [globalState, globalAction, globalPending] = useActionState(updateGlobalPaymentRiskPolicy, initialState)
  const [overrideState, overrideAction, overridePending] = useActionState(upsertOrganizationPaymentRiskOverride, initialState)
  const [resetState, resetAction, resetPending] = useActionState(resetOrganizationPaymentRiskOverride, initialState)
  const [organizationId, setOrganizationId] = useState(organizations[0]?.id ?? '')

  const selected = useMemo(
    () => organizations.find((organization) => organization.id === organizationId) ?? null,
    [organizationId, organizations]
  )
  const override = (selected?.override ?? {}) as Record<string, any>

  return (
    <div className="space-y-4">
      <details className="group/global rounded-2xl border border-slate-200 bg-white">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-4">
          <div>
            <h4 className="font-bold text-slate-950">Global payment-risk policy</h4>
            <p className="mt-1 text-sm text-slate-600">Future payout eligibility uses these defaults. Historical ledger entries never change.</p>
          </div>
          <span className="text-xl font-bold text-slate-500 transition group-open/global:rotate-45">+</span>
        </summary>
        <form action={globalAction} className="space-y-4 border-t border-slate-200 p-4">
          <input type="hidden" name="request_id" value={crypto.randomUUID()} />
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            <Field label="Standard payout hold days" name="standard_hold_days" defaultValue={policy.standard_hold_days} max={90} help="New earnings wait this many days before becoming eligible." />
            <Field label="First-payout hold days" name="first_payout_hold_days" defaultValue={policy.first_payout_hold_days} max={90} help="Extra review window before an organization's first payout." />
            <Field label="Rolling reserve basis points" name="reserve_percent_bps" defaultValue={policy.reserve_percent_bps} max={10000} help="500 means 5%. This amount remains reserved against future losses." />
            <Field label="Reserve release days" name="reserve_days" defaultValue={policy.reserve_days} max={365} help="Reserved funds release after this many days when no loss blocks them." />
            <Field label="Minimum loss tolerance in cents" name="minimum_loss_tolerance_cents" defaultValue={policy.minimum_loss_tolerance_cents} max={100000000} help="5000 means $50. RaiseHub may absorb losses up to this floor." />
            <Field label="Lifetime payout tolerance basis points" name="lifetime_payout_tolerance_bps" defaultValue={policy.lifetime_payout_tolerance_bps} max={10000} help="100 means 1% of completed lifetime payouts." />
            <Field label="Return/dispute count threshold" name="pattern_count_threshold" defaultValue={policy.pattern_count_threshold} min={1} max={1000} help="Organizations reaching this count require attention." />
            <Field label="Return/dispute rate basis points" name="pattern_rate_threshold_bps" defaultValue={policy.pattern_rate_threshold_bps} max={10000} help="200 means a 2% return or dispute rate." />
          </div>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
            Saving changes affects future holds, reserves, and review signals only. Lower reserves or shorter holds can increase platform loss exposure.
          </div>
          <label className="block text-sm font-semibold text-slate-800">
            Reason
            <textarea name="reason" required minLength={8} maxLength={500} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" />
          </label>
          <label className="block text-sm font-semibold text-slate-800">
            Type CONFIRM
            <input name="confirmation" required className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" />
          </label>
          <Result state={globalState} />
          <button disabled={globalPending} className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
            {globalPending ? 'Saving…' : 'Save global policy'}
          </button>
        </form>
      </details>

      <details className="group/overrides rounded-2xl border border-slate-200 bg-white">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-4">
          <div>
            <h4 className="font-bold text-slate-950">Organization overrides</h4>
            <p className="mt-1 text-sm text-slate-600">Blank values inherit platform defaults. Overrides remain visible and audited.</p>
          </div>
          <span className="text-xl font-bold text-slate-500 transition group-open/overrides:rotate-45">+</span>
        </summary>
        <div className="space-y-4 border-t border-slate-200 p-4">
          <label className="block text-sm font-semibold text-slate-800">
            Organization
            <select value={organizationId} onChange={(event) => setOrganizationId(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2">
              {organizations.map((organization) => <option key={organization.id} value={organization.id}>{organization.name}</option>)}
            </select>
          </label>

          {selected ? (
            <>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl bg-slate-100 p-3 text-sm"><strong>Platform default</strong><br />{policy.standard_hold_days}d hold · {policy.reserve_percent_bps / 100}% reserve</div>
                <div className="rounded-xl bg-blue-50 p-3 text-sm"><strong>Organization override</strong><br />{selected.override ? 'Custom values active' : 'None'}</div>
                <div className="rounded-xl bg-emerald-50 p-3 text-sm"><strong>Effective policy</strong><br />{override.standard_hold_days ?? policy.standard_hold_days}d hold · {(override.reserve_percent_bps ?? policy.reserve_percent_bps) / 100}% reserve</div>
              </div>

              <form action={overrideAction} className="space-y-4">
                <input type="hidden" name="organization_id" value={selected.id} />
                <input type="hidden" name="request_id" value={crypto.randomUUID()} />
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  <Field label="Custom payout hold days" name="standard_hold_days" defaultValue={override.standard_hold_days ?? ''} max={90} help={`Blank uses ${policy.standard_hold_days} days.`} />
                  <Field label="Custom first-payout hold days" name="first_payout_hold_days" defaultValue={override.first_payout_hold_days ?? ''} max={90} help={`Blank uses ${policy.first_payout_hold_days} days.`} />
                  <Field label="Custom reserve basis points" name="reserve_percent_bps" defaultValue={override.reserve_percent_bps ?? ''} max={10000} help={`Blank uses ${policy.reserve_percent_bps} basis points.`} />
                  <Field label="Custom reserve release days" name="reserve_days" defaultValue={override.reserve_days ?? ''} max={365} help={`Blank uses ${policy.reserve_days} days.`} />
                  <Field label="Custom loss tolerance cents" name="minimum_loss_tolerance_cents" defaultValue={override.minimum_loss_tolerance_cents ?? ''} max={100000000} help={`Blank uses ${policy.minimum_loss_tolerance_cents} cents.`} />
                  <Field label="Custom lifetime tolerance basis points" name="lifetime_payout_tolerance_bps" defaultValue={override.lifetime_payout_tolerance_bps ?? ''} max={10000} help={`Blank uses ${policy.lifetime_payout_tolerance_bps} basis points.`} />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 text-sm font-semibold"><input type="checkbox" name="payouts_paused" defaultChecked={Boolean(override.payouts_paused)} /> Pause payouts</label>
                  <label className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 text-sm font-semibold"><input type="checkbox" name="manual_payout_approval_required" defaultChecked={Boolean(override.manual_payout_approval_required)} /> Require manual payout approval</label>
                  <label className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold sm:col-span-2"><input type="checkbox" name="lowering_protection" /> This change lowers a hold, reserve, or tolerance protection</label>
                </div>
                <textarea name="reason" required minLength={8} maxLength={500} placeholder="Reason for override" className="w-full rounded-xl border border-slate-300 px-3 py-2" />
                <input name="confirmation" placeholder="Type CONFIRM for high-impact changes" className="w-full rounded-xl border border-slate-300 px-3 py-2" />
                <Result state={overrideState} />
                <button disabled={overridePending} className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{overridePending ? 'Saving…' : 'Save organization override'}</button>
              </form>

              {selected.override ? (
                <form action={resetAction} className="space-y-3 rounded-2xl border border-rose-200 bg-rose-50 p-4">
                  <input type="hidden" name="organization_id" value={selected.id} />
                  <input type="hidden" name="request_id" value={crypto.randomUUID()} />
                  <p className="text-sm font-bold text-rose-950">Reset to platform defaults</p>
                  <textarea name="reason" required minLength={8} maxLength={500} placeholder="Reason for reset" className="w-full rounded-xl border border-rose-300 px-3 py-2" />
                  <input name="confirmation" required placeholder="Type RESET" className="w-full rounded-xl border border-rose-300 px-3 py-2" />
                  <Result state={resetState} />
                  <button disabled={resetPending} className="rounded-xl bg-rose-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{resetPending ? 'Resetting…' : 'Reset override'}</button>
                </form>
              ) : null}
            </>
          ) : <p className="text-sm text-slate-600">No organizations are available.</p>}
        </div>
      </details>
    </div>
  )
}

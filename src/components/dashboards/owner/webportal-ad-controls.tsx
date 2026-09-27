'use client'

import { useActionState } from 'react'

import {
  approveWebPortalAd,
  deactivateWebPortalAd,
  initialWebPortalAdActionState,
  rejectWebPortalAd,
} from '@/app/dashboard/actions/webportal-ad-actions'

function Result({
  state,
}: {
  state: typeof initialWebPortalAdActionState
}) {
  if (!state.message) return null

  return (
    <p
      className={
        state.ok
          ? 'rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800'
          : 'rounded-xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-800'
      }
    >
      {state.message}
    </p>
  )
}

export default function WebPortalAdControls({
  orderId,
  status,
  recurring,
}: {
  orderId: string
  status: string
  recurring: boolean
}) {
  const [approveState, approveAction, approvePending] = useActionState(
    approveWebPortalAd,
    initialWebPortalAdActionState
  )
  const [rejectState, rejectAction, rejectPending] = useActionState(
    rejectWebPortalAd,
    initialWebPortalAdActionState
  )
  const [deactivateState, deactivateAction, deactivatePending] = useActionState(
    deactivateWebPortalAd,
    initialWebPortalAdActionState
  )

  if (status === 'paid_pending_review') {
    return (
      <div className="space-y-3">
        <form action={approveAction} className="space-y-2">
          <input type="hidden" name="order_id" value={orderId} />
          <textarea
            name="reason"
            maxLength={500}
            rows={2}
            placeholder="Optional approval note"
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
          />
          <Result state={approveState} />
          <button
            disabled={approvePending}
            className="min-h-11 w-full rounded-xl bg-emerald-700 px-4 py-2 text-sm font-black text-white disabled:opacity-50"
          >
            {approvePending ? 'Activating…' : 'Approve & activate'}
          </button>
        </form>

        <details className="rounded-xl border border-rose-200 bg-rose-50">
          <summary className="cursor-pointer list-none px-3 py-3 text-sm font-black text-rose-800">
            Reject ad
          </summary>
          <form action={rejectAction} className="space-y-2 border-t border-rose-200 p-3">
            <input type="hidden" name="order_id" value={orderId} />
            <textarea
              name="reason"
              required
              minLength={3}
              maxLength={500}
              rows={3}
              placeholder="Reason for rejection"
              className="w-full rounded-xl border border-rose-300 bg-white px-3 py-2 text-sm"
            />
            <p className="text-xs leading-5 text-rose-800">
              One-time payments are refunded automatically when a captured payment intent is available.
              {recurring
                ? ' Recurring billing is canceled automatically.'
                : ''}
            </p>
            <Result state={rejectState} />
            <button
              disabled={rejectPending}
              className="min-h-11 w-full rounded-xl bg-rose-700 px-4 py-2 text-sm font-black text-white disabled:opacity-50"
            >
              {rejectPending ? 'Rejecting…' : 'Reject ad'}
            </button>
          </form>
        </details>
      </div>
    )
  }

  if (status === 'active') {
    return (
      <details className="rounded-xl border border-slate-200 bg-slate-50">
        <summary className="cursor-pointer list-none px-3 py-3 text-sm font-black text-slate-800">
          Deactivate
        </summary>
        <form action={deactivateAction} className="space-y-2 border-t border-slate-200 p-3">
          <input type="hidden" name="order_id" value={orderId} />
          <textarea
            name="reason"
            required
            minLength={3}
            maxLength={500}
            rows={3}
            placeholder="Reason for deactivation"
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
          />
          {recurring ? (
            <p className="text-xs leading-5 text-slate-600">
              Deactivating this recurring ad also cancels future monthly billing.
            </p>
          ) : null}
          <Result state={deactivateState} />
          <button
            disabled={deactivatePending}
            className="min-h-11 w-full rounded-xl bg-slate-950 px-4 py-2 text-sm font-black text-white disabled:opacity-50"
          >
            {deactivatePending ? 'Deactivating…' : 'Deactivate ad'}
          </button>
        </form>
      </details>
    )
  }

  return null
}

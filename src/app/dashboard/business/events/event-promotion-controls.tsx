'use client'

import { useEffect, useMemo, useState } from 'react'

import {
  getEventPromotionEventStateAction,
  redeemEventPromotionWithPartnerPointsAction,
  startPaidEventPromotionAction,
} from './actions'
import type {
  EventPromotionEventState,
  EventPromotionFundingSource,
} from '@/lib/types/event-promotion'

function formatMoney(cents: number, currency = 'usd') {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(cents / 100)
}

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Date unavailable'
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function sourceLabel(source: EventPromotionFundingSource) {
  return source === 'partner_points'
    ? 'Featured Local Event'
    : 'Sponsored Local Event'
}

function purchaseStatusLabel(status: string) {
  if (status === 'simulated') return 'Demo completed'
  if (status === 'paid') return 'Paid & active'
  if (status === 'open') return 'Checkout open'
  if (status === 'created') return 'Preparing checkout'
  if (status === 'failed') return 'Payment failed'
  if (status === 'expired') return 'Checkout expired'
  if (status === 'canceled') return 'Canceled'
  return status
}

export default function EventPromotionControls({
  businessId,
  eventId,
  isPublished,
}: {
  businessId: string
  eventId: string
  isPublished: boolean
}) {
  const [state, setState] = useState<EventPromotionEventState | null>(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [selectedDuration, setSelectedDuration] = useState<number | null>(null)

  async function refresh() {
    const next = await getEventPromotionEventStateAction(businessId, eventId)
    setState(next)
    setLoading(false)
    if (next && selectedDuration === null) {
      setSelectedDuration(
        next.defaultPaidDurationDays ?? next.priceOptions[0]?.durationDays ?? null
      )
    }
  }

  useEffect(() => {
    void refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId, eventId])

  const selectedPrice = useMemo(
    () =>
      state?.priceOptions.find(
        (option) => option.durationDays === selectedDuration
      ) ?? null,
    [selectedDuration, state]
  )

  async function usePartnerPoints() {
    if (busy) return
    setBusy(true)
    setMessage('')
    const result = await redeemEventPromotionWithPartnerPointsAction(
      businessId,
      eventId
    )

    if (result.success) {
      setMessage(result.message)
      await refresh()
      setExpanded(false)
    } else {
      setMessage(result.error)
    }
    setBusy(false)
  }

  async function payToPromote() {
    if (busy || !selectedDuration) return
    setBusy(true)
    setMessage('')

    const result = await startPaidEventPromotionAction({
      businessId,
      eventId,
      durationDays: selectedDuration,
    })

    if (result.status === 'checkout-ready') {
      window.location.href = result.url
      return
    }

    if (result.status === 'demo-complete') {
      setMessage(result.message)
      await refresh()
      setExpanded(false)
    } else {
      setMessage(result.message)
    }

    setBusy(false)
  }

  if (!isPublished) {
    return (
      <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-500">
        Publish this event to unlock Event Promotion.
      </div>
    )
  }

  if (loading) {
    return (
      <div className="mt-4 rounded-xl bg-slate-50 px-3 py-2 text-xs font-bold text-slate-500">
        Loading promotion options…
      </div>
    )
  }

  if (!state) {
    return (
      <div className="mt-4 rounded-xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">
        Promotion status could not be loaded.
      </div>
    )
  }

  if (state.activePromotion) {
    return (
      <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="rounded-full bg-amber-400 px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-slate-950">
            {sourceLabel(state.activePromotion.source)}
          </span>
          <span className="text-xs font-bold text-amber-900">
            Active until {formatDate(state.activePromotion.endsAt)}
          </span>
        </div>
        <p className="mt-2 text-xs leading-5 text-slate-600">
          This event is already promoted, so RaiseHub will not sell or redeem a
          duplicate promotion while it is active.
        </p>
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="mt-2 text-xs font-black text-blue-700"
        >
          {expanded ? 'Hide promotion history' : 'View promotion history'}
        </button>
        {expanded ? <PromotionHistory state={state} /> : null}
        {message ? (
          <p className="mt-2 text-xs font-bold text-slate-700">{message}</p>
        ) : null}
      </div>
    )
  }

  const paidUnavailable =
    !state.paidEnabled ||
    state.priceOptions.length === 0 ||
    state.stripeMode === 'unconfigured' ||
    state.stripeMode === 'live-disabled'

  return (
    <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-blue-700">
            Event Promotion
          </p>
          <p className="mt-0.5 text-xs text-slate-600">
            Feature this exact published event.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="rounded-xl bg-slate-950 px-3 py-2 text-xs font-black text-white"
        >
          {expanded ? 'Close' : 'Promote Event'}
        </button>
      </div>

      {expanded ? (
        <div className="mt-3 space-y-3 border-t border-slate-200 pt-3">
          {state.partnerPointsEnabled ? (
            <div className="rounded-xl border border-green-200 bg-white p-3">
              <p className="text-sm font-black text-slate-950">
                Use Partner Points
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-600">
                {state.partnerPointCost.toLocaleString()} points · up to{' '}
                {state.partnerPointDurationDays} days · displays as Featured
                Local Event.
              </p>
              <button
                type="button"
                disabled={busy}
                onClick={() => void usePartnerPoints()}
                className="mt-2 min-h-10 w-full rounded-xl bg-green-700 px-3 text-xs font-black text-white disabled:opacity-60"
              >
                {busy
                  ? 'Working…'
                  : `Use ${state.partnerPointCost.toLocaleString()} Partner Points`}
              </button>
            </div>
          ) : null}

          {state.paidEnabled ? (
            <div className="rounded-xl border border-blue-200 bg-white p-3">
              <p className="text-sm font-black text-slate-950">
                Pay to Promote
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-600">
                Choose an Owner-managed duration. Paid placements display as
                Sponsored Local Event.
              </p>

              {state.priceOptions.length ? (
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {state.priceOptions.map((option) => (
                    <button
                      key={option.durationDays}
                      type="button"
                      onClick={() => setSelectedDuration(option.durationDays)}
                      className={`rounded-xl border px-2 py-2 text-xs font-black ${
                        selectedDuration === option.durationDays
                          ? 'border-blue-600 bg-blue-50 text-blue-800'
                          : 'border-slate-200 text-slate-700'
                      }`}
                    >
                      <span className="block">{option.durationDays} days</span>
                      <span className="mt-0.5 block">
                        {formatMoney(option.priceCents)}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-xs font-bold text-slate-500">
                  No paid durations are currently enabled.
                </p>
              )}

              <p className="mt-2 text-[11px] leading-4 text-slate-500">
                {state.stripeMode === 'demo'
                  ? 'Demo simulation only — no Stripe charge will be created.'
                  : state.stripeMode === 'test'
                    ? 'Stripe test checkout — no live charge will be created.'
                    : state.stripeMode === 'live'
                      ? 'Secure live Stripe Checkout. Promotion activates only after verified payment.'
                      : state.stripeMode === 'live-disabled'
                        ? 'Live charging is safety-locked until the Stripe live account is verified.'
                        : 'Stripe Checkout is not configured in this deployment.'}
              </p>

              <button
                type="button"
                disabled={busy || paidUnavailable || !selectedPrice}
                onClick={() => void payToPromote()}
                className="mt-2 min-h-10 w-full rounded-xl bg-blue-700 px-3 text-xs font-black text-white disabled:bg-slate-300 disabled:text-slate-500"
              >
                {busy
                  ? 'Working…'
                  : state.stripeMode === 'demo'
                    ? `Simulate ${selectedPrice ? formatMoney(selectedPrice.priceCents) : ''} promotion`
                    : `Pay ${selectedPrice ? formatMoney(selectedPrice.priceCents) : ''} to Promote`}
              </button>
            </div>
          ) : null}

          {!state.partnerPointsEnabled && !state.paidEnabled ? (
            <p className="rounded-xl bg-white px-3 py-2 text-xs font-bold text-slate-500">
              Event Promotion is currently disabled by RaiseHub.
            </p>
          ) : null}

          <PromotionHistory state={state} />
        </div>
      ) : null}

      {message ? (
        <p className="mt-3 rounded-xl bg-white px-3 py-2 text-xs font-bold text-slate-700">
          {message}
        </p>
      ) : null}
    </div>
  )
}

function PromotionHistory({ state }: { state: EventPromotionEventState }) {
  if (!state.promotionHistory.length && !state.purchaseHistory.length) {
    return null
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <p className="text-xs font-black uppercase tracking-wide text-slate-500">
        Promotion history
      </p>

      {state.promotionHistory.length ? (
        <div className="mt-2 space-y-1.5">
          {state.promotionHistory.slice(0, 4).map((item) => (
            <div
              key={item.id}
              className="flex items-start justify-between gap-3 text-xs"
            >
              <span className="font-bold text-slate-700">
                {sourceLabel(item.source)}
              </span>
              <span className="text-right text-slate-500">
                {formatDate(item.startsAt)} → {formatDate(item.endsAt)}
              </span>
            </div>
          ))}
        </div>
      ) : null}

      {state.purchaseHistory.length ? (
        <div className="mt-3 border-t border-slate-100 pt-2">
          {state.purchaseHistory.slice(0, 4).map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-3 py-1 text-xs"
            >
              <span className="font-bold text-slate-600">
                {item.durationDays}d · {formatMoney(item.amountCents, item.currency)}
              </span>
              <span className="text-slate-500">
                {purchaseStatusLabel(item.status)}
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}

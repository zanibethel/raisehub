'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'

import {
  updateEventPromotionSettingsAction,
  type EventPromotionSettingsActionState,
} from '@/app/dashboard/owner/event-promotions/actions'
import type {
  EventPromotionOwnerOverview,
  EventPromotionPriceOption,
} from '@/lib/services/event-promotion-settings-service'

const INITIAL_STATE: EventPromotionSettingsActionState = {
  success: false,
  message: null,
}

function moneyFromCents(cents: number) {
  return (cents / 100).toFixed(2)
}

function optionByDuration(
  options: EventPromotionPriceOption[],
  duration: number
) {
  return options.find((option) => option.durationDays === duration)
}

function SaveButton() {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      className="min-h-12 rounded-xl bg-slate-950 px-5 text-sm font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? 'Saving…' : 'Save Event Promotion settings'}
    </button>
  )
}

export default function EventPromotionSettingsEditor({
  overview,
}: {
  overview: EventPromotionOwnerOverview
}) {
  const [state, formAction] = useActionState(
    updateEventPromotionSettingsAction,
    INITIAL_STATE
  )

  const durations = [3, 7, 14]
  const settings = overview.settings

  return (
    <form action={formAction} className="space-y-5">
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-700">
              Paid promotion
            </p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">
              Boost pricing
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              These are the business-facing fixed-price options. Demo can display
              the same choices, but demo workspaces must never create a real
              Stripe charge.
            </p>
          </div>

          <label className="flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-sm font-black text-slate-800">
            <input
              type="checkbox"
              name="paidEnabled"
              defaultChecked={settings.paidEnabled}
            />
            Paid boosts enabled
          </label>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {durations.map((duration) => {
            const option = optionByDuration(overview.priceOptions, duration)
            const fallback =
              duration === 3 ? 299 : duration === 7 ? 499 : 799

            return (
              <div
                key={duration}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-black text-slate-950">
                    {duration}-Day Boost
                  </p>
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-600">
                    <input
                      type="checkbox"
                      name={`enabled_${duration}`}
                      defaultChecked={option?.isEnabled ?? true}
                    />
                    Enabled
                  </label>
                </div>

                <label className="mt-4 block">
                  <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    Price
                  </span>
                  <div className="relative mt-1.5">
                    <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-500">
                      $
                    </span>
                    <input
                      name={`price_${duration}`}
                      type="number"
                      min="0.01"
                      max="1000"
                      step="0.01"
                      required
                      defaultValue={moneyFromCents(
                        option?.priceCents ?? fallback
                      )}
                      className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-7 pr-3 font-bold text-slate-950 outline-none focus:border-blue-500"
                    />
                  </div>
                </label>
              </div>
            )
          })}
        </div>

        <label className="mt-4 block max-w-sm">
          <span className="text-sm font-bold text-slate-700">
            Default paid boost
          </span>
          <select
            name="defaultPaidDurationDays"
            defaultValue={String(settings.defaultPaidDurationDays)}
            className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 font-bold text-slate-900"
          >
            {durations.map((duration) => (
              <option key={duration} value={duration}>
                {duration} days
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <p className="text-xs font-black uppercase tracking-[0.14em] text-amber-700">
          Partner Rewards
        </p>
        <h2 className="mt-1 text-2xl font-black text-slate-950">
          Partner Point promotion
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          This stays tied to the same Event Promotion experience. Changing the
          values here also updates the Partner Rewards marketplace item.
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-black text-slate-800">
            <input
              type="checkbox"
              name="partnerPointsEnabled"
              defaultChecked={settings.partnerPointsEnabled}
            />
            Partner Points enabled
          </label>

          <label className="block">
            <span className="text-sm font-bold text-slate-700">
              Point cost
            </span>
            <input
              name="partnerPointCost"
              type="number"
              min="1"
              max="100000"
              step="1"
              defaultValue={settings.partnerPointCost}
              className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 font-bold text-slate-950"
            />
          </label>

          <label className="block">
            <span className="text-sm font-bold text-slate-700">
              Promotion length
            </span>
            <div className="mt-2 flex items-center gap-2">
              <input
                name="partnerPointDurationDays"
                type="number"
                min="1"
                max="90"
                step="1"
                defaultValue={settings.partnerPointDurationDays}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 font-bold text-slate-950"
              />
              <span className="text-sm font-bold text-slate-500">days</span>
            </div>
          </label>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <p className="text-xs font-black uppercase tracking-[0.14em] text-green-700">
          Exposure
        </p>
        <h2 className="mt-1 text-2xl font-black text-slate-950">
          What Event Promotion includes
        </h2>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <label className="flex items-start gap-3 rounded-2xl border border-slate-200 p-4">
            <input
              type="checkbox"
              name="supporterSpotlightEnabled"
              defaultChecked={settings.supporterSpotlightEnabled}
              className="mt-1"
            />
            <span>
              <span className="block font-black text-slate-900">
                Supporter Spotlight
              </span>
              <span className="mt-1 block text-sm leading-5 text-slate-600">
                Show the promoted event as the frequency-capped Featured Local
                Event card after a supporter opens their dashboard.
              </span>
            </span>
          </label>

          <label className="flex items-start gap-3 rounded-2xl border border-slate-200 p-4">
            <input
              type="checkbox"
              name="localEventsFeaturedEnabled"
              defaultChecked={settings.localEventsFeaturedEnabled}
              className="mt-1"
            />
            <span>
              <span className="block font-black text-slate-900">
                Featured Local Events placement
              </span>
              <span className="mt-1 block text-sm leading-5 text-slate-600">
                Put active promoted events ahead of ordinary upcoming events in
                RaiseHub discovery.
              </span>
            </span>
          </label>
        </div>
      </section>

      {state.message ? (
        <p
          role="status"
          className={`rounded-2xl border p-4 text-sm font-bold ${
            state.success
              ? 'border-green-200 bg-green-50 text-green-800'
              : 'border-rose-200 bg-rose-50 text-rose-800'
          }`}
        >
          {state.message}
        </p>
      ) : null}

      <div className="flex justify-end">
        <SaveButton />
      </div>
    </form>
  )
}

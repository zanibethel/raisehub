'use client'

import { useActionState, useMemo, useState } from 'react'
import { useFormStatus } from 'react-dom'

import {
  publishPlatformPricingAction,
  type OwnerPricingEnvironment,
  type PublishPlatformPricingActionState,
} from './owner-pricing-actions'

// =============================================================================
// Types
// =============================================================================

type OwnerPricingEditorProps = {
  productionPassPrice: number
  productionFeePercent: number
  demoPassPrice: number
  demoFeePercent: number
}

// =============================================================================
// Constants
// =============================================================================

const INITIAL_STATE: PublishPlatformPricingActionState = {
  success: false,
  message: null,
  environment: null,
}

// =============================================================================
// Helpers
// =============================================================================

function normalizeNumber(value: string) {
  const parsed = Number(value)

  return Number.isFinite(parsed)
    ? parsed
    : 0
}

function formatMoney(value: number) {
  return `$${value.toFixed(2)}`
}

function SubmitButton({
  environment,
}: {
  environment: OwnerPricingEnvironment
}) {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending
        ? 'Publishing...'
        : `Publish ${
            environment === 'production'
              ? 'Production'
              : 'Demo'
          } Default`}
    </button>
  )
}

// =============================================================================
// Component
// =============================================================================

export default function OwnerPricingEditor({
  productionPassPrice,
  productionFeePercent,
  demoPassPrice,
  demoFeePercent,
}: OwnerPricingEditorProps) {
  const [state, formAction] = useActionState(
    publishPlatformPricingAction,
    INITIAL_STATE
  )

  const [environment, setEnvironment] =
    useState<OwnerPricingEnvironment>('production')

  const [passPrice, setPassPrice] = useState(
    productionPassPrice.toFixed(2)
  )

  const [feePercent, setFeePercent] = useState(
    productionFeePercent.toFixed(2)
  )

  function loadEnvironmentDefaults(
    nextEnvironment: OwnerPricingEnvironment
  ) {
    setEnvironment(nextEnvironment)

    if (nextEnvironment === 'production') {
      setPassPrice(
        productionPassPrice.toFixed(2)
      )
      setFeePercent(
        productionFeePercent.toFixed(2)
      )
      return
    }

    setPassPrice(demoPassPrice.toFixed(2))
    setFeePercent(demoFeePercent.toFixed(2))
  }

  const preview = useMemo(() => {
    const normalizedPassPrice = Math.max(
      0,
      normalizeNumber(passPrice)
    )

    const normalizedFeePercent = Math.min(
      100,
      Math.max(0, normalizeNumber(feePercent))
    )

    const feeAmount =
      normalizedPassPrice *
      (normalizedFeePercent / 100)

    return {
      passPrice: normalizedPassPrice,
      feePercent: normalizedFeePercent,
      feeAmount,
      organizationShare:
        normalizedPassPrice - feeAmount,
    }
  }, [passPrice, feePercent])

  return (
    <details className="group mt-5 overflow-hidden rounded-2xl border border-slate-700 bg-slate-900">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 transition hover:bg-slate-800">
        <span>
          <span className="block text-base font-bold text-white">
            Change platform default
          </span>
          <span className="mt-1 block text-sm text-slate-400">
            Publish a new default without rewriting prior purchases or pricing history.
          </span>
        </span>

        <span className="rounded-full border border-slate-600 px-3 py-1 text-xs font-bold text-slate-300">
          Owner only
        </span>
      </summary>

      <form
        action={formAction}
        className="border-t border-slate-700 p-5"
      >
        <fieldset>
          <legend className="text-sm font-bold text-white">
            Environment
          </legend>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {(
              [
                'production',
                'demo',
              ] as OwnerPricingEnvironment[]
            ).map((option) => {
              const selected =
                environment === option

              return (
                <label
                  key={option}
                  className={`cursor-pointer rounded-xl border p-4 transition ${
                    selected
                      ? 'border-blue-400 bg-blue-500/10'
                      : 'border-slate-700 bg-slate-950 hover:border-slate-500'
                  }`}
                >
                  <input
                    type="radio"
                    name="environment"
                    value={option}
                    checked={selected}
                    onChange={() =>
                      loadEnvironmentDefaults(option)
                    }
                    className="sr-only"
                  />

                  <span className="block text-sm font-bold capitalize text-white">
                    {option}
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-slate-400">
                    {option === 'production'
                      ? 'Affects real customer purchases.'
                      : 'Affects demo campaigns and demo purchases only.'}
                  </span>
                </label>
              )
            })}
          </div>
        </fieldset>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-bold text-white">
              Pass price
            </span>
            <span className="mt-1 block text-xs text-slate-400">
              Amount charged for a new six-month pass.
            </span>
            <div className="relative mt-2">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-500">
                $
              </span>
              <input
                type="number"
                name="passPrice"
                min="0.01"
                max="1000"
                step="0.01"
                required
                value={passPrice}
                onChange={(event) =>
                  setPassPrice(event.target.value)
                }
                className="w-full rounded-xl border border-slate-600 bg-slate-950 py-3 pl-7 pr-3 text-white outline-none transition focus:border-blue-400"
              />
            </div>
          </label>

          <label className="block">
            <span className="text-sm font-bold text-white">
              RaiseHub fee
            </span>
            <span className="mt-1 block text-xs text-slate-400">
              Percentage retained from the pass price.
            </span>
            <div className="relative mt-2">
              <input
                type="number"
                name="platformFeePercent"
                min="0"
                max="100"
                step="0.01"
                required
                value={feePercent}
                onChange={(event) =>
                  setFeePercent(event.target.value)
                }
                className="w-full rounded-xl border border-slate-600 bg-slate-950 py-3 pl-3 pr-8 text-white outline-none transition focus:border-blue-400"
              />
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-500">
                %
              </span>
            </div>
          </label>
        </div>

        <div className="mt-5 grid gap-3 rounded-2xl border border-slate-700 bg-slate-950 p-4 sm:grid-cols-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Customer pays
            </p>
            <p className="mt-1 text-lg font-bold text-white">
              {formatMoney(preview.passPrice)}
            </p>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              RaiseHub receives
            </p>
            <p className="mt-1 text-lg font-bold text-blue-300">
              {formatMoney(preview.feeAmount)}
            </p>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Organization receives
            </p>
            <p className="mt-1 text-lg font-bold text-emerald-300">
              {formatMoney(
                preview.organizationShare
              )}
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-bold text-white">
              Reason
            </span>
            <span className="mt-1 block text-xs text-slate-400">
              Owner-facing explanation for this change.
            </span>
            <input
              type="text"
              name="reason"
              maxLength={160}
              placeholder="Example: Updated platform launch pricing"
              className="mt-2 w-full rounded-xl border border-slate-600 bg-slate-950 px-3 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-blue-400"
            />
          </label>

          <label className="block">
            <span className="text-sm font-bold text-white">
              Internal note
            </span>
            <span className="mt-1 block text-xs text-slate-400">
              Optional private operational context.
            </span>
            <input
              type="text"
              name="internalNote"
              maxLength={240}
              placeholder="Optional"
              className="mt-2 w-full rounded-xl border border-slate-600 bg-slate-950 px-3 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-blue-400"
            />
          </label>
        </div>

        <div className="mt-5 rounded-xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm leading-6 text-amber-100">
          Publishing makes this the active{' '}
          <strong>
            {environment === 'production'
              ? 'Production'
              : 'Demo'}
          </strong>{' '}
          platform default immediately. Existing purchases keep their original pricing snapshots.
        </div>

        {state.message ? (
          <p
            role="status"
            className={`mt-4 rounded-xl border p-4 text-sm ${
              state.success
                ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-100'
                : 'border-red-400/30 bg-red-400/10 text-red-100'
            }`}
          >
            {state.message}
          </p>
        ) : null}

        <div className="mt-5 flex justify-end">
          <SubmitButton
            environment={environment}
          />
        </div>
      </form>
    </details>
  )
}

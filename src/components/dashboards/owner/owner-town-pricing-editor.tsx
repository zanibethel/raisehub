'use client'

import {
  useActionState,
  useMemo,
  useState,
} from 'react'

import {
  initialOwnerTownPricingActionState,
  publishTownPricingAction,
  retireTownPricingAction,
} from '@/components/dashboards/owner/owner-town-pricing-actions'
import type {
  OwnerTownPricingEnvironment,
  OwnerTownPricingOption,
} from '@/lib/services/owner-town-pricing-service'

type PricingEnvironment =
  | 'production'
  | 'demo'

function formatMoney(value: number) {
  return `$${value.toFixed(2)}`
}

function formatDate(value: string | null) {
  if (!value) {
    return 'No automatic end date'
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

function normalizeStateCode(value: string) {
  return value.trim().toUpperCase()
}

function normalizeTownName(value: string) {
  return value.trim().replace(/\s+/g, ' ')
}

function OverrideSummary({
  pricing,
}: {
  pricing: OwnerTownPricingEnvironment
}) {
  return (
    <div className="mt-4 grid gap-3 lg:grid-cols-2">
      <div className="rounded-xl border border-amber-700 bg-amber-950/40 p-4 text-sm text-amber-100">
        <p className="font-bold">
          Current town override
        </p>

        {pricing.activeOverride ? (
          <>
            <p className="mt-2 leading-6">
              <strong>
                {formatMoney(
                  pricing.activeOverride.passPrice
                )}
              </strong>{' '}
              pass with a{' '}
              <strong>
                {pricing.activeOverride.platformFeePercent.toFixed(
                  2
                )}
                %
              </strong>{' '}
              RaiseHub fee.
            </p>

            <p className="mt-1 text-xs leading-5 text-amber-300">
              Started{' '}
              {formatDate(
                pricing.activeOverride.startsAt
              )}
              {pricing.activeOverride.expiresAt
                ? ` · Ends ${formatDate(
                    pricing.activeOverride.expiresAt
                  )}`
                : ' · No automatic end date'}
            </p>

            {pricing.activeOverride.reason ? (
              <p className="mt-2 text-xs leading-5 text-amber-200">
                {pricing.activeOverride.reason}
              </p>
            ) : null}
          </>
        ) : (
          <p className="mt-2 leading-6 text-amber-200">
            No current town override. Eligible campaigns inherit state, platform, or application fallback pricing unless an organization or campaign override applies.
          </p>
        )}
      </div>

      <div className="rounded-xl border border-violet-700 bg-violet-950/40 p-4 text-sm text-violet-100">
        <p className="font-bold">
          Scheduled town override
        </p>

        {pricing.scheduledOverride ? (
          <>
            <p className="mt-2 leading-6">
              <strong>
                {formatMoney(
                  pricing.scheduledOverride.passPrice
                )}
              </strong>{' '}
              pass with a{' '}
              <strong>
                {pricing.scheduledOverride.platformFeePercent.toFixed(
                  2
                )}
                %
              </strong>{' '}
              RaiseHub fee.
            </p>

            <p className="mt-1 text-xs leading-5 text-violet-300">
              Starts{' '}
              {formatDate(
                pricing.scheduledOverride.startsAt
              )}
              {pricing.scheduledOverride.expiresAt
                ? ` · Ends ${formatDate(
                    pricing.scheduledOverride.expiresAt
                  )}`
                : ' · No automatic end date'}
            </p>

            {pricing.scheduledOverride.reason ? (
              <p className="mt-2 text-xs leading-5 text-violet-200">
                {pricing.scheduledOverride.reason}
              </p>
            ) : null}
          </>
        ) : (
          <p className="mt-2 leading-6 text-violet-200">
            No future town pricing change is scheduled.
          </p>
        )}
      </div>
    </div>
  )
}

export default function OwnerTownPricingEditor({
  towns,
}: {
  towns: OwnerTownPricingOption[]
}) {
  const [stateCode, setStateCode] =
    useState(towns[0]?.stateCode ?? '')

  const [townName, setTownName] =
    useState(towns[0]?.townName ?? '')

  const [environment, setEnvironment] =
    useState<PricingEnvironment>(
      'production'
    )

  const [publishState, publishAction, publishPending] =
    useActionState(
      publishTownPricingAction,
      initialOwnerTownPricingActionState
    )

  const [retireState, retireAction, retirePending] =
    useActionState(
      retireTownPricingAction,
      initialOwnerTownPricingActionState
    )

  const selectedTown = useMemo(() => {
    const normalizedState =
      normalizeStateCode(stateCode)

    const normalizedTown =
      normalizeTownName(townName).toLowerCase()

    return (
      towns.find(
        (town) =>
          town.stateCode === normalizedState &&
          town.townName.toLowerCase() ===
            normalizedTown
      ) ?? null
    )
  }, [stateCode, townName, towns])

  const selectedPricing =
    selectedTown?.[environment] ?? null

  const canRetire = Boolean(
    selectedPricing?.activeOverride ||
      selectedPricing?.scheduledOverride
  )

  function chooseExistingTown(
    value: string
  ) {
    const selected = towns.find(
      (town) =>
        `${town.stateCode}|${town.townName}` ===
        value
    )

    if (!selected) {
      return
    }

    setStateCode(selected.stateCode)
    setTownName(selected.townName)
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">
          Town pricing
        </p>
        <h2 className="mt-2 text-xl font-bold text-slate-950">
          Manage town defaults
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Town pricing applies after campaign and organization overrides but before state and platform defaults. Production and Demo rules are managed separately.
        </p>
      </div>

      {towns.length > 0 ? (
        <label className="mt-5 grid gap-2 text-sm font-semibold text-slate-700">
          Existing town rule
          <select
            defaultValue=""
            onChange={(event) =>
              chooseExistingTown(
                event.target.value
              )
            }
            className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-950"
          >
            <option value="">
              Choose an existing town
            </option>
            {towns.map((town) => (
              <option
                key={`${town.stateCode}:${town.townName}`}
                value={`${town.stateCode}|${town.townName}`}
              >
                {town.townName}, {town.stateCode}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <label className="grid gap-2 text-sm font-semibold text-slate-700">
          State
          <input
            value={stateCode}
            onChange={(event) =>
              setStateCode(
                event.target.value.toUpperCase()
              )
            }
            maxLength={2}
            placeholder="TX"
            autoCapitalize="characters"
            className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-950"
          />
        </label>

        <label className="grid gap-2 text-sm font-semibold text-slate-700 md:col-span-1">
          Town
          <input
            value={townName}
            onChange={(event) =>
              setTownName(event.target.value)
            }
            placeholder="Lubbock"
            className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-950"
          />
        </label>

        <label className="grid gap-2 text-sm font-semibold text-slate-700">
          Environment
          <select
            value={environment}
            onChange={(event) =>
              setEnvironment(
                event.target
                  .value as PricingEnvironment
              )
            }
            className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-950"
          >
            <option value="production">
              Production
            </option>
            <option value="demo">
              Demo
            </option>
          </select>
        </label>
      </div>

      {selectedPricing ? (
        <OverrideSummary
          pricing={selectedPricing}
        />
      ) : (
        <p className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
          This town does not currently have a saved pricing override for the selected environment.
        </p>
      )}

      <form
        action={publishAction}
        className="mt-5 grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4"
      >
        <input
          type="hidden"
          name="stateCode"
          value={stateCode}
        />
        <input
          type="hidden"
          name="townName"
          value={townName}
        />
        <input
          type="hidden"
          name="environment"
          value={environment}
        />

        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm font-semibold text-slate-700">
            Pass price
            <input
              name="passPrice"
              type="number"
              min="0.01"
              max="1000"
              step="0.01"
              required
              placeholder="20.00"
              className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-950"
            />
          </label>

          <label className="grid gap-2 text-sm font-semibold text-slate-700">
            RaiseHub fee percent
            <input
              name="platformFeePercent"
              type="number"
              min="0"
              max="100"
              step="0.01"
              required
              placeholder="20.00"
              className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-950"
            />
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm font-semibold text-slate-700">
            Starts
            <input
              name="startsAt"
              type="datetime-local"
              className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-950"
            />
          </label>

          <label className="grid gap-2 text-sm font-semibold text-slate-700">
            Ends
            <input
              name="expiresAt"
              type="datetime-local"
              className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-950"
            />
          </label>
        </div>

        <p className="text-xs leading-5 text-slate-500">
          Leave Starts blank to publish immediately. Leave Ends blank for no automatic end. Dates use this device’s timezone.
        </p>

        <label className="grid gap-2 text-sm font-semibold text-slate-700">
          Reason
          <input
            name="reason"
            type="text"
            maxLength={240}
            placeholder="Why this town needs different pricing"
            className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-950"
          />
        </label>

        <label className="grid gap-2 text-sm font-semibold text-slate-700">
          Internal note
          <textarea
            name="internalNote"
            rows={3}
            placeholder="Private operational context"
            className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-950"
          />
        </label>

        <button
          type="submit"
          disabled={
            publishPending ||
            !/^[A-Z]{2}$/.test(
              normalizeStateCode(stateCode)
            ) ||
            !normalizeTownName(townName)
          }
          className="rounded-xl bg-blue-700 px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {publishPending
            ? 'Publishing…'
            : 'Publish town pricing'}
        </button>

        {publishState.message ? (
          <p
            className={`rounded-xl p-3 text-sm leading-6 ${
              publishState.success
                ? 'bg-emerald-100 text-emerald-900'
                : 'bg-red-100 text-red-900'
            }`}
          >
            {publishState.message}
          </p>
        ) : null}
      </form>

      <form
        action={retireAction}
        className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4"
      >
        <input
          type="hidden"
          name="stateCode"
          value={stateCode}
        />
        <input
          type="hidden"
          name="townName"
          value={townName}
        />
        <input
          type="hidden"
          name="environment"
          value={environment}
        />

        <p className="text-sm leading-6 text-red-900">
          Retiring removes current and scheduled town overrides for the selected environment. Campaign and organization rules remain unchanged.
        </p>

        <button
          type="submit"
          disabled={
            retirePending ||
            !canRetire
          }
          className="mt-3 rounded-xl bg-red-700 px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {retirePending
            ? 'Retiring…'
            : 'Retire town pricing'}
        </button>

        {retireState.message ? (
          <p
            className={`mt-3 rounded-xl p-3 text-sm leading-6 ${
              retireState.success
                ? 'bg-emerald-100 text-emerald-900'
                : 'bg-red-100 text-red-900'
            }`}
          >
            {retireState.message}
          </p>
        ) : null}
      </form>
    </section>
  )
}
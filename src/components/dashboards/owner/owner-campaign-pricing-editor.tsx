'use client'

import {
  useActionState,
  useMemo,
  useState,
} from 'react'
import { useFormStatus } from 'react-dom'

import {
  publishCampaignPricingAction,
  type OwnerPricingEnvironment,
  type PublishCampaignPricingActionState,
} from './owner-pricing-actions'

export type OwnerCampaignPricingOption = {
  id: string
  name: string
  isDemo: boolean
  organizationName: string | null
}

type OwnerCampaignPricingEditorProps = {
  campaigns: OwnerCampaignPricingOption[]
  productionPassPrice: number
  productionFeePercent: number
  demoPassPrice: number
  demoFeePercent: number
}

const INITIAL_STATE: PublishCampaignPricingActionState = {
  success: false,
  message: null,
  campaignId: null,
  environment: null,
}

function normalizeNumber(value: string) {
  const parsed = Number(value)

  return Number.isFinite(parsed)
    ? parsed
    : 0
}

function formatMoney(value: number) {
  return `$${value.toFixed(2)}`
}

function CampaignSubmitButton() {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending
        ? 'Publishing...'
        : 'Publish Campaign Override'}
    </button>
  )
}

export default function OwnerCampaignPricingEditor({
  campaigns,
  productionPassPrice,
  productionFeePercent,
  demoPassPrice,
  demoFeePercent,
}: OwnerCampaignPricingEditorProps) {
  const [state, formAction] = useActionState(
    publishCampaignPricingAction,
    INITIAL_STATE
  )

  const [environment, setEnvironment] =
    useState<OwnerPricingEnvironment>('production')

  const [campaignId, setCampaignId] = useState('')

  const [passPrice, setPassPrice] = useState(
    productionPassPrice.toFixed(2)
  )

  const [feePercent, setFeePercent] = useState(
    productionFeePercent.toFixed(2)
  )

  const availableCampaigns = useMemo(
    () =>
      campaigns.filter(
        (campaign) =>
          campaign.isDemo ===
          (environment === 'demo')
      ),
    [campaigns, environment]
  )

  const selectedCampaign =
    availableCampaigns.find(
      (campaign) => campaign.id === campaignId
    ) ?? null

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

  function loadEnvironmentDefaults(
    nextEnvironment: OwnerPricingEnvironment
  ) {
    setEnvironment(nextEnvironment)
    setCampaignId('')

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

  return (
    <details className="group mt-5 overflow-hidden rounded-2xl border border-slate-700 bg-slate-900">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 transition hover:bg-slate-800">
        <span>
          <span className="block text-base font-bold text-white">
            Override one campaign
          </span>
          <span className="mt-1 block text-sm text-slate-400">
            Set a campaign-specific pass price and RaiseHub fee without changing the platform default.
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
                      ? 'Choose from real campaigns.'
                      : 'Choose from demo campaigns only.'}
                  </span>
                </label>
              )
            })}
          </div>
        </fieldset>

        <label className="mt-5 block">
          <span className="text-sm font-bold text-white">
            Campaign
          </span>
          <span className="mt-1 block text-xs text-slate-400">
            This override will take priority over organization, town, state, and platform pricing.
          </span>

          <select
            name="campaignId"
            required
            value={campaignId}
            onChange={(event) =>
              setCampaignId(event.target.value)
            }
            className="mt-2 w-full rounded-xl border border-slate-600 bg-slate-950 px-3 py-3 text-white outline-none transition focus:border-blue-400"
          >
            <option value="">
              {availableCampaigns.length > 0
                ? 'Choose a campaign'
                : `No ${environment} campaigns available`}
            </option>

            {availableCampaigns.map((campaign) => (
              <option
                key={campaign.id}
                value={campaign.id}
              >
                {campaign.name}
                {campaign.organizationName
                  ? ` — ${campaign.organizationName}`
                  : ''}
              </option>
            ))}
          </select>
        </label>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-bold text-white">
              Pass price
            </span>
            <span className="mt-1 block text-xs text-slate-400">
              Amount charged for this campaign&apos;s pass.
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
              Percentage retained from this campaign&apos;s pass price.
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
              Pass price
            </p>
            <p className="mt-1 text-lg font-bold text-white">
              {formatMoney(preview.passPrice)}
            </p>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              RaiseHub keeps
            </p>
            <p className="mt-1 text-lg font-bold text-amber-300">
              {formatMoney(preview.feeAmount)}
              <span className="ml-1 text-xs text-slate-500">
                ({preview.feePercent.toFixed(2)}%)
              </span>
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

        <label className="mt-5 block">
          <span className="text-sm font-bold text-white">
            Reason
          </span>
          <span className="mt-1 block text-xs text-slate-400">
            Short explanation shown in pricing history.
          </span>
          <input
            type="text"
            name="reason"
            placeholder="Example: Special launch pricing"
            className="mt-2 w-full rounded-xl border border-slate-600 bg-slate-950 px-3 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-blue-400"
          />
        </label>

        <label className="mt-4 block">
          <span className="text-sm font-bold text-white">
            Internal note
          </span>
          <span className="mt-1 block text-xs text-slate-400">
            Optional private context for Owner tools.
          </span>
          <textarea
            name="internalNote"
            rows={3}
            className="mt-2 w-full rounded-xl border border-slate-600 bg-slate-950 px-3 py-3 text-white outline-none transition focus:border-blue-400"
          />
        </label>

        {selectedCampaign ? (
          <p className="mt-4 rounded-xl border border-blue-700 bg-blue-950/50 p-3 text-sm text-blue-200">
            This will override managed pricing for{' '}
            <strong>{selectedCampaign.name}</strong>.
          </p>
        ) : null}

        {state.message ? (
          <p
            className={`mt-4 rounded-xl border p-3 text-sm ${
              state.success
                ? 'border-emerald-700 bg-emerald-950/50 text-emerald-200'
                : 'border-red-700 bg-red-950/50 text-red-200'
            }`}
          >
            {state.message}
          </p>
        ) : null}

        <div className="mt-5">
          <CampaignSubmitButton />
        </div>
      </form>
    </details>
  )
}

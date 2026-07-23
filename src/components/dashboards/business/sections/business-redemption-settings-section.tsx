'use client'

import { useState, useTransition } from 'react'

import { updateBusinessRedemptionMethodAction } from '../business-redemption-settings-actions'
import { getBusinessRedemptionSettings } from '@/lib/redemptions/business-redemption-settings'
import type { RedemptionMethod } from '@/lib/redemptions/redemption-method'

type BusinessRedemptionSettingsSectionProps = {
  redemptionMethod?: unknown
}

type SaveMessage =
  | { type: 'success'; text: string }
  | { type: 'error'; text: string }
  | null

export function BusinessRedemptionSettingsSection({
  redemptionMethod,
}: BusinessRedemptionSettingsSectionProps) {
  const initialSettings = getBusinessRedemptionSettings(redemptionMethod)
  const [selectedMethod, setSelectedMethod] = useState<RedemptionMethod>(
    initialSettings.selectedMethod
  )
  const [expanded, setExpanded] = useState(false)
  const [saveMessage, setSaveMessage] = useState<SaveMessage>(null)
  const [isPending, startTransition] = useTransition()

  const settings = getBusinessRedemptionSettings(selectedMethod)
  const currentOption = settings.options.find((option) => option.isSelected)

  function handleSelect(method: RedemptionMethod) {
    setSaveMessage(null)

    startTransition(async () => {
      const result = await updateBusinessRedemptionMethodAction(method)

      if (!result.success) {
        setSaveMessage({ type: 'error', text: result.error })
        return
      }

      setSelectedMethod(result.redemptionMethod)
      setSaveMessage({
        type: 'success',
        text: 'Your redemption method has been updated.',
      })
    })
  }

  return (
    <section
      aria-labelledby="business-redemption-settings-heading"
      className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5"
    >
      <button
        type="button"
        onClick={() => setExpanded((current) => !current)}
        aria-expanded={expanded}
        className="flex w-full items-start justify-between gap-4 text-left"
      >
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wide text-green-700">
            Redemption method
          </p>
          <h2
            id="business-redemption-settings-heading"
            className="mt-1 text-lg font-semibold text-gray-950"
          >
            {currentOption?.label ?? settings.heading}
          </h2>
          <p className="mt-1 text-sm leading-6 text-gray-600">
            {currentOption?.description ?? settings.description}
          </p>
        </div>

        <span className="shrink-0 rounded-full bg-green-50 px-3 py-2 text-sm font-semibold text-green-700">
          {expanded ? 'Close' : 'Change'}
        </span>
      </button>

      {expanded ? (
        <div className="mt-4 border-t border-gray-100 pt-4">
          <p className="text-sm leading-6 text-gray-600">{settings.description}</p>

          <div className="mt-4 space-y-3">
            {settings.options.map((option) => {
              const isAvailable = option.statusLabel === 'Available'
              const isDisabled =
                !option.isSelectable || option.isSelected || isPending

              return (
                <div
                  key={option.value}
                  className={`rounded-xl border p-4 ${
                    option.isSelected
                      ? 'border-green-300 bg-green-50'
                      : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-semibold text-gray-950">
                          {option.label}
                        </h3>
                        {option.isSelected ? (
                          <span className="rounded-full bg-green-700 px-2.5 py-1 text-xs font-semibold text-white">
                            Current
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-2 text-sm leading-6 text-gray-600">
                        {option.description}
                      </p>
                    </div>

                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                        isAvailable
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-200 text-gray-700'
                      }`}
                    >
                      {option.statusLabel}
                    </span>
                  </div>

                  {option.isSelectable ? (
                    <button
                      type="button"
                      disabled={isDisabled}
                      onClick={() => handleSelect(option.value)}
                      className={`mt-4 inline-flex min-h-11 items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition ${
                        option.isSelected
                          ? 'cursor-default bg-green-100 text-green-800'
                          : 'bg-blue-700 text-white hover:bg-blue-800'
                      } ${
                        isDisabled && !option.isSelected
                          ? 'cursor-not-allowed opacity-60'
                          : ''
                      }`}
                    >
                      {option.isSelected
                        ? 'Current method'
                        : isPending
                          ? 'Saving…'
                          : 'Use this method'}
                    </button>
                  ) : (
                    <p className="mt-3 text-xs leading-5 text-gray-500">
                      This option cannot be selected yet.
                    </p>
                  )}
                </div>
              )
            })}
          </div>

          <p className="mt-4 rounded-xl bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-900">
            {settings.helperText}
          </p>
        </div>
      ) : null}

      {saveMessage ? (
        <p
          role={saveMessage.type === 'error' ? 'alert' : 'status'}
          className={`mt-4 rounded-xl px-4 py-3 text-sm leading-6 ${
            saveMessage.type === 'error'
              ? 'bg-red-50 text-red-800'
              : 'bg-green-50 text-green-800'
          }`}
        >
          {saveMessage.text}
        </p>
      ) : null}
    </section>
  )
}

export default BusinessRedemptionSettingsSection

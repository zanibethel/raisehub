'use client'

import {
  useState,
  useTransition,
} from 'react'

import {
  updateBusinessRedemptionMethodAction,
} from '../business-redemption-settings-actions'

import {
  getBusinessRedemptionSettings,
} from '@/lib/redemptions/business-redemption-settings'

import type {
  RedemptionMethod,
} from '@/lib/redemptions/redemption-method'

// =============================================================================
// Types
// =============================================================================

type BusinessRedemptionSettingsSectionProps = {
  redemptionMethod?: unknown
}

type SaveMessage =
  | {
      type: 'success'
      text: string
    }
  | {
      type: 'error'
      text: string
    }
  | null

// =============================================================================
// Component
// =============================================================================

export function BusinessRedemptionSettingsSection({
  redemptionMethod,
}: BusinessRedemptionSettingsSectionProps) {
  const initialSettings =
    getBusinessRedemptionSettings(
      redemptionMethod
    )

  const [
    selectedMethod,
    setSelectedMethod,
  ] = useState<RedemptionMethod>(
    initialSettings.selectedMethod
  )

  const [
    saveMessage,
    setSaveMessage,
  ] = useState<SaveMessage>(null)

  const [
    isPending,
    startTransition,
  ] = useTransition()

  const settings =
    getBusinessRedemptionSettings(
      selectedMethod
    )

  function handleSelect(
    method: RedemptionMethod
  ) {
    setSaveMessage(null)

    startTransition(async () => {
      const result =
        await updateBusinessRedemptionMethodAction(
          method
        )

      if (!result.success) {
        setSaveMessage({
          type: 'error',
          text: result.error,
        })

        return
      }

      setSelectedMethod(
        result.redemptionMethod
      )

      setSaveMessage({
        type: 'success',
        text:
          'Your redemption method has been updated.',
      })
    })
  }

  return (
    <section
      aria-labelledby="business-redemption-settings-heading"
      className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
    >
      <div>
        <h2
          id="business-redemption-settings-heading"
          className="text-lg font-semibold text-gray-950"
        >
          {settings.heading}
        </h2>

        <p className="mt-1 text-sm leading-6 text-gray-600">
          {settings.description}
        </p>
      </div>

      <div className="mt-5 space-y-3">
        {settings.options.map(
          (option) => {
            const isAvailable =
              option.statusLabel ===
              'Available'

            const isDisabled =
              !option.isSelectable ||
              option.isSelected ||
              isPending

            return (
              <div
                key={option.value}
                className={[
                  'rounded-xl border p-4',
                  option.isSelected
                    ? 'border-green-300 bg-green-50'
                    : 'border-gray-200 bg-gray-50',
                ].join(' ')}
              >
                <div className="flex items-start justify-between gap-4">
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
                    className={[
                      'inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold',
                      isAvailable
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-200 text-gray-700',
                    ].join(' ')}
                  >
                    <span
                      aria-hidden="true"
                      className="font-bold"
                    >
                      {isAvailable
                        ? '✓'
                        : '○'}
                    </span>

                    {option.statusLabel}
                  </span>
                </div>

                {option.isSelectable ? (
                  <button
                    type="button"
                    disabled={isDisabled}
                    onClick={() =>
                      handleSelect(
                        option.value
                      )
                    }
                    className={[
                      'mt-4 inline-flex min-h-11 items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition',
                      option.isSelected
                        ? 'cursor-default bg-green-100 text-green-800'
                        : 'bg-blue-700 text-white hover:bg-blue-800',
                      isDisabled &&
                      !option.isSelected
                        ? 'cursor-not-allowed opacity-60'
                        : '',
                    ].join(' ')}
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
          }
        )}
      </div>

      {saveMessage ? (
        <p
          role={
            saveMessage.type === 'error'
              ? 'alert'
              : 'status'
          }
          className={[
            'mt-4 rounded-xl px-4 py-3 text-sm leading-6',
            saveMessage.type === 'error'
              ? 'bg-red-50 text-red-800'
              : 'bg-green-50 text-green-800',
          ].join(' ')}
        >
          {saveMessage.text}
        </p>
      ) : null}

      <p className="mt-4 rounded-xl bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-900">
        {settings.helperText}
      </p>
    </section>
  )
}

export default BusinessRedemptionSettingsSection
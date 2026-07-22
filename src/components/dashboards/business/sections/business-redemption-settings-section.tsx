import {
  CheckCircle2,
  Clock3,
} from 'lucide-react'

import {
  getBusinessRedemptionSettings,
} from '@/lib/redemptions/business-redemption-settings'

// =============================================================================
// Types
// =============================================================================

type BusinessRedemptionSettingsSectionProps = {
  redemptionMethod?: unknown
}

// =============================================================================
// Component
// =============================================================================

export function BusinessRedemptionSettingsSection({
  redemptionMethod,
}: BusinessRedemptionSettingsSectionProps) {
  const settings =
    getBusinessRedemptionSettings(
      redemptionMethod
    )

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
                    {isAvailable ? (
                      <CheckCircle2
                        aria-hidden="true"
                        className="h-3.5 w-3.5"
                      />
                    ) : (
                      <Clock3
                        aria-hidden="true"
                        className="h-3.5 w-3.5"
                      />
                    )}

                    {option.statusLabel}
                  </span>
                </div>

                {!option.isSelectable ? (
                  <p className="mt-3 text-xs leading-5 text-gray-500">
                    This option cannot be selected yet.
                  </p>
                ) : null}
              </div>
            )
          }
        )}
      </div>

      <p className="mt-4 rounded-xl bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-900">
        {settings.helperText}
      </p>
    </section>
  )
}

export default BusinessRedemptionSettingsSection
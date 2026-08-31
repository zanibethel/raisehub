import {
  DEFAULT_REDEMPTION_METHOD,
  getRedemptionMethod,
  getRedemptionMethodOptions,
} from './redemption-method'

import type {
  RedemptionMethod,
  RedemptionMethodOption,
} from './redemption-method'

export type BusinessRedemptionSettingOption =
  RedemptionMethodOption & {
    isSelected: boolean
    isSelectable: boolean
    statusLabel:
      | 'Current Workflow'
      | 'Optional Tool'
      | 'Coming Later'
  }

export type BusinessRedemptionSettings = {
  selectedMethod: RedemptionMethod
  heading: string
  description: string
  helperText: string
  options: BusinessRedemptionSettingOption[]
}

const BUSINESS_REDEMPTION_HEADING =
  'Redemption Workflow'

const BUSINESS_REDEMPTION_DESCRIPTION =
  'RaiseHub records customer redemptions immediately and gives your business a 24-hour review window for exceptions.'

const BUSINESS_REDEMPTION_HELPER_TEXT =
  '24-Hour Auto Validation is the core workflow. Instant verification is an optional checkout tool; QR, discount-code, and POS integrations will confirm the same redemption record as they are released.'

function getBusinessRedemptionSettingOption({
  option,
  selectedMethod,
}: {
  option: RedemptionMethodOption
  selectedMethod: RedemptionMethod
}): BusinessRedemptionSettingOption {
  const isSelectable = option.availability === 'available'

  return {
    ...option,
    isSelected:
      option.value === selectedMethod &&
      option.availability === 'available',
    isSelectable,
    statusLabel:
      option.availability === 'available'
        ? 'Current Workflow'
        : option.availability === 'supplemental'
          ? 'Optional Tool'
          : 'Coming Later',
  }
}

export function getBusinessRedemptionSettings(
  value: unknown
): BusinessRedemptionSettings {
  const requestedMethod = getRedemptionMethod(value)

  const selectedMethod = getRedemptionMethodOptions().some(
    (option) =>
      option.value === requestedMethod &&
      option.availability === 'available'
  )
    ? requestedMethod
    : DEFAULT_REDEMPTION_METHOD

  return {
    selectedMethod,
    heading: BUSINESS_REDEMPTION_HEADING,
    description: BUSINESS_REDEMPTION_DESCRIPTION,
    helperText: BUSINESS_REDEMPTION_HELPER_TEXT,
    options: getRedemptionMethodOptions().map((option) =>
      getBusinessRedemptionSettingOption({
        option,
        selectedMethod,
      })
    ),
  }
}

export function canBusinessSelectRedemptionMethod(
  value: unknown
): value is RedemptionMethod {
  const method = getRedemptionMethod(value)

  return (
    method === value &&
    getRedemptionMethodOptions().some(
      (option) =>
        option.value === method &&
        option.availability === 'available'
    )
  )
}

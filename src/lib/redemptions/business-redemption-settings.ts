import {
  DEFAULT_REDEMPTION_METHOD,
  getRedemptionMethod,
  getRedemptionMethodOptions,
} from './redemption-method'

import type {
  RedemptionMethod,
  RedemptionMethodOption,
} from './redemption-method'

// =============================================================================
// Types
// =============================================================================

export type BusinessRedemptionSettingOption =
  RedemptionMethodOption & {
    isSelected: boolean
    isSelectable: boolean
    statusLabel:
      | 'Available'
      | 'Coming Later'
  }

export type BusinessRedemptionSettings =
  {
    selectedMethod:
      RedemptionMethod
    heading: string
    description: string
    helperText: string
    options:
      BusinessRedemptionSettingOption[]
  }

// =============================================================================
// Settings guidance
// =============================================================================

const BUSINESS_REDEMPTION_HEADING =
  'Redemption Method'

const BUSINESS_REDEMPTION_DESCRIPTION =
  'Choose how customers confirm an offer at your business.'

const BUSINESS_REDEMPTION_HELPER_TEXT =
  'Staff Confirmation is available now. Additional redemption methods will become selectable as they are released.'

// =============================================================================
// Option presentation
// =============================================================================

function getBusinessRedemptionSettingOption({
  option,
  selectedMethod,
}: {
  option:
    RedemptionMethodOption
  selectedMethod:
    RedemptionMethod
}): BusinessRedemptionSettingOption {
  const isSelectable =
    option.availability ===
    'available'

  return {
    ...option,
    isSelected:
      option.value ===
      selectedMethod,
    isSelectable,
    statusLabel:
      isSelectable
        ? 'Available'
        : 'Coming Later',
  }
}

// =============================================================================
// Settings resolution
// =============================================================================

export function getBusinessRedemptionSettings(
  value: unknown
): BusinessRedemptionSettings {
  const requestedMethod =
    getRedemptionMethod(value)

  const selectedMethod =
    getRedemptionMethodOptions()
      .some(
        (option) =>
          option.value ===
            requestedMethod &&
          option.availability ===
            'available'
      )
      ? requestedMethod
      : DEFAULT_REDEMPTION_METHOD

  return {
    selectedMethod,
    heading:
      BUSINESS_REDEMPTION_HEADING,
    description:
      BUSINESS_REDEMPTION_DESCRIPTION,
    helperText:
      BUSINESS_REDEMPTION_HELPER_TEXT,
    options:
      getRedemptionMethodOptions()
        .map((option) =>
          getBusinessRedemptionSettingOption({
            option,
            selectedMethod,
          })
        ),
  }
}

// =============================================================================
// Save validation
// =============================================================================

export function canBusinessSelectRedemptionMethod(
  value: unknown
): value is RedemptionMethod {
  const method =
    getRedemptionMethod(value)

  return (
    method === value &&
    getRedemptionMethodOptions()
      .some(
        (option) =>
          option.value ===
            method &&
          option.availability ===
            'available'
      )
  )
}
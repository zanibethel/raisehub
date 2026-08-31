// =============================================================================
// Redemption method values
// =============================================================================

export const REDEMPTION_METHODS = [
  'auto_validation',
  'staff_confirmation',
  'qr_code',
  'staff_code',
  'square',
] as const

export type RedemptionMethod =
  (typeof REDEMPTION_METHODS)[number]

// =============================================================================
// Redemption method availability
// =============================================================================

export type RedemptionMethodAvailability =
  | 'available'
  | 'planned'

export type RedemptionMethodOption = {
  value: RedemptionMethod
  label: string
  description: string
  availability:
    RedemptionMethodAvailability
}

// =============================================================================
// Launch default
// =============================================================================

export const DEFAULT_REDEMPTION_METHOD:
  RedemptionMethod =
    'auto_validation'

// =============================================================================
// Redemption method options
// =============================================================================

const REDEMPTION_METHOD_OPTIONS:
  RedemptionMethodOption[] = [
    {
      value: 'auto_validation',
      label: '24-Hour Auto Validation',
      description:
        'Customers redeem immediately. No staff action is required unless the business needs to reject an unauthorized redemption within 24 hours.',
      availability: 'available',
    },
    {
      value: 'staff_confirmation',
      label: 'Instant Staff Confirmation',
      description:
        'Staff can optionally enter the customer’s short verification code to confirm a redemption immediately.',
      availability: 'available',
    },
    {
      value: 'qr_code',
      label: 'QR / POS Code',
      description:
        'A scannable RaiseHub code can feed the same redemption record into a connected point-of-sale workflow.',
      availability: 'planned',
    },
    {
      value: 'staff_code',
      label: 'POS Discount Code',
      description:
        'A RaiseHub discount or verification code can be entered through a supported point-of-sale workflow.',
      availability: 'planned',
    },
    {
      value: 'square',
      label: 'Square Integration',
      description:
        'RaiseHub confirms the redemption automatically through a connected Square account and location.',
      availability: 'planned',
    },
  ]

// =============================================================================
// Validation
// =============================================================================

export function isRedemptionMethod(
  value: unknown
): value is RedemptionMethod {
  return (
    typeof value === 'string' &&
    REDEMPTION_METHODS.includes(
      value as RedemptionMethod
    )
  )
}

// =============================================================================
// Safe resolution
// =============================================================================

export function getRedemptionMethod(
  value: unknown
): RedemptionMethod {
  if (isRedemptionMethod(value)) {
    return value
  }

  return DEFAULT_REDEMPTION_METHOD
}

// =============================================================================
// Presentation
// =============================================================================

export function getRedemptionMethodOptions():
  RedemptionMethodOption[] {
  return REDEMPTION_METHOD_OPTIONS.map(
    (option) => ({ ...option })
  )
}

export function getRedemptionMethodOption(
  value: unknown
): RedemptionMethodOption {
  const method = getRedemptionMethod(value)
  const option = REDEMPTION_METHOD_OPTIONS.find(
    (candidate) => candidate.value === method
  )

  return {
    ...(option ?? REDEMPTION_METHOD_OPTIONS[0]),
  }
}

export function isRedemptionMethodAvailable(
  value: unknown
): boolean {
  return (
    getRedemptionMethodOption(value).availability ===
    'available'
  )
}

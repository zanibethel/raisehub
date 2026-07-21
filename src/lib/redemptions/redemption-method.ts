// =============================================================================
// Redemption method values
// =============================================================================

export const REDEMPTION_METHODS = [
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
    'staff_confirmation'

// =============================================================================
// Redemption method options
// =============================================================================

const REDEMPTION_METHOD_OPTIONS:
  RedemptionMethodOption[] = [
    {
      value:
        'staff_confirmation',
      label:
        'Staff Confirmation',
      description:
        'The customer redeems the offer while a business staff member is ready to confirm it.',
      availability:
        'available',
    },
    {
      value: 'qr_code',
      label: 'QR Code',
      description:
        'Business staff scans a customer redemption code before the offer is marked used.',
      availability:
        'planned',
    },
    {
      value: 'staff_code',
      label: 'Staff Code',
      description:
        'Business staff enters a private confirmation code to approve the redemption.',
      availability:
        'planned',
    },
    {
      value: 'square',
      label: 'Square Integration',
      description:
        'RaiseHub confirms the redemption through a connected Square account and location.',
      availability:
        'planned',
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
    (option) => ({
      ...option,
    })
  )
}

export function getRedemptionMethodOption(
  value: unknown
): RedemptionMethodOption {
  const method =
    getRedemptionMethod(value)

  const option =
    REDEMPTION_METHOD_OPTIONS.find(
      (candidate) =>
        candidate.value === method
    )

  return {
    ...(option ??
      REDEMPTION_METHOD_OPTIONS[0]),
  }
}

export function isRedemptionMethodAvailable(
  value: unknown
): boolean {
  return (
    getRedemptionMethodOption(
      value
    ).availability ===
    'available'
  )
}
import type {
  CustomerDealFilter,
} from './customer-deal-filters'

// =============================================================================
// Types
// =============================================================================

type GetCustomerDealShortcutCardClassesOptions = {
  filter: CustomerDealFilter
  isActive: boolean
  isDisabled: boolean
}

// =============================================================================
// Labels
// =============================================================================

export function getCustomerDealShortcutCountLabel(
  count: number
): string {
  return count === 1
    ? '1 deal'
    : `${count} deals`
}

export function getCustomerDealShortcutAriaLabel({
  label,
  count,
}: {
  label: string
  count: number
}): string {
  return `${label}: ${getCustomerDealShortcutCountLabel(
    count
  )}`
}

export function getCustomerDealShortcutStatus({
  isActive,
  isDisabled,
}: {
  isActive: boolean
  isDisabled: boolean
}): string {
  if (isActive) {
    return 'Showing now'
  }

  if (isDisabled) {
    return 'No matches right now'
  }

  return 'Tap to view'
}

// =============================================================================
// Card classes
// =============================================================================

export function getCustomerDealShortcutCardClasses({
  filter,
  isActive,
  isDisabled,
}: GetCustomerDealShortcutCardClassesOptions): string {
  const interactionClasses =
    isDisabled
      ? 'cursor-not-allowed opacity-60'
      : isActive
        ? 'ring-2 ring-offset-2 shadow-md -translate-y-0.5'
        : 'hover:-translate-y-0.5 hover:shadow-md'

  switch (filter) {
    case 'nearby':
      return `border-green-100 bg-green-50 ${
        isDisabled
          ? ''
          : 'hover:border-green-200'
      } ${
        isActive
          ? 'ring-green-500'
          : ''
      } ${interactionClasses}`

    case 'saved':
      return `border-yellow-100 bg-yellow-50 ${
        isDisabled
          ? ''
          : 'hover:border-yellow-200'
      } ${
        isActive
          ? 'ring-yellow-500'
          : ''
      } ${interactionClasses}`

    case 'expiring':
      return `border-orange-100 bg-orange-50 ${
        isDisabled
          ? ''
          : 'hover:border-orange-200'
      } ${
        isActive
          ? 'ring-orange-500'
          : ''
      } ${interactionClasses}`

    case 'all':
      return `border-blue-100 bg-blue-50 ${
        isDisabled
          ? ''
          : 'hover:border-blue-200'
      } ${
        isActive
          ? 'ring-blue-500'
          : ''
      } ${interactionClasses}`
  }
}

export function getCustomerDealShortcutCountClasses(
  filter: CustomerDealFilter
): string {
  switch (filter) {
    case 'nearby':
      return 'text-green-700'

    case 'saved':
      return 'text-yellow-700'

    case 'expiring':
      return 'text-orange-700'

    case 'all':
      return 'text-blue-700'
  }
}

export function getCustomerDealShortcutHeadingClasses({
  filter,
  isDisabled,
}: {
  filter: CustomerDealFilter
  isDisabled: boolean
}): string {
  if (isDisabled) {
    return ''
  }

  switch (filter) {
    case 'nearby':
      return 'group-hover:text-green-700'

    case 'saved':
      return 'group-hover:text-yellow-700'

    case 'expiring':
      return 'group-hover:text-orange-700'

    case 'all':
      return 'group-hover:text-blue-700'
  }
}

export function getCustomerDealShortcutStatusClasses({
  isActive,
  isDisabled,
}: {
  isActive: boolean
  isDisabled: boolean
}): string {
  if (isActive) {
    return 'text-gray-700'
  }

  if (isDisabled) {
    return 'text-gray-500'
  }

  return 'text-gray-600'
}
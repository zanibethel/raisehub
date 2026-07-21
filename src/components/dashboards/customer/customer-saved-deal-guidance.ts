// =============================================================================
// Saved-deal summary labels
// =============================================================================

export function getCustomerSavedDealCountLabel(
  count: number
): string {
  return count === 1
    ? '1 saved deal'
    : `${count} saved deals`
}

export function getCustomerUnusedSavedDealCountLabel(
  count: number
): string {
  return count === 1
    ? '1 ready to use'
    : `${count} ready to use`
}

// =============================================================================
// My Pass guidance
// =============================================================================

export function getCustomerSavedDealGuidance({
  savedDealCount,
  unusedSavedDealCount,
}: {
  savedDealCount: number
  unusedSavedDealCount: number
}): {
  eyebrow: string
  title: string
  description: string
} {
  if (savedDealCount === 0) {
    return {
      eyebrow: 'Nothing Saved Yet',
      title:
        'Save a deal you plan to use',
      description:
        'Browse your available offers and save your favorites. They will appear here so you can find and redeem them quickly.',
    }
  }

  if (unusedSavedDealCount === 0) {
    return {
      eyebrow: 'All Caught Up',
      title:
        'You have used every saved deal',
      description:
        'Browse the available offers below and save another deal whenever you find one you want to use.',
    }
  }

  if (unusedSavedDealCount === 1) {
    return {
      eyebrow: 'Ready When You Are',
      title:
        'You have 1 saved deal ready to use',
      description:
        'Open the deal when you arrive at the business, review the details, and redeem it when the business is ready.',
    }
  }

  return {
    eyebrow: 'Ready When You Are',
    title: `You have ${unusedSavedDealCount} saved deals ready to use`,
    description:
      'Choose the deal you want, review its details, and redeem it when you arrive at the business.',
  }
}
import type {
  CustomerSavedDeal,
} from './customer-saved-deals'

// =============================================================================
// Types
// =============================================================================

export type CustomerSavedDealGroups = {
  readyToUse: CustomerSavedDeal[]
  used: CustomerSavedDeal[]
}

// =============================================================================
// Grouping
// =============================================================================

export function getCustomerSavedDealGroups(
  savedDeals: CustomerSavedDeal[]
): CustomerSavedDealGroups {
  return savedDeals.reduce<CustomerSavedDealGroups>(
    (groups, deal) => {
      if (deal.isRedeemed) {
        groups.used.push(deal)
      } else {
        groups.readyToUse.push(deal)
      }

      return groups
    },
    {
      readyToUse: [],
      used: [],
    }
  )
}

// =============================================================================
// Section labels
// =============================================================================

export function getCustomerSavedDealGroupCountLabel({
  count,
  singularLabel,
  pluralLabel,
}: {
  count: number
  singularLabel: string
  pluralLabel: string
}): string {
  return count === 1
    ? `1 ${singularLabel}`
    : `${count} ${pluralLabel}`
}

export function getCustomerReadyToUseDealCountLabel(
  count: number
): string {
  return getCustomerSavedDealGroupCountLabel({
    count,
    singularLabel: 'deal',
    pluralLabel: 'deals',
  })
}

export function getCustomerUsedDealCountLabel(
  count: number
): string {
  return getCustomerSavedDealGroupCountLabel({
    count,
    singularLabel: 'used deal',
    pluralLabel: 'used deals',
  })
}
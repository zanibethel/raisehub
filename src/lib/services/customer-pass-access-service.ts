import { getCustomerEntitlementsForUser } from '../repositories/customer-entitlement-repository'
import { isCustomerEntitlementActive } from '../rules/identity-access-rules'
import type { CustomerEntitlementRecord } from '../types/identity-access'

export type CustomerPassAccessResult = {
  hasActivePass: boolean
  activeEntitlement: CustomerEntitlementRecord | null
  error: string | null
}

/**
 * Resolve a customer's current RaiseHub pass access from the shared
 * entitlement repository and entitlement lifecycle rules.
 *
 * Pages and server actions should use this service instead of querying
 * customer_entitlements directly so status, start date, expiration,
 * revocation, and linked payment checks remain consistent.
 */
export async function getCustomerPassAccess(
  userId: string,
  now = new Date()
): Promise<CustomerPassAccessResult> {
  const { entitlements, error } =
    await getCustomerEntitlementsForUser(userId)

  if (error) {
    return {
      hasActivePass: false,
      activeEntitlement: null,
      error,
    }
  }

  const activeEntitlement =
    entitlements.find((entitlement) =>
      isCustomerEntitlementActive(entitlement, now)
    ) ?? null

  return {
    hasActivePass: activeEntitlement !== null,
    activeEntitlement,
    error: null,
  }
}

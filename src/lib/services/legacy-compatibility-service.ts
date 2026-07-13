import {
  getLegacyWorkspaceRole,
  isLegacyPurchaseActive,
} from '../rules/identity-access-rules.ts'
import type {
  AuthenticatedActor,
  BusinessRow,
  OrganizationRow,
  WorkspaceRole,
} from '../types/identity-access.ts'

export function resolveLegacyWorkspaceRole(
  legacyRole: string | null | undefined
): WorkspaceRole | null {
  return getLegacyWorkspaceRole(legacyRole)
}

export function isLegacyBusinessEntityOwner(
  actor: AuthenticatedActor,
  business: Pick<BusinessRow, 'legacy_profile_id'>
): boolean {
  return (
    actor.legacyRole === 'business' &&
    business.legacy_profile_id === actor.id
  )
}

export function isLegacyOrganizationEntityAdmin(
  actor: AuthenticatedActor,
  organization: Pick<OrganizationRow, 'legacy_profile_id'>
): boolean {
  return (
    actor.legacyRole === 'organization' &&
    organization.legacy_profile_id === actor.id
  )
}

export function isLegacyCampaignOwner(
  actor: AuthenticatedActor,
  organizationLegacyProfileId: string
): boolean {
  return (
    actor.legacyRole === 'organization' &&
    actor.id === organizationLegacyProfileId
  )
}

export async function hasLegacyCustomerPassAccess(
  userId: string
): Promise<boolean> {
  const { hasCustomerNonFailedPurchase } = await import(
    '../repositories/customer-purchase-repository.ts'
  )
  const { hasPurchase, error } =
    await hasCustomerNonFailedPurchase(userId)

  if (error) {
    throw new Error(error)
  }

  return hasPurchase
}

export { isLegacyPurchaseActive }

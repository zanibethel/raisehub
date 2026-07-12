import type {
  WorkspaceCardData,
  WorkspaceRole,
} from '@/components/platform/workspace-card'
import {
  getBusinessOffers,
  type BusinessOffer,
} from '@/lib/repositories/business-offer-repository'
import {
  authorizeOwnerWorkspaceRead,
  type OwnerWorkspaceAuthorizationFailureReason,
} from '@/lib/services/owner-workspace-authorization-service'

// =============================================================================
// Types
// =============================================================================

export type ReadOnlyBusinessOffer = {
  id: string
  title: string
  discount: string | null
  description: string | null
  usageRule: string
  isActive: boolean
  startsAt: string | null
  endsAt: string | null
  expiresAt: string | null
  createdAt: string
}

export type OwnerBusinessOffersResult =
  | {
      success: true
      workspace: WorkspaceCardData
      offers: ReadOnlyBusinessOffer[]
    }
  | {
      success: false
      reason:
        | OwnerWorkspaceAuthorizationFailureReason
        | 'invalid-workspace-role'
        | 'offer-lookup-failure'
      message: string
    }

// =============================================================================
// Mapping
// =============================================================================

function mapOfferRecordToReadOnlyOffer(
  offer: BusinessOffer
): ReadOnlyBusinessOffer {
  return {
    id: offer.id,
    title: offer.title,
    discount: offer.discount,
    description: offer.description,
    usageRule: offer.usage_rule,
    isActive: offer.is_active,
    startsAt: offer.starts_at,
    endsAt: offer.ends_at,
    expiresAt: offer.expires_at,
    createdAt: offer.created_at,
  }
}

// =============================================================================
// Service
// =============================================================================

export async function getOwnerAuthorizedBusinessOffers(
  workspaceId: string,
  workspaceRole: WorkspaceRole
): Promise<OwnerBusinessOffersResult> {
  if (workspaceRole !== 'business') {
    return {
      success: false,
      reason: 'invalid-workspace-role',
      message: 'Business offers are only available for business workspaces.',
    }
  }

  const authorizationResult =
    await authorizeOwnerWorkspaceRead(
      workspaceId,
      workspaceRole
    )

  if (!authorizationResult.authorized) {
    return {
      success: false,
      reason: authorizationResult.reason,
      message: authorizationResult.message,
    }
  }

  const { workspace } = authorizationResult

  const { offers, error } = await getBusinessOffers(
    workspace.id
  )

  if (error) {
    return {
      success: false,
      reason: 'offer-lookup-failure',
      message: 'Unable to load business offers.',
    }
  }

  return {
    success: true,
    workspace,
    offers: offers.map(mapOfferRecordToReadOnlyOffer),
  }
}

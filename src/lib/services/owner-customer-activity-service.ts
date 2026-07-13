import type {
  WorkspaceCardData,
  WorkspaceRole,
} from '@/components/platform/workspace-card'
import {
  getCustomerPurchases,
  type CustomerPurchaseRecord,
} from '@/lib/repositories/customer-purchase-repository'
import {
  getCustomerSavedOffers,
  type CustomerSavedOfferRecord,
} from '@/lib/repositories/customer-saved-offer-repository'
import {
  getCustomerRedemptions,
  type CustomerRedemptionRecord,
} from '@/lib/repositories/customer-redemption-repository'
import {
  authorizeOwnerWorkspaceRead,
  type OwnerWorkspaceAuthorizationFailureReason,
} from '@/lib/services/owner-workspace-authorization-service'

// =============================================================================
// Types
// =============================================================================

export type ReadOnlyCustomerPurchase = {
  id: string
  campaignId: string
  campaignName: string | null
  selectedOrganizationId: string | null
  organizationName: string | null
  amountPaid: number
  donationAmount: number
  paymentStatus: string
  createdAt: string
}

export type ReadOnlyCustomerSavedOffer = {
  id: string
  offerId: string
  offerTitle: string | null
  businessName: string | null
  createdAt: string
}

export type ReadOnlyCustomerRedemption = {
  id: string
  offerId: string | null
  offerTitle: string | null
  businessName: string | null
  createdAt: string | null
}

export type OwnerCustomerActivityResult =
  | {
      success: true
      workspace: WorkspaceCardData
      purchases: ReadOnlyCustomerPurchase[]
      savedOffers: ReadOnlyCustomerSavedOffer[]
      redemptions: ReadOnlyCustomerRedemption[]
    }
  | {
      success: false
      reason:
        | OwnerWorkspaceAuthorizationFailureReason
        | 'invalid-workspace-role'
        | 'customer-activity-lookup-failure'
      message: string
    }

// =============================================================================
// Mapping
// =============================================================================

function mapPurchaseRecord(
  record: CustomerPurchaseRecord
): ReadOnlyCustomerPurchase {
  return {
    id: record.id,
    campaignId: record.campaign_id,
    campaignName: record.campaign_name,
    selectedOrganizationId: record.selected_organization_id,
    organizationName: record.organization_name,
    amountPaid: record.amount_paid,
    donationAmount: record.donation_amount,
    paymentStatus: record.payment_status,
    createdAt: record.created_at,
  }
}

function mapSavedOfferRecord(
  record: CustomerSavedOfferRecord
): ReadOnlyCustomerSavedOffer {
  return {
    id: record.id,
    offerId: record.offer_id,
    offerTitle: record.offer_title,
    businessName: record.business_name,
    createdAt: record.created_at,
  }
}

function mapRedemptionRecord(
  record: CustomerRedemptionRecord
): ReadOnlyCustomerRedemption {
  return {
    id: record.id,
    offerId: record.offer_id,
    offerTitle: record.offer_title,
    businessName: record.business_name,
    createdAt: record.created_at,
  }
}

// =============================================================================
// Service
// =============================================================================

export async function getOwnerAuthorizedCustomerActivity(
  workspaceId: string,
  workspaceRole: WorkspaceRole
): Promise<OwnerCustomerActivityResult> {
  if (workspaceRole !== 'customer') {
    return {
      success: false,
      reason: 'invalid-workspace-role',
      message:
        'Customer activity is only available for customer workspaces.',
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

  // Run all three repository calls in parallel after authorization.
  const [purchasesResult, savedOffersResult, redemptionsResult] =
    await Promise.all([
      getCustomerPurchases(workspace.id),
      getCustomerSavedOffers(workspace.id),
      getCustomerRedemptions(workspace.id),
    ])

  // Any repository failure returns a safe service-level error.
  if (
    purchasesResult.error ||
    savedOffersResult.error ||
    redemptionsResult.error
  ) {
    return {
      success: false,
      reason: 'customer-activity-lookup-failure',
      message: 'Unable to load customer activity.',
    }
  }

  return {
    success: true,
    workspace,
    purchases: purchasesResult.purchases.map(mapPurchaseRecord),
    savedOffers: savedOffersResult.savedOffers.map(
      mapSavedOfferRecord
    ),
    redemptions: redemptionsResult.redemptions.map(
      mapRedemptionRecord
    ),
  }
}

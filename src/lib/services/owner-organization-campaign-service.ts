import type {
  WorkspaceCardData,
  WorkspaceRole,
} from '@/lib/types/identity-access'
import {
  getOrganizationCampaigns,
  type OrganizationCampaign,
} from '@/lib/repositories/organization-campaign-repository'
import {
  resolveEffectiveCampaignPricingBatch,
  type EffectivePricingResult,
} from '@/lib/services/pricing-resolution-service'
import {
  authorizeOwnerWorkspaceRead,
  type OwnerWorkspaceAuthorizationFailureReason,
} from '@/lib/services/owner-workspace-authorization-service'

// =============================================================================
// Types
// =============================================================================

export type ReadOnlyOrganizationCampaign = {
  id: string
  name: string
  description: string | null
  status: string
  goalAmount: number | null
  passPrice: number
  startsAt: string | null
  endsAt: string | null
  createdAt: string
}

export type OwnerOrganizationCampaignsResult =
  | {
      success: true
      workspace: WorkspaceCardData
      campaigns: ReadOnlyOrganizationCampaign[]
    }
  | {
      success: false
      reason:
        | OwnerWorkspaceAuthorizationFailureReason
        | 'invalid-workspace-role'
        | 'campaign-lookup-failure'
      message: string
    }

// =============================================================================
// Demo-state resolution
// =============================================================================

function isDemoWorkspace(
  workspace: WorkspaceCardData
): boolean {
  return (
    'isDemo' in workspace &&
    Boolean(workspace.isDemo)
  )
}

// =============================================================================
// Mapping
// =============================================================================

function mapCampaignRecordToReadOnlyCampaign({
  campaign,
  pricing,
}: {
  campaign: OrganizationCampaign
  pricing: EffectivePricingResult
}): ReadOnlyOrganizationCampaign {
  return {
    id: campaign.id,
    name: campaign.name,
    description: campaign.description,
    status: campaign.status,
    goalAmount: campaign.goal_amount,
    passPrice: pricing.passPrice,
    startsAt: campaign.starts_at,
    endsAt: campaign.ends_at,
    createdAt: campaign.created_at,
  }
}

// =============================================================================
// Service
// =============================================================================

export async function getOwnerAuthorizedOrganizationCampaigns(
  workspaceId: string,
  workspaceRole: WorkspaceRole
): Promise<OwnerOrganizationCampaignsResult> {
  if (workspaceRole !== 'organization') {
    return {
      success: false,
      reason: 'invalid-workspace-role',
      message:
        'Organization campaigns are only available for organization workspaces.',
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

  const { workspace } =
    authorizationResult

  const { campaigns, error } =
    await getOrganizationCampaigns(
      workspace.id
    )

  if (error) {
    return {
      success: false,
      reason: 'campaign-lookup-failure',
      message:
        'Unable to load organization campaigns.',
    }
  }

  const {
    pricingByCampaignId,
  } =
    await resolveEffectiveCampaignPricingBatch(
      campaigns.map((campaign) => ({
        campaignId: campaign.id,
        organizationId: workspace.id,
        isDemo:
          isDemoWorkspace(workspace),
      }))
    )

  return {
    success: true,
    workspace,
    campaigns: campaigns.map(
      (campaign) =>
        mapCampaignRecordToReadOnlyCampaign({
          campaign,
          pricing:
            pricingByCampaignId.get(
              campaign.id
            ) ?? {
              pricingRuleId: null,
              pricingScope: 'fallback',
              passPrice: 20,
              platformFeePercent: 10,
              platformFeeAmount: 2,
              organizationPassEarnings: 18,
              donationAmount: 0,
              organizationTotalEarnings: 18,
              totalAmount: 20,
              startsAt: null,
              expiresAt: null,
              reason:
                'Emergency pricing fallback',
              usedFallback: true,
            },
        })
    ),
  }
}
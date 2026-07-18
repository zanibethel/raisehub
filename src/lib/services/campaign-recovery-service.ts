import { isCampaignCurrentlySellable } from '../rules/identity-access-rules'
import {
  getCampaignById,
  getCampaignRecoveryContext,
  getSellableCampaigns,
} from '../repositories/campaign-repository'
import type { CampaignRow } from '../types/identity-access'
import type {
  CampaignRecoveryResult,
  SellableCampaignOption,
  SellableCampaignQueryOptions,
} from '../types/campaigns'

export type CampaignRecoveryCampaign = Pick<
  CampaignRow,
  | 'id'
  | 'organization_id'
  | 'status'
  | 'starts_at'
  | 'ends_at'
>

export type CampaignRecoveryContext = {
  campaignId: string
  organizationLegacyProfileId: string
}

export type CampaignRecoveryDependencies = {
  now?: () => Date
  loadCampaignById(
    campaignId: string
  ): Promise<CampaignRecoveryCampaign | null>
  loadCampaignRecoveryContext(
    campaignId: string
  ): Promise<CampaignRecoveryContext | null>
  loadSellableCampaigns(
    options: SellableCampaignQueryOptions
  ): Promise<SellableCampaignOption[]>
}

export function createCampaignRecoveryService(
  dependencies: CampaignRecoveryDependencies
) {
  const getNow = () =>
    dependencies.now?.() ?? new Date()

  async function resolveCampaignRecovery(
    campaignId: string
  ): Promise<CampaignRecoveryResult> {
    try {
      const campaign =
        await dependencies.loadCampaignById(
          campaignId
        )

      const now = getNow()

      if (
        campaign &&
        isCampaignCurrentlySellable(
          campaign,
          now
        )
      ) {
        return {
          status:
            'current-campaign-valid',
          campaignId,
        }
      }

      let replacementOrganizationLegacyProfileId =
        campaign?.organization_id ?? null

      if (
        !replacementOrganizationLegacyProfileId
      ) {
        const recoveryContext =
          await dependencies.loadCampaignRecoveryContext(
            campaignId
          )

        if (!recoveryContext) {
          return {
            status:
              'no-valid-campaign',
            replacedCampaignId: null,
          }
        }

        replacementOrganizationLegacyProfileId =
          recoveryContext.organizationLegacyProfileId
      }

      const campaigns =
        await dependencies.loadSellableCampaigns(
          {
            organizationLegacyProfileId:
              replacementOrganizationLegacyProfileId,
            excludeCampaignId:
              campaign?.id ??
              campaignId,
            now,
          }
        )

      if (campaigns.length === 1) {
        return {
          status: 'replacement-found',
          campaignId:
            campaigns[0].id,
          replacedCampaignId:
            campaign?.id ??
            campaignId,
        }
      }

      if (campaigns.length > 1) {
        return {
          status:
            'selection-required',
          replacedCampaignId:
            campaign?.id ??
            campaignId,
          campaigns,
        }
      }

      return {
        status: 'no-valid-campaign',
        replacedCampaignId:
          campaign?.id ??
          campaignId,
      }
    } catch {
      return {
        status: 'lookup-failure',
      }
    }
  }

  return {
    resolveCampaignRecovery,
  }
}

export async function resolveCampaignRecovery(
  campaignId: string,
  now = new Date()
): Promise<CampaignRecoveryResult> {
  const service =
    createCampaignRecoveryService({
      now: () => now,

      async loadCampaignById(id) {
        const { campaign, error } =
          await getCampaignById(id)

        if (error) {
          throw new Error(error)
        }

        return campaign
      },

      async loadCampaignRecoveryContext(
        id
      ) {
        const { context, error } =
          await getCampaignRecoveryContext(
            id
          )

        if (error) {
          throw new Error(error)
        }

        if (!context) {
          return null
        }

        return {
          campaignId:
            context.campaign_id,
          organizationLegacyProfileId:
            context.organization_legacy_profile_id,
        }
      },

      async loadSellableCampaigns(
        options
      ) {
        const { campaigns, error } =
          await getSellableCampaigns(
            options
          )

        if (error) {
          throw new Error(error)
        }

        return campaigns
      },
    })

  return service.resolveCampaignRecovery(
    campaignId
  )
}
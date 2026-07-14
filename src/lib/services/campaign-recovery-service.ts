import { isCampaignCurrentlySellable } from '../rules/identity-access-rules'
import { getCampaignById, getSellableCampaigns } from '../repositories/campaign-repository'
import type { CampaignRow } from '../types/identity-access'
import type {
  CampaignRecoveryResult,
  SellableCampaignOption,
  SellableCampaignQueryOptions,
} from '../types/campaigns'

export type CampaignRecoveryDependencies = {
  now?: () => Date
  loadCampaignById(campaignId: string): Promise<CampaignRow | null>
  loadSellableCampaigns(
    options: SellableCampaignQueryOptions
  ): Promise<SellableCampaignOption[]>
}

export function createCampaignRecoveryService(
  dependencies: CampaignRecoveryDependencies
) {
  const getNow = () => dependencies.now?.() ?? new Date()

  async function resolveCampaignRecovery(
    campaignId: string
  ): Promise<CampaignRecoveryResult> {
    try {
      const campaign = await dependencies.loadCampaignById(campaignId)

      if (!campaign) {
        return {
          status: 'no-valid-campaign',
          replacedCampaignId: null,
        }
      }

      if (isCampaignCurrentlySellable(campaign, getNow())) {
        return {
          status: 'current-campaign-valid',
          campaignId,
        }
      }

      const campaigns = await dependencies.loadSellableCampaigns({
        organizationLegacyProfileId: campaign.organization_id,
        excludeCampaignId: campaign.id,
        now: getNow(),
      })

      if (campaigns.length === 1) {
        return {
          status: 'replacement-found',
          campaignId: campaigns[0].id,
          replacedCampaignId: campaign.id,
        }
      }

      if (campaigns.length > 1) {
        return {
          status: 'selection-required',
          replacedCampaignId: campaign.id,
          campaigns,
        }
      }

      return {
        status: 'no-valid-campaign',
        replacedCampaignId: campaign.id,
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
  const service = createCampaignRecoveryService({
    now: () => now,
    async loadCampaignById(id) {
      const { campaign, error } = await getCampaignById(id)

      if (error) {
        throw new Error(error)
      }

      return campaign
    },
    async loadSellableCampaigns(options) {
      const { campaigns, error } = await getSellableCampaigns(options)

      if (error) {
        throw new Error(error)
      }

      return campaigns
    },
  })

  return service.resolveCampaignRecovery(campaignId)
}

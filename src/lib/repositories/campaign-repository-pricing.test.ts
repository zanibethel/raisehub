import assert from 'node:assert/strict'
import test from 'node:test'

import { createSellableCampaignLookupService } from './campaign-repository'
import type {
  SellableCampaignSource,
} from '../rules/campaign-progress-rules'

type PricingRequest = {
  campaignId: string
  organizationId: string | null
}

function createCampaign({
  id,
  organizationLegacyProfileId,
  createdAt = '2026-07-01T12:00:00.000Z',
}: {
  id: string
  organizationLegacyProfileId: string
  createdAt?: string
}): SellableCampaignSource {
  return {
    id,
    organization_id:
      organizationLegacyProfileId,
    name: `Campaign ${id}`,
    description: null,
    goal_amount: 1000,
    starts_at: '2026-07-01',
    ends_at: '2026-08-01',
    status: 'active',
    created_at: createdAt,
  }
}

function createBaseDependencies({
  campaigns,
}: {
  campaigns: SellableCampaignSource[]
}) {
  const organizationIds = [
    ...new Set(
      campaigns.map(
        (campaign) =>
          campaign.organization_id
      )
    ),
  ]

  return {
    async resolveOrganizationLegacyProfileId() {
      return {
        organizationId: null,
        organizationLegacyProfileId: null,
        organizationName: null,
        imageUrl: null,
        error: null,
      }
    },

    async loadEligibleCampaignIds() {
      return {
        campaignIds: [],
        error: null,
      }
    },

    async loadCampaignRows() {
      return {
        campaigns,
        error: null,
      }
    },

    async loadOrganizationsByLegacyProfileIds() {
      return {
        organizations:
          organizationIds.map(
            (
              organizationLegacyProfileId,
              index
            ) => ({
              organizationId:
                `organization-${index + 1}`,
              organizationLegacyProfileId,
              organizationName:
                `Organization ${index + 1}`,
              imageUrl: null,
            })
          ),
        error: null,
      }
    },

    async loadPublicCampaignProgress(
      campaignIds: string[]
    ) {
      return {
        amountRaisedByCampaignId:
          new Map(
            campaignIds.map(
              (campaignId) => [
                campaignId,
                250,
              ]
            )
          ),
        error: null,
      }
    },
  }
}

test(
  'uses managed pricing returned by the campaign pricing dependency',
  async () => {
    const campaign = createCampaign({
      id: 'campaign-1',
      organizationLegacyProfileId:
        'legacy-organization-1',
    })

    const pricingRequests:
      PricingRequest[] = []

    const service =
      createSellableCampaignLookupService({
        ...createBaseDependencies({
          campaigns: [campaign],
        }),

        async loadEffectiveCampaignPricing(
          inputs
        ) {
          pricingRequests.push(...inputs)

          return new Map([
            ['campaign-1', 25],
          ])
        },
      })

    const result =
      await service.getSellableCampaigns({
        now: new Date(
          '2026-07-15T12:00:00.000Z'
        ),
      })

    assert.equal(result.error, null)
    assert.equal(
      result.errorSource,
      null
    )
    assert.equal(
      result.campaigns.length,
      1
    )
    assert.equal(
      result.campaigns[0]?.passPrice,
      25
    )

    assert.deepEqual(pricingRequests, [
      {
        campaignId: 'campaign-1',
        organizationId:
          'organization-1',
      },
    ])
  }
)

test(
  'loads managed pricing for multiple campaigns in one batch call',
  async () => {
    const campaigns = [
      createCampaign({
        id: 'campaign-1',
        organizationLegacyProfileId:
          'legacy-organization-1',
        createdAt:
          '2026-07-01T12:00:00.000Z',
      }),
      createCampaign({
        id: 'campaign-2',
        organizationLegacyProfileId:
          'legacy-organization-2',
        createdAt:
          '2026-07-02T12:00:00.000Z',
      }),
    ]

    const pricingCalls:
      PricingRequest[][] = []

    const service =
      createSellableCampaignLookupService({
        ...createBaseDependencies({
          campaigns,
        }),

        async loadEffectiveCampaignPricing(
          inputs
        ) {
          pricingCalls.push(inputs)

          return new Map([
            ['campaign-1', 25],
            ['campaign-2', 30],
          ])
        },
      })

    const result =
      await service.getSellableCampaigns({
        now: new Date(
          '2026-07-15T12:00:00.000Z'
        ),
      })

    assert.equal(result.error, null)
    assert.equal(
      pricingCalls.length,
      1
    )

    assert.deepEqual(
      pricingCalls[0],
      [
        {
          campaignId: 'campaign-1',
          organizationId:
            'organization-1',
        },
        {
          campaignId: 'campaign-2',
          organizationId:
            'organization-2',
        },
      ]
    )

    assert.deepEqual(
      result.campaigns.map(
        (campaign) => ({
          id: campaign.id,
          passPrice:
            campaign.passPrice,
        })
      ),
      [
        {
          id: 'campaign-1',
          passPrice: 25,
        },
        {
          id: 'campaign-2',
          passPrice: 30,
        },
      ]
    )
  }
)

test(
  'uses the emergency price returned by managed pricing',
  async () => {
    const campaign = createCampaign({
      id: 'campaign-1',
      organizationLegacyProfileId:
        'legacy-organization-1',
    })

    const service =
      createSellableCampaignLookupService({
        ...createBaseDependencies({
          campaigns: [campaign],
        }),

        async loadEffectiveCampaignPricing() {
          return new Map([
            ['campaign-1', 20],
          ])
        },
      })

    const result =
      await service.getSellableCampaigns({
        now: new Date(
          '2026-07-15T12:00:00.000Z'
        ),
      })

    assert.equal(result.error, null)
    assert.equal(
      result.errorSource,
      null
    )
    assert.equal(
      result.campaigns[0]?.passPrice,
      20
    )
  }
)
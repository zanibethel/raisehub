import assert from 'node:assert/strict'
import test from 'node:test'

import { createSellableCampaignLookupService } from './campaign-repository'
import type { CampaignRow } from '../types/identity-access'

function createCampaign({
  id,
  organizationLegacyProfileId,
  passPrice,
}: {
  id: string
  organizationLegacyProfileId: string
  passPrice: number
}): CampaignRow {
  return {
    id,
    organization_id:
      organizationLegacyProfileId,
    name: `Campaign ${id}`,
    description: null,
    goal_amount: 1000,
    pass_price: passPrice,
    starts_at: '2026-07-01',
    ends_at: '2026-08-01',
    status: 'active',
    created_at:
      '2026-07-01T12:00:00.000Z',
  } as CampaignRow
}

test(
  'uses managed pricing returned by the campaign pricing dependency',
  async () => {
    const campaign = createCampaign({
      id: 'campaign-1',
      organizationLegacyProfileId:
        'legacy-organization-1',
      passPrice: 20,
    })

    const pricingRequests: Array<{
      campaignId: string
      organizationId: string | null
    }> = []

    const service =
      createSellableCampaignLookupService({
        async resolveOrganizationLegacyProfileId() {
          return {
            organizationId: null,
            organizationLegacyProfileId:
              null,
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
            campaigns: [campaign],
            error: null,
          }
        },

        async loadOrganizationsByLegacyProfileIds() {
          return {
            organizations: [
              {
                organizationId:
                  'organization-1',
                organizationLegacyProfileId:
                  'legacy-organization-1',
                organizationName:
                  'Band Boosters',
                imageUrl: null,
              },
            ],
            error: null,
          }
        },

        async loadPublicCampaignProgress() {
          return {
            amountRaisedByCampaignId:
              new Map([
                ['campaign-1', 250],
              ]),
            error: null,
          }
        },

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
  'retains legacy pricing when the optional pricing dependency is absent',
  async () => {
    const campaign = createCampaign({
      id: 'campaign-1',
      organizationLegacyProfileId:
        'legacy-organization-1',
      passPrice: 20,
    })

    const service =
      createSellableCampaignLookupService({
        async resolveOrganizationLegacyProfileId() {
          return {
            organizationId: null,
            organizationLegacyProfileId:
              null,
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
            campaigns: [campaign],
            error: null,
          }
        },

        async loadOrganizationsByLegacyProfileIds() {
          return {
            organizations: [
              {
                organizationId:
                  'organization-1',
                organizationLegacyProfileId:
                  'legacy-organization-1',
                organizationName:
                  'Band Boosters',
                imageUrl: null,
              },
            ],
            error: null,
          }
        },

        async loadPublicCampaignProgress() {
          return {
            amountRaisedByCampaignId:
              new Map([
                ['campaign-1', 250],
              ]),
            error: null,
          }
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
      result.campaigns[0]?.passPrice,
      20
    )
  }
)
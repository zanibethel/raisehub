import assert from 'node:assert/strict'
import test from 'node:test'

import { createSellableCampaignLookupService } from './campaign-repository'
import type { CampaignRow } from '../types/identity-access'

function createCampaign(overrides: Partial<CampaignRow> = {}): CampaignRow {
  return {
    id: 'campaign-1',
    organization_id: 'legacy-organization-1',
    name: 'Fall Fundraiser',
    description: null,
    goal_amount: 5000,
    pass_price: 25,
    starts_at: '2026-07-01T00:00:00.000Z',
    ends_at: '2026-08-01T00:00:00.000Z',
    status: 'active',
    created_at: '2026-07-01T00:00:00.000Z',
    ...overrides,
  }
}

function createService(input?: {
  campaigns?: CampaignRow[]
  progress?: Array<{
    campaign_id: string
    amount_raised: number
  }>
  progressError?: string | null
}) {
  return createSellableCampaignLookupService({
    resolveOrganizationLegacyProfileId: async () => ({
      organizationId: 'organization-1',
      organizationLegacyProfileId: 'legacy-organization-1',
      organizationName: 'Roosevelt Football',
      imageUrl: null,
      error: null,
    }),
    loadEligibleCampaignIds: async () => ({
      campaignIds: [],
      error: null,
    }),
    loadCampaignRows: async () => ({
      campaigns: input?.campaigns ?? [createCampaign()],
      error: null,
    }),
    loadOrganizationsByLegacyProfileIds: async () => ({
      organizations: [
        {
          id: 'organization-1',
          legacy_profile_id: 'legacy-organization-1',
          name: 'Roosevelt Football',
          logo_url: null,
        },
        {
          id: 'organization-2',
          legacy_profile_id: 'legacy-organization-2',
          name: 'Lincoln PTO',
          logo_url: null,
        },
      ],
      error: null,
    }),
    loadPublicCampaignProgress: async () => ({
      progress: input?.progress ?? [],
      error: input?.progressError ?? null,
    }),
  })
}

test('aggregate campaign progress is mapped to the matching campaign card', async () => {
  const service = createService({
    campaigns: [
      createCampaign(),
      createCampaign({
        id: 'campaign-2',
        organization_id: 'legacy-organization-2',
        name: 'Band Boosters',
        created_at: '2026-07-02T00:00:00.000Z',
      }),
    ],
    progress: [
      {
        campaign_id: 'campaign-1',
        amount_raised: 1200,
      },
      {
        campaign_id: 'campaign-2',
        amount_raised: 375,
      },
    ],
  })

  const result = await service.getSellableCampaigns()
  const amountRaisedByCampaignId = new Map(
    result.campaigns.map((campaign) => [campaign.id, campaign.amountRaised])
  )

  assert.equal(result.error, null)
  assert.equal(result.errorSource, null)
  assert.equal(amountRaisedByCampaignId.get('campaign-1'), 1200)
  assert.equal(amountRaisedByCampaignId.get('campaign-2'), 375)
})

test('missing aggregate rows safely default campaign cards to zero raised', async () => {
  const service = createService({
    campaigns: [
      createCampaign(),
      createCampaign({
        id: 'campaign-2',
        organization_id: 'legacy-organization-2',
        name: 'Band Boosters',
        created_at: '2026-07-02T00:00:00.000Z',
      }),
    ],
    progress: [
      {
        campaign_id: 'campaign-1',
        amount_raised: 900,
      },
    ],
  })

  const result = await service.getSellableCampaigns()
  const secondCampaign = result.campaigns.find(
    (campaign) => campaign.id === 'campaign-2'
  )

  assert.equal(result.error, null)
  assert.equal(secondCampaign?.amountRaised, 0)
})

test('aggregate progress RPC failures remain distinguishable from an empty campaign state', async () => {
  const service = createService({
    campaigns: [createCampaign()],
    progressError: 'progress rpc failed',
  })

  const result = await service.getSellableCampaigns()

  assert.deepEqual(result, {
    campaigns: [],
    error: 'progress rpc failed',
    errorSource: 'progress',
  })
})

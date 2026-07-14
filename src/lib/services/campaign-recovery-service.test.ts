import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createCampaignRecoveryService,
} from './campaign-recovery-service'
import type { CampaignRow } from '../types/identity-access'
import type { SellableCampaignOption } from '../types/campaigns'

function createCampaign(
  overrides: Partial<CampaignRow> = {}
): CampaignRow {
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

function createOption(
  overrides: Partial<SellableCampaignOption> = {}
): SellableCampaignOption {
  return {
    id: 'campaign-2',
    organizationId: 'organization-1',
    organizationLegacyProfileId: 'legacy-organization-1',
    name: 'Replacement Campaign',
    organizationName: 'Roosevelt Football',
    imageUrl: null,
    amountRaised: 2500,
    goalAmount: 5000,
    goalPercentage: 50,
    amountRemaining: 2500,
    endsAt: '2026-08-05T00:00:00.000Z',
    daysRemaining: 20,
    createdAt: '2026-07-03T00:00:00.000Z',
    passPrice: 25,
    description: null,
    startsAt: '2026-07-01T00:00:00.000Z',
    status: 'active',
    ...overrides,
  }
}

test('valid campaigns remain selected', async () => {
  const service = createCampaignRecoveryService({
    now: () => new Date('2026-07-15T00:00:00.000Z'),
    loadCampaignById: async () => createCampaign(),
    loadSellableCampaigns: async () => [],
  })

  const result = await service.resolveCampaignRecovery('campaign-1')

  assert.deepEqual(result, {
    status: 'current-campaign-valid',
    campaignId: 'campaign-1',
  })
})

test('one valid replacement automatically resolves, multiple require selection, and none return a safe state', async () => {
  const invalidCampaign = createCampaign({
    ends_at: '2026-07-10T00:00:00.000Z',
  })

  const singleReplacementService = createCampaignRecoveryService({
    now: () => new Date('2026-07-15T00:00:00.000Z'),
    loadCampaignById: async () => invalidCampaign,
    loadSellableCampaigns: async () => [createOption()],
  })

  assert.deepEqual(
    await singleReplacementService.resolveCampaignRecovery('campaign-1'),
    {
      status: 'replacement-found',
      campaignId: 'campaign-2',
      replacedCampaignId: 'campaign-1',
    }
  )

  const multiReplacementService = createCampaignRecoveryService({
    now: () => new Date('2026-07-15T00:00:00.000Z'),
    loadCampaignById: async () => invalidCampaign,
    loadSellableCampaigns: async () => [
      createOption({ id: 'campaign-2' }),
      createOption({ id: 'campaign-3', name: 'Second Campaign' }),
    ],
  })

  const multiResult =
    await multiReplacementService.resolveCampaignRecovery('campaign-1')

  assert.equal(multiResult.status, 'selection-required')
  assert.equal(multiResult.replacedCampaignId, 'campaign-1')
  assert.deepEqual(
    multiResult.campaigns.map((campaign) => campaign.id),
    ['campaign-2', 'campaign-3']
  )

  const noReplacementService = createCampaignRecoveryService({
    now: () => new Date('2026-07-15T00:00:00.000Z'),
    loadCampaignById: async () => invalidCampaign,
    loadSellableCampaigns: async () => [],
  })

  assert.deepEqual(
    await noReplacementService.resolveCampaignRecovery('campaign-1'),
    {
      status: 'no-valid-campaign',
      replacedCampaignId: 'campaign-1',
    }
  )
})

test('missing campaigns and lookup failures produce safe recovery states', async () => {
  const missingService = createCampaignRecoveryService({
    now: () => new Date('2026-07-15T00:00:00.000Z'),
    loadCampaignById: async () => null,
    loadSellableCampaigns: async () => [],
  })

  assert.deepEqual(
    await missingService.resolveCampaignRecovery('missing-campaign'),
    {
      status: 'no-valid-campaign',
      replacedCampaignId: null,
    }
  )

  const failingService = createCampaignRecoveryService({
    now: () => new Date('2026-07-15T00:00:00.000Z'),
    loadCampaignById: async () => {
      throw new Error('db down')
    },
    loadSellableCampaigns: async () => [],
  })

  assert.deepEqual(
    await failingService.resolveCampaignRecovery('campaign-1'),
    { status: 'lookup-failure' }
  )
})

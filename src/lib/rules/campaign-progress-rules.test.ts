import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildSellableCampaignOption,
  compareSellableCampaignOptions,
  isCampaignPurchaseProgressEligible,
} from './campaign-progress-rules'
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
    id: 'campaign-1',
    organizationId: 'organization-1',
    organizationLegacyProfileId: 'legacy-organization-1',
    name: 'Fall Fundraiser',
    organizationName: 'Roosevelt Football',
    imageUrl: null,
    amountRaised: 2500,
    goalAmount: 5000,
    goalPercentage: 50,
    amountRemaining: 2500,
    endsAt: '2026-08-01T00:00:00.000Z',
    daysRemaining: 17,
    createdAt: '2026-07-01T00:00:00.000Z',
    passPrice: 25,
    description: null,
    startsAt: '2026-07-01T00:00:00.000Z',
    status: 'active',
    ...overrides,
  }
}

test('invalid or failed payment states are excluded from campaign progress totals', () => {
  assert.equal(isCampaignPurchaseProgressEligible('test_paid'), true)
  assert.equal(isCampaignPurchaseProgressEligible('succeeded'), true)
  assert.equal(isCampaignPurchaseProgressEligible('failed'), false)
  assert.equal(isCampaignPurchaseProgressEligible('cancelled'), false)
  assert.equal(isCampaignPurchaseProgressEligible('refunded'), false)
  assert.equal(isCampaignPurchaseProgressEligible('disputed'), false)
  assert.equal(isCampaignPurchaseProgressEligible('chargeback'), false)
})

test('sellable campaign options cap progress at 100 and handle missing goals safely', () => {
  const overfunded = buildSellableCampaignOption({
    campaign: createCampaign(),
    organizationId: 'organization-1',
    organizationName: 'Roosevelt Football',
    imageUrl: null,
    amountRaised: 7500,
    now: new Date('2026-07-15T00:00:00.000Z'),
  })
  const noGoal = buildSellableCampaignOption({
    campaign: createCampaign({ id: 'campaign-2', goal_amount: null }),
    organizationId: 'organization-1',
    organizationName: 'Roosevelt Football',
    imageUrl: null,
    amountRaised: 500,
    now: new Date('2026-07-15T00:00:00.000Z'),
  })

  assert.equal(overfunded.goalPercentage, 100)
  assert.equal(overfunded.amountRemaining, 0)
  assert.equal(noGoal.goalPercentage, null)
  assert.equal(noGoal.amountRemaining, null)
})

test('campaign ordering prioritizes nearest expiration, then goal percentage, then stable tie breakers', () => {
  const options = [
    createOption({
      id: 'campaign-c',
      name: 'Campaign C',
      endsAt: null,
      goalPercentage: 90,
      createdAt: '2026-07-03T00:00:00.000Z',
    }),
    createOption({
      id: 'campaign-b',
      name: 'Campaign B',
      endsAt: '2026-08-01T00:00:00.000Z',
      goalPercentage: 80,
      createdAt: '2026-07-02T00:00:00.000Z',
    }),
    createOption({
      id: 'campaign-a',
      name: 'Campaign A',
      endsAt: '2026-08-01T00:00:00.000Z',
      goalPercentage: 95,
      createdAt: '2026-07-01T00:00:00.000Z',
    }),
    createOption({
      id: 'campaign-d',
      name: 'Campaign D',
      endsAt: '2026-07-20T00:00:00.000Z',
      goalPercentage: 20,
      createdAt: '2026-07-04T00:00:00.000Z',
    }),
    createOption({
      id: 'campaign-e',
      name: 'Campaign E',
      endsAt: '2026-08-01T00:00:00.000Z',
      goalPercentage: 95,
      createdAt: '2026-07-01T00:00:00.000Z',
    }),
  ]

  const orderedIds = options
    .sort(compareSellableCampaignOptions)
    .map((campaign) => campaign.id)

  assert.deepEqual(orderedIds, [
    'campaign-d',
    'campaign-a',
    'campaign-e',
    'campaign-b',
    'campaign-c',
  ])
})

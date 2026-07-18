import assert from 'node:assert/strict'
import test from 'node:test'

import { buildSellableCampaignOption } from './campaign-progress-rules'

type CampaignInput =
  Parameters<
    typeof buildSellableCampaignOption
  >[0]['campaign']

function createCampaign(
  passPrice: number | null
): CampaignInput {
  return {
    id: 'campaign-1',
    organization_id: 'organization-profile-1',
    name: 'Band Booster Fundraiser',
    description: 'Support the school band.',
    goal_amount: 1000,
    pass_price: passPrice,
    starts_at: '2026-07-01',
    ends_at: '2026-08-01',
    status: 'active',
    created_at: '2026-07-01T12:00:00.000Z',
  } as CampaignInput
}

test(
  'uses managed pricing instead of the legacy campaign price',
  () => {
    const option = buildSellableCampaignOption({
      campaign: createCampaign(20),
      organizationId: 'organization-1',
      organizationName: 'Band Boosters',
      imageUrl: null,
      amountRaised: 250,
      effectivePassPrice: 25,
      now: new Date('2026-07-15T12:00:00.000Z'),
    })

    assert.equal(option.passPrice, 25)
  }
)

test(
  'uses the legacy campaign price while managed pricing is not supplied',
  () => {
    const option = buildSellableCampaignOption({
      campaign: createCampaign(20),
      organizationId: 'organization-1',
      organizationName: 'Band Boosters',
      imageUrl: null,
      amountRaised: 250,
      now: new Date('2026-07-15T12:00:00.000Z'),
    })

    assert.equal(option.passPrice, 20)
  }
)

test(
  'uses the legacy price when the managed override is invalid',
  () => {
    const option = buildSellableCampaignOption({
      campaign: createCampaign(20),
      organizationId: 'organization-1',
      organizationName: 'Band Boosters',
      imageUrl: null,
      amountRaised: 250,
      effectivePassPrice: 0,
      now: new Date('2026-07-15T12:00:00.000Z'),
    })

    assert.equal(option.passPrice, 20)
  }
)

test(
  'returns no price when neither managed nor legacy pricing is valid',
  () => {
    const option = buildSellableCampaignOption({
      campaign: createCampaign(null),
      organizationId: 'organization-1',
      organizationName: 'Band Boosters',
      imageUrl: null,
      amountRaised: 250,
      effectivePassPrice: Number.NaN,
      now: new Date('2026-07-15T12:00:00.000Z'),
    })

    assert.equal(option.passPrice, null)
  }
)
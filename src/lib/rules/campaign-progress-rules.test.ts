import assert from 'node:assert/strict'
import test from 'node:test'

import { buildSellableCampaignOption } from './campaign-progress-rules'

type CampaignInput =
  Parameters<
    typeof buildSellableCampaignOption
  >[0]['campaign']

function createCampaign(): CampaignInput {
  return {
    id: 'campaign-1',
    organization_id:
      'organization-profile-1',
    name: 'Band Booster Fundraiser',
    description:
      'Support the school band.',
    goal_amount: 1000,
    starts_at: '2026-07-01',
    ends_at: '2026-08-01',
    status: 'active',
    created_at:
      '2026-07-01T12:00:00.000Z',
  }
}

function buildOption(
  effectivePassPrice:
    | number
    | null
    | undefined
) {
  return buildSellableCampaignOption({
    campaign: createCampaign(),
    organizationId:
      'organization-1',
    organizationName:
      'Band Boosters',
    imageUrl: null,
    amountRaised: 250,
    effectivePassPrice,
    now: new Date(
      '2026-07-15T12:00:00.000Z'
    ),
  })
}

test(
  'uses the managed campaign price',
  () => {
    const option =
      buildOption(25)

    assert.equal(
      option.passPrice,
      25
    )
  }
)

test(
  'returns no price when managed pricing is missing',
  () => {
    const option =
      buildOption(undefined)

    assert.equal(
      option.passPrice,
      null
    )
  }
)

test(
  'returns no price when managed pricing is invalid',
  () => {
    const zeroPrice =
      buildOption(0)

    const invalidPrice =
      buildOption(Number.NaN)

    assert.equal(
      zeroPrice.passPrice,
      null
    )

    assert.equal(
      invalidPrice.passPrice,
      null
    )
  }
)
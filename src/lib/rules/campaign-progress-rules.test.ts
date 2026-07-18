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
    organization_id:
      'organization-profile-1',
    name: 'Band Booster Fundraiser',
    description:
      'Support the school band.',
    goal_amount: 1000,
    pass_price: passPrice,
    starts_at: '2026-07-01',
    ends_at: '2026-08-01',
    status: 'active',
    created_at:
      '2026-07-01T12:00:00.000Z',
  } as CampaignInput
}

function buildOption({
  legacyPassPrice,
  effectivePassPrice,
}: {
  legacyPassPrice: number | null
  effectivePassPrice: number
}) {
  return buildSellableCampaignOption({
    campaign:
      createCampaign(legacyPassPrice),
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
  'uses managed pricing instead of the legacy campaign price',
  () => {
    const option = buildOption({
      legacyPassPrice: 20,
      effectivePassPrice: 25,
    })

    assert.equal(
      option.passPrice,
      25
    )
  }
)

test(
  'uses managed pricing when the legacy campaign price is missing',
  () => {
    const option = buildOption({
      legacyPassPrice: null,
      effectivePassPrice: 25,
    })

    assert.equal(
      option.passPrice,
      25
    )
  }
)

test(
  'uses managed pricing when the legacy campaign price is stale',
  () => {
    const option = buildOption({
      legacyPassPrice: 99,
      effectivePassPrice: 20,
    })

    assert.equal(
      option.passPrice,
      20
    )

    assert.notEqual(
      option.passPrice,
      99
    )
  }
)
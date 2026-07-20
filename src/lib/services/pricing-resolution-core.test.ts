import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createFallbackPricing,
  normalizePricingInput,
  resolvePricingFromRules,
  type PricingRuleRow,
} from '@/lib/services/pricing-resolution-core'

function rule(
  overrides: Partial<PricingRuleRow> & {
    id: string
    scope_type: PricingRuleRow['scope_type']
  }
): PricingRuleRow {
  return {
    id: overrides.id,
    scope_type: overrides.scope_type,
    state_code: overrides.state_code ?? null,
    town_name: overrides.town_name ?? null,
    organization_id:
      overrides.organization_id ?? null,
    campaign_id: overrides.campaign_id ?? null,
    pass_price: overrides.pass_price ?? 20,
    platform_fee_percent:
      overrides.platform_fee_percent ?? 20,
    starts_at:
      overrides.starts_at ??
      '2026-07-01T00:00:00.000Z',
    expires_at: overrides.expires_at ?? null,
    reason: overrides.reason ?? null,
    created_at:
      overrides.created_at ??
      '2026-07-01T00:00:00.000Z',
  }
}

test('campaign pricing outranks every broader scope', () => {
  const pricing = resolvePricingFromRules({
    rules: [
      rule({
        id: 'platform',
        scope_type: 'platform',
        pass_price: 20,
      }),
      rule({
        id: 'state',
        scope_type: 'state',
        state_code: 'TX',
        pass_price: 19,
      }),
      rule({
        id: 'town',
        scope_type: 'town',
        state_code: 'TX',
        town_name: 'Lubbock',
        pass_price: 18,
      }),
      rule({
        id: 'organization',
        scope_type: 'organization',
        organization_id: 'org-1',
        pass_price: 17,
      }),
      rule({
        id: 'campaign',
        scope_type: 'campaign',
        campaign_id: 'campaign-1',
        pass_price: 16,
      }),
    ],
    input: normalizePricingInput({
      campaignId: 'campaign-1',
      organizationId: 'org-1',
      townName: 'Lubbock',
      stateCode: 'TX',
    }),
    donationAmount: 0,
  })

  assert.equal(pricing.pricingRuleId, 'campaign')
  assert.equal(pricing.pricingScope, 'campaign')
  assert.equal(pricing.passPrice, 16)
})

test('organization pricing outranks town state and platform', () => {
  const pricing = resolvePricingFromRules({
    rules: [
      rule({
        id: 'platform',
        scope_type: 'platform',
      }),
      rule({
        id: 'state',
        scope_type: 'state',
        state_code: 'TX',
      }),
      rule({
        id: 'town',
        scope_type: 'town',
        state_code: 'TX',
        town_name: 'Lubbock',
      }),
      rule({
        id: 'organization',
        scope_type: 'organization',
        organization_id: 'org-1',
        pass_price: 14,
      }),
    ],
    input: normalizePricingInput({
      organizationId: 'org-1',
      townName: 'Lubbock',
      stateCode: 'TX',
    }),
    donationAmount: 0,
  })

  assert.equal(
    pricing.pricingRuleId,
    'organization'
  )
  assert.equal(
    pricing.pricingScope,
    'organization'
  )
})

test('town matching ignores casing and surrounding spaces', () => {
  const pricing = resolvePricingFromRules({
    rules: [
      rule({
        id: 'platform',
        scope_type: 'platform',
      }),
      rule({
        id: 'town',
        scope_type: 'town',
        state_code: 'TX',
        town_name: 'LUBBOCK',
        pass_price: 15,
      }),
    ],
    input: normalizePricingInput({
      townName: '  lubbock  ',
      stateCode: ' tx ',
    }),
    donationAmount: 0,
  })

  assert.equal(pricing.pricingRuleId, 'town')
  assert.equal(pricing.pricingScope, 'town')
})

test('newer start time wins within the same scope', () => {
  const pricing = resolvePricingFromRules({
    rules: [
      rule({
        id: 'older',
        scope_type: 'platform',
        pass_price: 20,
        starts_at:
          '2026-07-01T00:00:00.000Z',
      }),
      rule({
        id: 'newer',
        scope_type: 'platform',
        pass_price: 18,
        starts_at:
          '2026-07-10T00:00:00.000Z',
      }),
    ],
    input: normalizePricingInput({}),
    donationAmount: 0,
  })

  assert.equal(pricing.pricingRuleId, 'newer')
  assert.equal(pricing.passPrice, 18)
})

test('newer creation time breaks equal start-time ties', () => {
  const pricing = resolvePricingFromRules({
    rules: [
      rule({
        id: 'created-first',
        scope_type: 'platform',
        starts_at:
          '2026-07-10T00:00:00.000Z',
        created_at:
          '2026-07-10T01:00:00.000Z',
      }),
      rule({
        id: 'created-last',
        scope_type: 'platform',
        starts_at:
          '2026-07-10T00:00:00.000Z',
        created_at:
          '2026-07-10T02:00:00.000Z',
      }),
    ],
    input: normalizePricingInput({}),
    donationAmount: 0,
  })

  assert.equal(
    pricing.pricingRuleId,
    'created-last'
  )
})

test('fee and donation calculations preserve organization earnings', () => {
  const pricing = resolvePricingFromRules({
    rules: [
      rule({
        id: 'platform',
        scope_type: 'platform',
        pass_price: 15,
        platform_fee_percent: 20,
      }),
    ],
    input: normalizePricingInput({}),
    donationAmount: 5,
  })

  assert.equal(pricing.passPrice, 15)
  assert.equal(pricing.platformFeeAmount, 3)
  assert.equal(
    pricing.organizationPassEarnings,
    12
  )
  assert.equal(pricing.donationAmount, 5)
  assert.equal(
    pricing.organizationTotalEarnings,
    17
  )
  assert.equal(pricing.totalAmount, 20)
})

test('fallback remains twenty dollars with a twenty percent fee', () => {
  const pricing = createFallbackPricing(5)

  assert.equal(pricing.pricingScope, 'fallback')
  assert.equal(pricing.pricingRuleId, null)
  assert.equal(pricing.passPrice, 20)
  assert.equal(pricing.platformFeePercent, 20)
  assert.equal(pricing.platformFeeAmount, 4)
  assert.equal(
    pricing.organizationPassEarnings,
    16
  )
  assert.equal(
    pricing.organizationTotalEarnings,
    21
  )
  assert.equal(pricing.totalAmount, 25)
  assert.equal(pricing.usedFallback, true)
})

test('no matching scoped rule falls back safely', () => {
  const pricing = resolvePricingFromRules({
    rules: [
      rule({
        id: 'other-state',
        scope_type: 'state',
        state_code: 'NM',
      }),
    ],
    input: normalizePricingInput({
      stateCode: 'TX',
    }),
    donationAmount: 0,
  })

  assert.equal(pricing.pricingScope, 'fallback')
  assert.equal(pricing.usedFallback, true)
})
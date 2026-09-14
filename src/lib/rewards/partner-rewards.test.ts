import assert from 'node:assert/strict'
import test from 'node:test'

import {
  calculatePartnerPoolShare,
  calculateWeightedOfferPoints,
  getPartnerOfferDailyWeight,
  getPartnerOfferRewardBand,
  scoreOfferForPartnerRewards,
} from './partner-rewards'

test('maps offer score bands to daily reward weights', () => {
  assert.equal(getPartnerOfferRewardBand(49), 'poor')
  assert.equal(getPartnerOfferRewardBand(50), 'developing')
  assert.equal(getPartnerOfferRewardBand(70), 'recommended')
  assert.equal(getPartnerOfferRewardBand(85), 'high_value')
  assert.equal(getPartnerOfferRewardBand(95), 'exceptional')

  assert.equal(getPartnerOfferDailyWeight(49), 0)
  assert.equal(getPartnerOfferDailyWeight(60), 0.5)
  assert.equal(getPartnerOfferDailyWeight(75), 1)
  assert.equal(getPartnerOfferDailyWeight(90), 1.25)
  assert.equal(getPartnerOfferDailyWeight(98), 1.5)
})

test('reuses the existing RaiseHub scorer for partner rewards', () => {
  const result = scoreOfferForPartnerRewards({
    title: 'RaiseHub Member BOGO',
    discount: 'Buy one get one free',
    description: 'Exclusive members only offer with qualifying purchase.',
    estimatedRetailValue: 12,
    estimatedBusinessCost: 3,
    isExclusive: true,
    requiresPurchase: true,
  })

  assert.ok(result.quality.total >= 70)
  assert.ok(result.dailyWeight >= 1)
  assert.equal(result.earnsDailyPoints, true)
})

test('calculates weighted offer points without assigning a cash value', () => {
  assert.equal(calculateWeightedOfferPoints(20, 1.25), 25)
  assert.equal(calculateWeightedOfferPoints(0, 1.5), 0)
})

test('calculates proportional pool share from eligible points', () => {
  assert.equal(calculatePartnerPoolShare(1_000, 100_000), 0.01)
  assert.equal(calculatePartnerPoolShare(2_000, 100_000), 0.02)
  assert.equal(calculatePartnerPoolShare(1_000, 0), 0)
})

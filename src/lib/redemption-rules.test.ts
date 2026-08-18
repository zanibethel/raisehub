import assert from 'node:assert/strict'
import test from 'node:test'

import {
  getRedemptionAvailability,
  inferOfferUsageRuleFromDescription,
} from './redemption-rules'

const now = new Date('2026-08-18T12:00:00.000Z')

test('single-use offers stop being redeemable after one use', () => {
  const availability = getRedemptionAvailability({
    usageRule: 'one-time',
    lastRedeemedAt: '2026-08-17T12:00:00.000Z',
    now,
  })

  assert.equal(availability.canRedeem, false)
  assert.equal(availability.label, 'Already used')
})

test('unlimited offers immediately remain available after use', () => {
  const availability = getRedemptionAvailability({
    usageRule: 'unlimited',
    lastRedeemedAt: '2026-08-18T11:59:00.000Z',
    now,
  })

  assert.equal(availability.canRedeem, true)
  assert.equal(availability.nextAvailableAt, null)
})

test('daily offers reopen after rolling 24 hours', () => {
  assert.equal(
    getRedemptionAvailability({
      usageRule: 'daily',
      lastRedeemedAt: '2026-08-17T13:00:00.000Z',
      now,
    }).canRedeem,
    false
  )

  assert.equal(
    getRedemptionAvailability({
      usageRule: 'daily',
      lastRedeemedAt: '2026-08-17T11:00:00.000Z',
      now,
    }).canRedeem,
    true
  )
})

test('weekly offers reopen after rolling 7 days', () => {
  assert.equal(
    getRedemptionAvailability({
      usageRule: 'weekly',
      lastRedeemedAt: '2026-08-12T12:00:00.000Z',
      now,
    }).canRedeem,
    false
  )

  assert.equal(
    getRedemptionAvailability({
      usageRule: 'weekly',
      lastRedeemedAt: '2026-08-10T12:00:00.000Z',
      now,
    }).canRedeem,
    true
  )
})

test('wizard fine print maps back to persisted usage rules', () => {
  assert.equal(
    inferOfferUsageRuleFromDescription(
      'Exclusive. May be redeemed once every 24 hours per member.'
    ),
    'daily'
  )
  assert.equal(
    inferOfferUsageRuleFromDescription(
      'Exclusive. May be redeemed once every 7 days per member.'
    ),
    'weekly'
  )
  assert.equal(
    inferOfferUsageRuleFromDescription(
      'Exclusive. Reusable while this offer remains active.'
    ),
    'unlimited'
  )
})

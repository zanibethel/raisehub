import assert from 'node:assert/strict'
import test from 'node:test'

import {
  DEFAULT_REDEMPTION_METHOD,
  REDEMPTION_METHODS,
  getRedemptionMethod,
  getRedemptionMethodOption,
  getRedemptionMethodOptions,
  isRedemptionMethod,
  isRedemptionMethodAvailable,
} from './redemption-method'

test('defines the supported redemption methods', () => {
  assert.deepEqual(REDEMPTION_METHODS, [
    'auto_validation',
    'staff_confirmation',
    'qr_code',
    'staff_code',
    'square',
  ])
})

test('uses 24-hour auto validation as the launch default', () => {
  assert.equal(DEFAULT_REDEMPTION_METHOD, 'auto_validation')
})

test('recognizes valid redemption methods', () => {
  for (const method of REDEMPTION_METHODS) {
    assert.equal(isRedemptionMethod(method), true)
  }
})

test('rejects invalid redemption methods', () => {
  assert.equal(isRedemptionMethod('manual'), false)
  assert.equal(isRedemptionMethod(''), false)
  assert.equal(isRedemptionMethod(null), false)
  assert.equal(isRedemptionMethod(undefined), false)
})

test('preserves valid redemption methods', () => {
  assert.equal(getRedemptionMethod('auto_validation'), 'auto_validation')
  assert.equal(getRedemptionMethod('qr_code'), 'qr_code')
  assert.equal(getRedemptionMethod('square'), 'square')
})

test('falls back to auto validation for missing or invalid values', () => {
  assert.equal(getRedemptionMethod(undefined), 'auto_validation')
  assert.equal(getRedemptionMethod(null), 'auto_validation')
  assert.equal(getRedemptionMethod('unsupported'), 'auto_validation')
})

test('returns every redemption-method option', () => {
  const options = getRedemptionMethodOptions()
  assert.deepEqual(
    options.map(({ value }) => value),
    ['auto_validation', 'staff_confirmation', 'qr_code', 'staff_code', 'square']
  )
})

test('marks auto validation and instant staff confirmation as available', () => {
  const availableMethods = getRedemptionMethodOptions()
    .filter(({ availability }) => availability === 'available')
    .map(({ value }) => value)

  assert.deepEqual(availableMethods, ['auto_validation', 'staff_confirmation'])
})

test('returns the matching presentation option', () => {
  const option = getRedemptionMethodOption('staff_code')
  assert.equal(option.value, 'staff_code')
  assert.equal(option.label, 'POS Discount Code')
  assert.equal(option.availability, 'planned')
})

test('returns the default option for invalid values', () => {
  const option = getRedemptionMethodOption('invalid')
  assert.equal(option.value, 'auto_validation')
  assert.equal(option.label, '24-Hour Auto Validation')
})

test('reports launch availability safely', () => {
  assert.equal(isRedemptionMethodAvailable('auto_validation'), true)
  assert.equal(isRedemptionMethodAvailable('staff_confirmation'), true)
  assert.equal(isRedemptionMethodAvailable('qr_code'), false)
  assert.equal(isRedemptionMethodAvailable('staff_code'), false)
  assert.equal(isRedemptionMethodAvailable('square'), false)
})

test('treats invalid values as the available default method', () => {
  assert.equal(isRedemptionMethodAvailable('invalid'), true)
})

test('returns fresh option objects', () => {
  const firstOptions = getRedemptionMethodOptions()
  const secondOptions = getRedemptionMethodOptions()

  assert.notEqual(firstOptions, secondOptions)
  assert.notEqual(firstOptions[0], secondOptions[0])
  assert.deepEqual(firstOptions, secondOptions)
})

import assert from 'node:assert/strict'
import test from 'node:test'

import {
  canBusinessSelectRedemptionMethod,
  getBusinessRedemptionSettings,
} from './business-redemption-settings'

test('provides business-facing exception-review guidance', () => {
  const settings = getBusinessRedemptionSettings(undefined)

  assert.equal(settings.heading, 'Redemption Workflow')
  assert.match(settings.description, /24-hour review window/i)
  assert.match(settings.helperText, /auto validation is the default/i)
  assert.match(settings.helperText, /pos integrations/i)
})

test('selects auto validation by default', () => {
  const settings = getBusinessRedemptionSettings(undefined)

  assert.equal(settings.selectedMethod, 'auto_validation')
  const selectedOptions = settings.options.filter(({ isSelected }) => isSelected)
  assert.equal(selectedOptions.length, 1)
  assert.equal(selectedOptions[0].value, 'auto_validation')
})

test('preserves available selected methods', () => {
  assert.equal(
    getBusinessRedemptionSettings('auto_validation').selectedMethod,
    'auto_validation'
  )
  assert.equal(
    getBusinessRedemptionSettings('staff_confirmation').selectedMethod,
    'staff_confirmation'
  )
})

test('falls back when a planned method is requested', () => {
  for (const method of ['qr_code', 'staff_code', 'square']) {
    assert.equal(
      getBusinessRedemptionSettings(method).selectedMethod,
      'auto_validation'
    )
  }
})

test('falls back when an invalid method is requested', () => {
  assert.equal(
    getBusinessRedemptionSettings('invalid').selectedMethod,
    'auto_validation'
  )
})

test('returns every business redemption option', () => {
  const settings = getBusinessRedemptionSettings(undefined)

  assert.deepEqual(
    settings.options.map(({ value }) => value),
    ['auto_validation', 'staff_confirmation', 'qr_code', 'staff_code', 'square']
  )
})

test('marks auto validation and staff confirmation as selectable', () => {
  const settings = getBusinessRedemptionSettings(undefined)
  const selectableOptions = settings.options
    .filter(({ isSelectable }) => isSelectable)
    .map(({ value }) => value)

  assert.deepEqual(selectableOptions, ['auto_validation', 'staff_confirmation'])
})

test('uses the correct availability labels', () => {
  const settings = getBusinessRedemptionSettings(undefined)

  for (const method of ['auto_validation', 'staff_confirmation']) {
    const option = settings.options.find(({ value }) => value === method)
    assert.equal(option?.statusLabel, 'Available')
  }

  for (const method of ['qr_code', 'staff_code', 'square']) {
    const option = settings.options.find(({ value }) => value === method)
    assert.equal(option?.statusLabel, 'Coming Later')
  }
})

test('allows the business to select available methods', () => {
  assert.equal(canBusinessSelectRedemptionMethod('auto_validation'), true)
  assert.equal(canBusinessSelectRedemptionMethod('staff_confirmation'), true)
})

test('prevents the business from selecting planned methods', () => {
  assert.equal(canBusinessSelectRedemptionMethod('qr_code'), false)
  assert.equal(canBusinessSelectRedemptionMethod('staff_code'), false)
  assert.equal(canBusinessSelectRedemptionMethod('square'), false)
})

test('rejects missing and invalid save values', () => {
  assert.equal(canBusinessSelectRedemptionMethod(undefined), false)
  assert.equal(canBusinessSelectRedemptionMethod(null), false)
  assert.equal(canBusinessSelectRedemptionMethod('invalid'), false)
})

test('returns fresh settings and option objects', () => {
  const firstSettings = getBusinessRedemptionSettings(undefined)
  const secondSettings = getBusinessRedemptionSettings(undefined)

  assert.notEqual(firstSettings, secondSettings)
  assert.notEqual(firstSettings.options, secondSettings.options)
  assert.notEqual(firstSettings.options[0], secondSettings.options[0])
  assert.deepEqual(firstSettings, secondSettings)
})

import assert from 'node:assert/strict'
import test from 'node:test'

import {
  getRecommendedBusinessModules,
  normalizeBookingConfig,
  normalizeEnabledModules,
  normalizeLocationConfig,
  normalizeMenuConfig,
} from './business-app-modules'

test('recommends roaming modules for food trucks', () => {
  assert.deepEqual(getRecommendedBusinessModules('Food Truck'), [
    'menu',
    'locations',
  ])
})

test('recommends booking for appointment-led businesses', () => {
  assert.deepEqual(getRecommendedBusinessModules('Salon / Beauty'), [
    'booking',
    'menu',
  ])
})

test('normalizes enabled module keys safely', () => {
  assert.deepEqual(
    normalizeEnabledModules(['menu', 'unknown', 'booking', 4]),
    ['menu', 'booking']
  )
})

test('normalizes module config fallbacks', () => {
  assert.equal(normalizeMenuConfig(null).heading, 'Menu / Catalog')
  assert.equal(normalizeLocationConfig(null).heading, 'Where to find us')
  assert.equal(normalizeBookingConfig(null).label, 'Book appointment')
})

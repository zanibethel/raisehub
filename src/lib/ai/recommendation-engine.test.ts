import assert from 'node:assert/strict'
import test from 'node:test'

import { buildRecommendedOffers } from './recommendation-engine'

test('food truck event traffic prioritizes location and event offers', () => {
  const offers = buildRecommendedOffers({
    businessCategory: 'Food Truck',
    goal: 'event-traffic',
  })

  assert.equal(offers.length, 3)
  assert.equal(offers[0]?.title, 'Today’s stop special')
  assert.match(offers[1]?.title ?? '', /event/i)
})

test('salon appointment recommendations protect service pricing', () => {
  const offers = buildRecommendedOffers({
    businessCategory: 'Salon / Beauty',
    goal: 'appointments',
  })

  assert.equal(offers[0]?.title, 'Free conditioning treatment with color')
  assert.equal(offers[0]?.requiresPurchase, true)
  assert.match(offers[0]?.coachNote ?? '', /labor|product|appointment/i)
})

test('home services receive service-specific recommendations instead of general fallback', () => {
  const offers = buildRecommendedOffers({
    businessCategory: 'Home Services',
    goal: 'slow-day',
  })

  assert.match(offers[0]?.title ?? '', /slow-day|priority/i)
  assert.ok((offers[0]?.estimatedBusinessCost ?? 100) < (offers[0]?.estimatedRetailValue ?? 0))
})

test('medical and dental suggestions include promotion guardrails', () => {
  const offers = buildRecommendedOffers({
    businessCategory: 'Medical / Dental',
    goal: 'new-customers',
  })

  assert.match(offers[0]?.finePrint ?? '', /healthcare|insurance|practice|payer/i)
})

test('unknown categories still receive safe general recommendations', () => {
  const offers = buildRecommendedOffers({
    businessCategory: 'Something New',
    goal: 'new-product',
  })

  assert.equal(offers.length, 3)
  assert.match(offers[0]?.title ?? '', /featured|premium|bonus/i)
})

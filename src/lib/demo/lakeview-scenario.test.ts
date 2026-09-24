import assert from 'node:assert/strict'
import test from 'node:test'

import {
  LAKEVIEW_BUSINESSES,
  LAKEVIEW_CAMPAIGNS,
  LAKEVIEW_IDENTITIES,
  LAKEVIEW_OFFERS,
  expectedCampaignProgress,
  validateLakeviewScenario,
} from './lakeview-scenario'

test('Lakeview scenario uses stable unique baseline keys', () => {
  assert.deepEqual(validateLakeviewScenario(), {
    identities: 12,
    businesses: 10,
    campaigns: 4,
    offers: 11,
  })
})

test('every business has a demo identity and every offer has a business', () => {
  const identityKeys = new Set(Object.keys(LAKEVIEW_IDENTITIES))
  const businessKeys = new Set(LAKEVIEW_BUSINESSES.map((business) => business.key))

  for (const business of LAKEVIEW_BUSINESSES) {
    assert.equal(identityKeys.has(business.key), true)
  }

  for (const offer of LAKEVIEW_OFFERS) {
    assert.equal(businessKeys.has(offer.businessKey), true)
  }
})

test('campaign progress is derived from seeded organization earnings', () => {
  const progress = Object.fromEntries(
    LAKEVIEW_CAMPAIGNS.map((campaign) => [
      campaign.key,
      expectedCampaignProgress(campaign.goalAmount, campaign.purchaseCount),
    ])
  )

  assert.equal(progress.library, 9)
  assert.equal(progress.arts, 43.2)
  assert.equal(progress.playground, 75)
  assert.equal(progress.stem, 97.2)
})

test('active curated offers do not expire while inactive history stays historical', () => {
  const activeOffers = LAKEVIEW_OFFERS.filter((offer) => offer.active)

  assert.equal(activeOffers.length > 0, true)
  assert.equal(activeOffers.every((offer) => offer.startOffsetDays <= 0), true)
  assert.equal(activeOffers.every((offer) => offer.endOffsetDays === null), true)
  assert.equal(LAKEVIEW_OFFERS.some((offer) => !offer.active && offer.endOffsetDays !== null && offer.endOffsetDays < 0), true)
})

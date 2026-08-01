import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const dashboardSource = readFileSync(
  new URL('./customer-dashboard.tsx', import.meta.url),
  'utf8'
)

const historicalSectionStart = dashboardSource.indexOf(
  'const historicalOfferIds'
)
const enrichmentSectionStart = dashboardSource.indexOf(
  'type OfferRow ='
)
const renderSectionStart = dashboardSource.indexOf(
  'return ('
)

assert.notEqual(historicalSectionStart, -1)
assert.notEqual(enrichmentSectionStart, -1)
assert.notEqual(renderSectionStart, -1)
assert.equal(historicalSectionStart < enrichmentSectionStart, true)

const historicalLoaderSource = dashboardSource.slice(
  historicalSectionStart,
  enrichmentSectionStart
)

test('collects active offer ids before loading history', () => {
  const activeIdsIndex = dashboardSource.indexOf('const activeOfferIds')
  assert.notEqual(activeIdsIndex, -1)
  assert.equal(activeIdsIndex < historicalSectionStart, true)
  assert.match(
    dashboardSource,
    /const activeOfferIds = new Set\(\(offers \?\? \[\]\)\.map\(\(offer\) => offer\.id\)\)/
  )
})

test('loads redemption data before calculating historical offer ids', () => {
  const redemptionsIndex = dashboardSource.indexOf(".from('redemptions')")
  assert.notEqual(redemptionsIndex, -1)
  assert.equal(redemptionsIndex < historicalSectionStart, true)
})

test('selects only redeemed offers missing from the active set', () => {
  assert.match(
    historicalLoaderSource,
    /const historicalOfferIds = \[\.\.\.redeemedOfferIds\]\.filter\(\s*\(offerId\) => !activeOfferIds\.has\(offerId\)\s*\)/
  )
})

test('skips the historical query when no missing redeemed offers exist', () => {
  assert.match(
    historicalLoaderSource,
    /historicalOfferIds\.length > 0\s*\? await supabase/
  )
  assert.match(historicalLoaderSource, /:\s*\{ data: \[\] \}/)
})

test('loads historical offers by their redeemed offer ids', () => {
  assert.match(
    historicalLoaderSource,
    /\.from\('offers'\)\s+\.select\('\*'\)\s+\.in\('id', historicalOfferIds\)/
  )
  assert.match(
    historicalLoaderSource,
    /\.order\('created_at', \{ ascending: false \}\)/
  )
})

test('keeps the historical query before offer enrichment', () => {
  const historicalQueryIndex = dashboardSource.indexOf(
    'const { data: historicalOffersData }'
  )
  const enrichmentIndex = dashboardSource.indexOf('function enrichOffer')

  assert.notEqual(historicalQueryIndex, -1)
  assert.notEqual(enrichmentIndex, -1)
  assert.equal(historicalQueryIndex < enrichmentIndex, true)
})

test('uses one enrichment function for active and historical offers', () => {
  const enrichmentSource = dashboardSource.slice(enrichmentSectionStart)

  assert.match(
    enrichmentSource,
    /function enrichOffer\(offer: OfferRow\): CustomerDashboardOffer/
  )
  assert.match(
    enrichmentSource,
    /const enrichedOffers = \(offers \?\? \[\]\)\.map\(enrichOffer\)/
  )
  assert.match(
    enrichmentSource,
    /const historicalOffers = \(historicalOffersData \?\? \[\]\)\.map\(enrichOffer\)/
  )
})

test('passes historical offers separately to dashboard content', () => {
  assert.match(dashboardSource, /<CustomerDashboardContent/)
  assert.match(dashboardSource, /enrichedOffers=\{enrichedOffers\}/)
  assert.match(dashboardSource, /historicalOffers=\{historicalOffers\}/)
})

test('keeps historical loading before dashboard rendering', () => {
  const renderIndex = dashboardSource.indexOf('<CustomerDashboardContent')
  assert.notEqual(renderIndex, -1)
  assert.equal(historicalSectionStart < renderIndex, true)
})

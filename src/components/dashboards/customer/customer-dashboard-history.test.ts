import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const dashboardSource = readFileSync(
  new URL('./customer-dashboard.tsx', import.meta.url),
  'utf8'
)

const enrichmentSectionStart = dashboardSource.indexOf(
  'type OfferRow ='
)
const historicalSectionStart = dashboardSource.indexOf(
  'const historicalOfferIds'
)
const renderSectionStart = dashboardSource.indexOf(
  'return ('
)

assert.notEqual(enrichmentSectionStart, -1)
assert.notEqual(historicalSectionStart, -1)
assert.notEqual(renderSectionStart, -1)
assert.equal(enrichmentSectionStart < historicalSectionStart, true)

const historicalLoaderSource = dashboardSource.slice(
  historicalSectionStart,
  renderSectionStart
)

test('collects customer-visible active offer ids before loading history', () => {
  const activeIdsIndex = dashboardSource.indexOf('const activeOfferIds')
  assert.notEqual(activeIdsIndex, -1)
  assert.equal(activeIdsIndex < historicalSectionStart, true)
  assert.match(
    dashboardSource,
    /const activeOfferIds = new Set\(customerVisibleOfferRows\.map\(\(offer\) => offer\.id\)\)/
  )
})

test('loads event-level redemption data before calculating historical offer ids', () => {
  const redemptionsIndex = dashboardSource.indexOf(".from('redemptions')")
  assert.notEqual(redemptionsIndex, -1)
  assert.equal(redemptionsIndex < historicalSectionStart, true)
  assert.match(dashboardSource, /offer_title_snapshot/)
  assert.match(dashboardSource, /benefit_snapshot/)
  assert.match(dashboardSource, /confirmation_method/)
})

test('selects unique redemption-event offer ids missing from the active set', () => {
  assert.match(
    historicalLoaderSource,
    /new Set\(redemptionEvents\.map\(\(redemption\) => redemption\.offer_id\)\)/
  )
  assert.match(
    historicalLoaderSource,
    /\.filter\(\(offerId\) => !activeOfferIds\.has\(offerId\)\)/
  )
})

test('skips the historical query when no missing redemption offers exist', () => {
  assert.match(
    historicalLoaderSource,
    /historicalOfferIds\.length > 0\s*\? await supabase/
  )
  assert.match(historicalLoaderSource, /:\s*\{ data: \[\] \}/)
})

test('loads historical offers by redemption event offer ids', () => {
  assert.match(
    historicalLoaderSource,
    /\.from\('offers'\)\s+\.select\('\*'\)\s+\.in\('id', historicalOfferIds\)/
  )
  assert.match(
    historicalLoaderSource,
    /\.order\('created_at', \{ ascending: false \}\)/
  )
})

test('defines offer enrichment before loading historical offers', () => {
  const historicalQueryIndex = dashboardSource.indexOf(
    'const { data: historicalOffersData }'
  )
  const enrichmentIndex = dashboardSource.indexOf('function enrichOffer')

  assert.notEqual(historicalQueryIndex, -1)
  assert.notEqual(enrichmentIndex, -1)
  assert.equal(enrichmentIndex < historicalQueryIndex, true)
})

test('uses one enrichment function for visible and historical offers', () => {
  const enrichmentSource = dashboardSource.slice(enrichmentSectionStart)

  assert.match(
    enrichmentSource,
    /function enrichOffer\(offer: OfferRow\): CustomerDashboardOffer/
  )
  assert.match(
    enrichmentSource,
    /const enrichedOffers = customerVisibleOfferRows\.map\(enrichOffer\)/
  )
  assert.match(
    enrichmentSource,
    /const historicalOffers = \(historicalOffersData \?\? \[\]\)\.map\(enrichOffer\)/
  )
})

test('passes historical offers and redemption events separately to dashboard content', () => {
  assert.match(dashboardSource, /<CustomerDashboardContent/)
  assert.match(dashboardSource, /enrichedOffers=\{enrichedOffers\}/)
  assert.match(dashboardSource, /historicalOffers=\{historicalOffers\}/)
  assert.match(dashboardSource, /redemptionEvents=\{redemptionEvents\}/)
  assert.match(dashboardSource, /confirmedRedemptionEvents=\{confirmedRedemptionEvents\}/)
})

test('keeps historical loading before dashboard rendering', () => {
  const renderIndex = dashboardSource.indexOf('<CustomerDashboardContent')
  assert.notEqual(renderIndex, -1)
  assert.equal(historicalSectionStart < renderIndex, true)
})

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

// =============================================================================
// Source
// =============================================================================

const dashboardSource = readFileSync(
  new URL(
    './customer-dashboard.tsx',
    import.meta.url
  ),
  'utf8'
)

const historicalSectionStart =
  dashboardSource.indexOf(
    '// Historical redeemed offers'
  )

const renderSectionStart =
  dashboardSource.indexOf(
    '// Render'
  )

assert.notEqual(
  historicalSectionStart,
  -1
)

assert.notEqual(
  renderSectionStart,
  -1
)

assert.equal(
  historicalSectionStart <
    renderSectionStart,
  true
)

const historicalLoaderSource =
  dashboardSource.slice(
    historicalSectionStart,
    renderSectionStart
  )

// =============================================================================
// Active offer tracking
// =============================================================================

test(
  'collects active offer ids before loading history',
  () => {
    const activeIdsIndex =
      dashboardSource.indexOf(
        'const activeOfferIds'
      )

    assert.notEqual(
      activeIdsIndex,
      -1
    )

    assert.equal(
      activeIdsIndex <
        historicalSectionStart,
      true
    )

    assert.match(
      dashboardSource,
      /const activeOfferIds = new Set\(\s*\(offers \?\? \[\]\)\.map\(\s*\(offer\) => offer\.id\s*\)\s*\)/
    )
  }
)

// =============================================================================
// Redemption ordering
// =============================================================================

test(
  'loads redemption data before calculating historical offer ids',
  () => {
    const redemptionsIndex =
      dashboardSource.indexOf(
        ".from('redemptions')"
      )

    const historicalIdsIndex =
      dashboardSource.indexOf(
        'const historicalOfferIds'
      )

    assert.notEqual(
      redemptionsIndex,
      -1
    )

    assert.notEqual(
      historicalIdsIndex,
      -1
    )

    assert.equal(
      redemptionsIndex <
        historicalIdsIndex,
      true
    )
  }
)

// =============================================================================
// Historical offer selection
// =============================================================================

test(
  'selects only redeemed offers missing from the active set',
  () => {
    assert.match(
      historicalLoaderSource,
      /const historicalOfferIds = \[\s*\.\.\.redeemedOfferIds,\s*\]\.filter\(\s*\(offerId\) =>\s*!activeOfferIds\.has\(offerId\)\s*\)/
    )
  }
)

test(
  'skips the historical query when no missing redeemed offers exist',
  () => {
    assert.match(
      historicalLoaderSource,
      /historicalOfferIds\.length > 0\s*\?\s*await supabase/
    )

    assert.match(
      historicalLoaderSource,
      /:\s*\{\s*data: \[\]\s*\}/
    )
  }
)

// =============================================================================
// Historical offer query
// =============================================================================

test(
  'loads historical offers by their redeemed offer ids',
  () => {
    assert.match(
      historicalLoaderSource,
      /\.from\('offers'\)\s+\.select\('\*'\)\s+\.in\('id', historicalOfferIds\)/
    )

    assert.match(
      historicalLoaderSource,
      /\.order\('created_at', \{\s*ascending: false,\s*\}\)/
    )
  }
)

test(
  'keeps the historical query before offer enrichment',
  () => {
    const historicalQueryIndex =
      dashboardSource.indexOf(
        'const { data: historicalOffersData }'
      )

    const enrichmentIndex =
      dashboardSource.indexOf(
        'function enrichOffer'
      )

    assert.notEqual(
      historicalQueryIndex,
      -1
    )

    assert.notEqual(
      enrichmentIndex,
      -1
    )

    assert.equal(
      historicalQueryIndex <
        enrichmentIndex,
      true
    )
  }
)

// =============================================================================
// Shared enrichment
// =============================================================================

test(
  'uses one enrichment function for active and historical offers',
  () => {
    assert.match(
      historicalLoaderSource,
      /function enrichOffer\(\s*offer: OfferRow\s*\): CustomerDashboardOffer/
    )

    assert.match(
      historicalLoaderSource,
      /const enrichedOffers =\s*\(offers \?\? \[\]\)\.map\(\s*enrichOffer\s*\)/
    )

    assert.match(
      historicalLoaderSource,
      /const historicalOffers =\s*\(historicalOffersData \?\? \[\]\)\.map\(\s*enrichOffer\s*\)/
    )
  }
)

// =============================================================================
// History-only dashboard channel
// =============================================================================

test(
  'passes historical offers separately to dashboard content',
  () => {
    const renderSource =
      dashboardSource.slice(
        renderSectionStart
      )

    assert.match(
      renderSource,
      /<CustomerDashboardContent/
    )

    assert.match(
      renderSource,
      /enrichedOffers=\{\s*enrichedOffers\s*\}/
    )

    assert.match(
      renderSource,
      /historicalOffers=\{\s*historicalOffers\s*\}/
    )
  }
)

test(
  'keeps historical loading before dashboard rendering',
  () => {
    const historicalIdsIndex =
      dashboardSource.indexOf(
        'const historicalOfferIds'
      )

    const renderIndex =
      dashboardSource.indexOf(
        '<CustomerDashboardContent'
      )

    assert.notEqual(
      historicalIdsIndex,
      -1
    )

    assert.notEqual(
      renderIndex,
      -1
    )

    assert.equal(
      historicalIdsIndex <
        renderIndex,
      true
    )
  }
)
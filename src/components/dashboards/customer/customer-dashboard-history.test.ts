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

// =============================================================================
// Active offer tracking
// =============================================================================

test(
  'collects active offer ids before loading history',
  () => {
    assert.match(
      dashboardSource,
      /const activeOfferIds = new Set\(\s*\(offers \?\? \[\]\)\.map\(\s*\(offer\) => offer\.id\s*\)\s*\)/
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
      dashboardSource,
      /const historicalOfferIds = \[\s*\.\.\.redeemedOfferIds,\s*\]\.filter\(\s*\(offerId\) =>\s*!activeOfferIds\.has\(offerId\)\s*\)/
    )
  }
)

test(
  'skips the historical query when no missing redeemed offers exist',
  () => {
    assert.match(
      dashboardSource,
      /historicalOfferIds\.length > 0\s*\?\s*await supabase/
    )

    assert.match(
      dashboardSource,
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
      dashboardSource,
      /\.from\('offers'\)\s+\.select\('\*'\)\s+\.in\('id', historicalOfferIds\)/
    )

    assert.match(
      dashboardSource,
      /\.order\('created_at', \{\s*ascending: false,\s*\}\)/
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
      dashboardSource,
      /function enrichOffer\(\s*offer: OfferRow\s*\): CustomerDashboardOffer/
    )

    assert.match(
      dashboardSource,
      /const enrichedOffers =\s*\(offers \?\? \[\]\)\.map\(\s*enrichOffer\s*\)/
    )

    assert.match(
      dashboardSource,
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
    assert.match(
      dashboardSource,
      /<CustomerDashboardContent/
    )

    assert.match(
      dashboardSource,
      /enrichedOffers=\{\s*enrichedOffers\s*\}/
    )

    assert.match(
      dashboardSource,
      /historicalOffers=\{\s*historicalOffers\s*\}/
    )
  }
)

test(
  'keeps the historical loader after redemption data is available',
  () => {
    const redemptionsIndex =
      dashboardSource.indexOf(
        ".from('redemptions')"
      )

    const historicalIdsIndex =
      dashboardSource.indexOf(
        'const historicalOfferIds'
      )

    const renderIndex =
      dashboardSource.indexOf(
        '<CustomerDashboardContent'
      )

    assert.notEqual(
      redemptionsIndex,
      -1
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
      redemptionsIndex <
        historicalIdsIndex,
      true
    )

    assert.equal(
      historicalIdsIndex <
        renderIndex,
      true
    )
  }
)
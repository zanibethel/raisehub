import assert from 'node:assert/strict'
import {
  readFileSync,
} from 'node:fs'
import test from 'node:test'

// =============================================================================
// Source
// =============================================================================

const dashboardSource =
  readFileSync(
    new URL(
      './customer-dashboard-content.tsx',
      import.meta.url
    ),
    'utf8'
  )

// =============================================================================
// Mobile shortcut section
// =============================================================================

test(
  'uses compact mobile padding for the shortcut section',
  () => {
    assert.match(
      dashboardSource,
      /bg-white\/90 p-4 shadow-xl backdrop-blur sm:p-6/
    )
  }
)

test(
  'renders shortcut cards in two columns on phones',
  () => {
    assert.match(
      dashboardSource,
      /grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4/
    )
  }
)

test(
  'keeps the four-column desktop shortcut layout',
  () => {
    assert.match(
      dashboardSource,
      /lg:grid-cols-4/
    )
  }
)

// =============================================================================
// Mobile shortcut cards
// =============================================================================

test(
  'uses compact card dimensions on phones',
  () => {
    assert.match(
      dashboardSource,
      /min-h-32 min-w-0 rounded-2xl border p-4/
    )

    assert.match(
      dashboardSource,
      /sm:min-h-36 sm:p-5/
    )
  }
)

test(
  'uses responsive shortcut icon sizing',
  () => {
    assert.match(
      dashboardSource,
      /className="shrink-0 text-xl sm:text-2xl"/
    )
  }
)

test(
  'uses responsive shortcut heading sizing',
  () => {
    assert.match(
      dashboardSource,
      /mt-3 break-words text-sm font-semibold leading-snug text-gray-900 sm:mt-4 sm:text-base/
    )
  }
)

test(
  'hides shortcut descriptions on narrow screens',
  () => {
    assert.match(
      dashboardSource,
      /className="mt-1 hidden break-words text-sm leading-6 text-gray-600 sm:block"/
    )
  }
)

// =============================================================================
// Interaction and accessibility
// =============================================================================

test(
  'preserves shortcut button semantics',
  () => {
    assert.match(
      dashboardSource,
      /type="button"/
    )

    assert.match(
      dashboardSource,
      /aria-pressed=\{isActive\}/
    )

    assert.match(
      dashboardSource,
      /disabled=\{isDisabled\}/
    )
  }
)

test(
  'preserves descriptive accessible labels',
  () => {
    assert.match(
      dashboardSource,
      /aria-label=\{getCustomerDealShortcutAriaLabel/
    )

    assert.match(
      dashboardSource,
      /label:\s*option\.label/
    )

    assert.match(
      dashboardSource,
      /count,/
    )
  }
)

test(
  'preserves disabled zero-count shortcuts',
  () => {
    assert.match(
      dashboardSource,
      /const isDisabled =\s*count === 0/
    )

    assert.match(
      dashboardSource,
      /disabled=\{isDisabled\}/
    )
  }
)

// =============================================================================
// Navigation behavior
// =============================================================================

test(
  'preserves smooth scrolling to available offers',
  () => {
    assert.match(
      dashboardSource,
      /\.getElementById\(\s*'available-offers'\s*\)/
    )

    assert.match(
      dashboardSource,
      /behavior: 'smooth'/
    )

    assert.match(
      dashboardSource,
      /block: 'start'/
    )
  }
)

test(
  'preserves the available offers destination',
  () => {
    assert.match(
      dashboardSource,
      /id="available-offers"/
    )

    assert.match(
      dashboardSource,
      /className="scroll-mt-6"/
    )
  }
)

// =============================================================================
// Historical offer preparation
// =============================================================================

test(
  'accepts historical offers separately from active offers',
  () => {
    assert.match(
      dashboardSource,
      /historicalOffers\?:\s*AvailableDealsProps\['enrichedOffers'\]/
    )

    assert.match(
      dashboardSource,
      /historicalOffers = \[\]/
    )
  }
)

test(
  'combines active and historical offers without duplicate ids',
  () => {
    assert.match(
      dashboardSource,
      /const customerHistoryOffers = \[\s*\.\.\.new Map\(/
    )

    assert.match(
      dashboardSource,
      /\.\.\.enrichedOffers,\s*\.\.\.historicalOffers,/
    )

    assert.match(
      dashboardSource,
      /\.map\(\(offer\) => \[\s*offer\.id,\s*offer,\s*\]\)/
    )

    assert.match(
      dashboardSource,
      /\.values\(\)/
    )
  }
)

// =============================================================================
// Active marketplace separation
// =============================================================================

test(
  'keeps deal filters limited to active offers',
  () => {
    assert.match(
      dashboardSource,
      /getCustomerDealFilterCounts\(\{\s*offers: enrichedOffers,\s*savedOfferIds,/
    )

    assert.match(
      dashboardSource,
      /filterCustomerDeals\(\{\s*offers: enrichedOffers,\s*filter: activeDealFilter,/
    )
  }
)

test(
  'keeps notifications limited to active offers',
  () => {
    assert.match(
      dashboardSource,
      /<CustomerNotificationCenter[\s\S]*?enrichedOffers=\{\s*enrichedOffers\s*\}/
    )
  }
)

test(
  'keeps nearby businesses limited to active offers',
  () => {
    assert.match(
      dashboardSource,
      /<CustomerNearbyBusinessesSection[\s\S]*?enrichedOffers=\{\s*enrichedOffers\s*\}/
    )
  }
)

test(
  'keeps recommendations limited to active offers',
  () => {
    assert.match(
      dashboardSource,
      /<CustomerRecommendationsSection[\s\S]*?enrichedOffers=\{\s*enrichedOffers\s*\}/
    )
  }
)

test(
  'keeps available deals limited to filtered active offers',
  () => {
    assert.match(
      dashboardSource,
      /<CustomerAvailableDealsSection[\s\S]*?enrichedOffers=\{\s*filteredOffers\s*\}/
    )
  }
)

// =============================================================================
// My Pass customer flow
// =============================================================================

test(
  'preserves the My Pass destination',
  () => {
    assert.match(
      dashboardSource,
      /id="my-pass"/
    )

    assert.match(
      dashboardSource,
      /<CustomerSavedDealsSection/
    )
  }
)

test(
  'uses customer history offers in My Pass',
  () => {
    assert.match(
      dashboardSource,
      /<CustomerSavedDealsSection[\s\S]*?enrichedOffers=\{\s*customerHistoryOffers\s*\}/
    )
  }
)

test(
  'uses customer history offers for savings',
  () => {
    assert.match(
      dashboardSource,
      /<CustomerSavingsSection[\s\S]*?enrichedOffers=\{\s*customerHistoryOffers\s*\}/
    )
  }
)

test(
  'preserves redemption history in the customer flow',
  () => {
    assert.match(
      dashboardSource,
      /id="redemption-history"/
    )

    assert.match(
      dashboardSource,
      /<CustomerRedemptionHistorySection/
    )
  }
)

test(
  'uses customer history offers in redemption history',
  () => {
    assert.match(
      dashboardSource,
      /<CustomerRedemptionHistorySection[\s\S]*?enrichedOffers=\{\s*customerHistoryOffers\s*\}/
    )
  }
)

test(
  'preserves pass and organization history',
  () => {
    assert.match(
      dashboardSource,
      /id="support-history"/
    )

    assert.match(
      dashboardSource,
      /<CustomerPassesSection/
    )

    assert.match(
      dashboardSource,
      /organizationById/
    )
  }
)
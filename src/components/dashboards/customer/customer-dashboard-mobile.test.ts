import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const dealsSource = readFileSync(
  new URL('./customer-dashboard-content.tsx', import.meta.url),
  'utf8'
)

const activitySource = readFileSync(
  new URL('./customer-activity-content.tsx', import.meta.url),
  'utf8'
)

const dashboardSource = readFileSync(
  new URL('./customer-dashboard.tsx', import.meta.url),
  'utf8'
)

const customerCommandCenterSource = readFileSync(
  new URL('./customer-command-center.tsx', import.meta.url),
  'utf8'
)

// =============================================================================
// Focused mobile deals experience
// =============================================================================

test('keeps the deals page compact and touch friendly', () => {
  assert.match(
    dealsSource,
    /rounded-3xl border border-blue-100 bg-white p-4 shadow-sm sm:p-6/
  )
  assert.match(dealsSource, /className="min-h-12 w-full/)
  assert.match(dealsSource, /inline-flex min-h-10 shrink-0/)
})

test('keeps deal filters horizontally scrollable on narrow screens', () => {
  assert.match(
    dealsSource,
    /className="mt-3 flex gap-2 overflow-x-auto pb-1"/
  )
  assert.match(dealsSource, /aria-label="Deal filters"/)
})

test('preserves the focused available-offers destination', () => {
  assert.match(dealsSource, /id="available-offers"/)
  assert.match(dealsSource, /className="scroll-mt-24"/)
})

// =============================================================================
// Current marketplace availability
// =============================================================================

test('derives currently available offers from redemption eligibility', () => {
  assert.match(
    dealsSource,
    /const currentlyAvailableOffers = props\.enrichedOffers\.filter\(\(offer\) =>\s*props\.redeemableOfferIds\.has\(offer\.id\)\s*\)/
  )
})

test('keeps filters limited to currently redeemable offers', () => {
  assert.match(
    dealsSource,
    /getCustomerDealFilterCounts\(\{\s*offers: currentlyAvailableOffers,\s*savedOfferIds: props\.savedOfferIds,/
  )
  assert.match(
    dealsSource,
    /filterCustomerDeals\(\{\s*offers: currentlyAvailableOffers,\s*filter: activeDealFilter,\s*savedOfferIds: props\.savedOfferIds,/
  )
})

test('renders only the filtered redeemable offers', () => {
  assert.match(
    dealsSource,
    /<CustomerAvailableDealsSection[\s\S]*?enrichedOffers=\{filteredOffers\}/
  )
})

// =============================================================================
// Dedicated activity history
// =============================================================================

test('combines active and historical offers without duplicate ids', () => {
  assert.match(
    activitySource,
    /const customerHistoryOffers = \[\s*\.\.\.new Map\(/
  )
  assert.match(
    activitySource,
    /\[\.\.\.enrichedOffers, \.\.\.historicalOffers\]\.map\(\(offer\) => \[offer\.id, offer\]\)/
  )
  assert.match(activitySource, /\.values\(\)/)
})

test('uses customer history offers for savings and redemption history', () => {
  assert.match(
    activitySource,
    /<CustomerSavingsSection[\s\S]*?enrichedOffers=\{customerHistoryOffers\}/
  )
  assert.match(
    activitySource,
    /<CustomerRedemptionHistorySection[\s\S]*?enrichedOffers=\{customerHistoryOffers\}/
  )
})

test('preserves redemption and support history destinations', () => {
  assert.match(activitySource, /id="redemption-history"/)
  assert.match(activitySource, /id="support-history"/)
  assert.match(
    activitySource,
    /<CustomerPassesSection[\s\S]*?purchasedPasses=\{purchasedPasses\}[\s\S]*?organizationById=\{organizationById\}/
  )
})

// =============================================================================
// Focused workspace routing
// =============================================================================

test('routes customer deals and activity through dedicated workspace views', () => {
  assert.match(
    dashboardSource,
    /view === 'activity' \? \([\s\S]*?<CustomerActivityContent/
  )
  assert.match(
    dashboardSource,
    /view === 'deals' \? \([\s\S]*?<CustomerDashboardContent/
  )
})

test('keeps mobile-friendly dashboard shortcuts pointed at focused pages', () => {
  assert.match(
    customerCommandCenterSource,
    /href="\/dashboard\/deals#available-offers"/
  )
  assert.match(
    customerCommandCenterSource,
    /href="\/dashboard\/activity"/
  )
  assert.match(
    customerCommandCenterSource,
    /className="mt-3 grid grid-cols-4 gap-2\.5"/
  )
})

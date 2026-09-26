import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const spotlightServiceSource = readFileSync(
  new URL('./spotlight-service.ts', import.meta.url),
  'utf8'
)
const spotlightCarouselSource = readFileSync(
  new URL('../../components/spotlights/spotlight-carousel.tsx', import.meta.url),
  'utf8'
)
const dashboardSource = readFileSync(
  new URL('../../app/dashboard/page.tsx', import.meta.url),
  'utf8'
)
const historySource = readFileSync(
  new URL('../../app/dashboard/notifications/spotlight-history.tsx', import.meta.url),
  'utf8'
)
const notificationPageSource = readFileSync(
  new URL('../../app/dashboard/notifications/page.tsx', import.meta.url),
  'utf8'
)
const seedRewardsSource = readFileSync(
  new URL('../../app/api/owner/demo/seed-rewards/route.ts', import.meta.url),
  'utf8'
)
const migrationSource = readFileSync(
  new URL('../../../supabase/migrations/20260926160000_event_promotion_spotlights.sql', import.meta.url),
  'utf8'
)

test('Event Promotion creates a one-time supporter Spotlight from the reward redemption', () => {
  assert.match(migrationSource, /kind[\s\S]*'event_promo'/)
  assert.match(migrationSource, /array\['customer'\]::text\[\]/)
  assert.match(migrationSource, /max_views_per_user[\s\S]*1/)
  assert.match(migrationSource, /source_type[\s\S]*'business_event_promotion'/)
  assert.match(migrationSource, /'View Event'/)
  assert.match(migrationSource, /'Browse Local Events'/)
})

test('Event Promotion remains scoped to the correct demo group', () => {
  assert.match(spotlightServiceSource, /target_demo_group/)
  assert.match(spotlightServiceSource, /campaign\.target_demo_group !== \(demoGroup\?\.trim\(\) \|\| null\)/)
  assert.match(dashboardSource, /demoGroup: profile\?\.demo_group \?\? null/)
})

test('supporter Spotlight presents event date, business, and location', () => {
  assert.match(spotlightCarouselSource, /Featured Local Event/)
  assert.match(spotlightCarouselSource, /business_name/)
  assert.match(spotlightCarouselSource, /starts_at/)
  assert.match(spotlightCarouselSource, /venue_name/)
  assert.match(spotlightCarouselSource, /address/)
})

test('viewed Event Promotions remain in Notifications & Spotlights history', () => {
  assert.match(notificationPageSource, /metadata/)
  assert.match(historySource, /Featured Local Event/)
  assert.match(historySource, /business_name/)
  assert.match(historySource, /starts_at/)
})

test('Maple gets demo-only points for the full Event Promotion showcase', () => {
  assert.match(seedRewardsSource, /demo_event_promotion_showcase/)
  assert.match(seedRewardsSource, /points: 700/)
  assert.match(seedRewardsSource, /demo_only: true/)
  assert.match(seedRewardsSource, /eventPromotionSpotlightTest/)
})

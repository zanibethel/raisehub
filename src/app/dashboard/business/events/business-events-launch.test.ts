import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const commandCenterSource = readFileSync(
  new URL('../../../../components/dashboards/business/business-command-center.tsx', import.meta.url),
  'utf8'
)
const upgradeActionsSource = readFileSync(
  new URL('../../../upgrade/upgrade-actions.tsx', import.meta.url),
  'utf8'
)
const rewardsPageSource = readFileSync(
  new URL('../../rewards/page.tsx', import.meta.url),
  'utf8'
)
const businessDashboardSource = readFileSync(
  new URL('../../../../components/dashboards/business/business-dashboard.tsx', import.meta.url),
  'utf8'
)
const eventsPageSource = readFileSync(
  new URL('./page.tsx', import.meta.url),
  'utf8'
)
const homePageSource = readFileSync(
  new URL('../../../home/page.tsx', import.meta.url),
  'utf8'
)
const migrationSource = readFileSync(
  new URL('../../../../../supabase/migrations/20260926033000_activate_event_promotion.sql', import.meta.url),
  'utf8'
)

test('demo billing explains safe simulation without telling users to switch to production', () => {
  assert.match(upgradeActionsSource, /Use this demo to review the Growth upgrade flow safely/)
  assert.doesNotMatch(upgradeActionsSource, /Switch to a production Business workspace/)
})

test('business quick actions keep mobile labels contained and expose Events & Promotions', () => {
  assert.match(commandCenterSource, /grid-cols-2/)
  assert.match(commandCenterSource, /break-words/)
  assert.match(commandCenterSource, /Events & Promotions/)
  assert.match(commandCenterSource, /\/dashboard\/business\/events/)
})

test('rewards navigation no longer blocks on reward reconciliation or Stripe refresh', () => {
  assert.doesNotMatch(rewardsPageSource, /sync_business_growth_rewards/)
  assert.doesNotMatch(businessDashboardSource, /reconcileDemoPartnerRewardsNetwork/)
  assert.match(businessDashboardSource, /refreshStripe: false/)
})

test('businesses can create and publish events from the selected workspace', () => {
  assert.match(eventsPageSource, /Save & publish/)
  assert.match(eventsPageSource, /business_events/)
  assert.match(eventsPageSource, /requestedBusinessId/)
})

test('event promotion is active and creates a featured placement for a published upcoming event', () => {
  assert.match(migrationSource, /where code = 'event_promotion_7d'/)
  assert.match(migrationSource, /is_active = true/)
  assert.match(migrationSource, /business_event_promotions/)
  assert.match(migrationSource, /create_business_event_promotion_from_reward/)
})

test('public home includes Local Events discovery', () => {
  assert.match(homePageSource, /FeaturedEventsCarousel/)
})

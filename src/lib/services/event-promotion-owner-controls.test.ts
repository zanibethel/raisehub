import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const ownerPageSource = readFileSync(
  new URL('../../app/dashboard/owner/event-promotions/page.tsx', import.meta.url),
  'utf8'
)
const editorSource = readFileSync(
  new URL('../../components/dashboards/owner/event-promotion-settings-editor.tsx', import.meta.url),
  'utf8'
)
const actionSource = readFileSync(
  new URL('../../app/dashboard/owner/event-promotions/actions.ts', import.meta.url),
  'utf8'
)
const manageSource = readFileSync(
  new URL('../../app/dashboard/owner/manage/page.tsx', import.meta.url),
  'utf8'
)
const repositorySource = readFileSync(
  new URL('../repositories/business-event-repository.ts', import.meta.url),
  'utf8'
)
const migrationSource = readFileSync(
  new URL('../../../supabase/migrations/20260926164000_owner_event_promotion_controls.sql', import.meta.url),
  'utf8'
)

test('Owner dashboard exposes Event Promotion management', () => {
  assert.match(manageSource, /\/dashboard\/owner\/event-promotions/)
  assert.match(ownerPageSource, /Event Promotions/)
  assert.match(ownerPageSource, /paid boost pricing/)
  assert.match(ownerPageSource, /Partner Point/)
})

test('launch paid boost prices are owner-managed', () => {
  assert.match(editorSource, /const durations = \[3, 7, 14\]/)
  assert.match(editorSource, /\{duration\}-Day Boost/)
  assert.match(migrationSource, /\(3, 299, true, 10\)/)
  assert.match(migrationSource, /\(7, 499, true, 20\)/)
  assert.match(migrationSource, /\(14, 799, true, 30\)/)
})

test('Owner controls synchronize Partner Reward pricing', () => {
  assert.match(actionSource, /partner_reward_marketplace_items/)
  assert.match(actionSource, /point_cost: partnerPointCost/)
  assert.match(actionSource, /duration_days: partnerPointDuration/)
  assert.match(actionSource, /is_active: partnerPointsEnabled/)
})

test('Owner can control Spotlight and Local Events exposure', () => {
  assert.match(editorSource, /Supporter Spotlight/)
  assert.match(editorSource, /Featured Local Events placement/)
  assert.match(actionSource, /sync_event_promotion_spotlight_setting/)
  assert.match(repositorySource, /local_events_featured_enabled/)
})

test('Event Promotion configuration remains service-role managed', () => {
  assert.match(
    migrationSource,
    /revoke all on table public\.event_promotion_settings from public, anon, authenticated/
  )
  assert.match(
    migrationSource,
    /grant select, insert, update, delete on table public\.event_promotion_settings to service_role/
  )
  assert.match(
    migrationSource,
    /grant execute on function public\.sync_event_promotion_spotlight_setting\(\)\s+to service_role/
  )
})

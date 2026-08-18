import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'

const redemptionMigration = readFileSync(
  join(
    process.cwd(),
    'supabase/migrations/20260818042000_rate_limit_redemptions.sql'
  ),
  'utf8'
)

const giftMigration = readFileSync(
  join(
    process.cwd(),
    'supabase/migrations/20260818042500_rate_limit_gift_pass_creation.sql'
  ),
  'utf8'
)

test('redemptions are rate limited before direct browser inserts complete', () => {
  assert.ok(
    redemptionMigration.includes(
      'create or replace function public.enforce_redemption_rate_limit()'
    )
  )
  assert.ok(redemptionMigration.includes('before insert on public.redemptions'))
  assert.ok(redemptionMigration.includes("'offer_redemption:create:live'"))
  assert.ok(redemptionMigration.includes('new.user_id is distinct from v_actor_id'))
  assert.ok(redemptionMigration.includes('new.is_demo := coalesce(v_offer_is_demo, false)'))
  assert.ok(redemptionMigration.includes('    5,\n    60'))
})

test('redemption trigger cannot be invoked directly by application roles', () => {
  assert.ok(
    redemptionMigration.includes(
      'revoke execute on function public.enforce_redemption_rate_limit()'
    )
  )
  assert.ok(redemptionMigration.includes('from public, anon, authenticated;'))
})

test('gift creation is rate limited and environment comes from the campaign', () => {
  assert.ok(
    giftMigration.includes(
      'create or replace function public.enforce_gift_pass_creation_rate_limit()'
    )
  )
  assert.ok(giftMigration.includes('before insert on public.gift_passes'))
  assert.ok(giftMigration.includes("'gift_pass:create:live'"))
  assert.ok(giftMigration.includes('new.is_demo := coalesce(v_campaign_is_demo, false)'))
  assert.ok(giftMigration.includes('    5,\n    60'))
})

test('gift trigger remains service-role only', () => {
  assert.ok(
    giftMigration.includes(
      'revoke execute on function public.enforce_gift_pass_creation_rate_limit()'
    )
  )
  assert.ok(giftMigration.includes('to service_role;'))
})

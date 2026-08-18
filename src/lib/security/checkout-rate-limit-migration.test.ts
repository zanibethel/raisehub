import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'

const migrationSource = readFileSync(
  join(
    process.cwd(),
    'supabase/migrations/20260818034500_add_shared_rate_limits.sql'
  ),
  'utf8'
)

test('checkout rate limiting is enforced before checkout attempt inserts complete', () => {
  assert.ok(migrationSource.includes('create table if not exists public.rate_limit_buckets'))
  assert.ok(migrationSource.includes('alter table public.rate_limit_buckets enable row level security'))
  assert.ok(migrationSource.includes('create or replace function public.consume_rate_limit'))
  assert.ok(migrationSource.includes('create or replace function public.enforce_checkout_attempt_rate_limit'))
  assert.ok(migrationSource.includes('before insert on public.checkout_attempts'))
  assert.ok(migrationSource.includes("'campaign_checkout:create:live'"))
  assert.ok(migrationSource.includes('    5,\n    60'))
})

test('rate limit storage and RPC stay unavailable to public application roles', () => {
  assert.ok(
    migrationSource.includes(
      'revoke all on table public.rate_limit_buckets from public, anon, authenticated;'
    )
  )
  assert.ok(
    migrationSource.includes(
      'revoke execute on function public.consume_rate_limit(text, text, integer, integer)'
    )
  )
  assert.ok(migrationSource.includes('from public, anon, authenticated;'))
})

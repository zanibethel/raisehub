import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const migrationSource = readFileSync(
  new URL(
    '../../../supabase/migrations/20260818052000_harden_seller_roster_claim_environment.sql',
    import.meta.url
  ),
  'utf8'
)

test('seller roster claims require campaign and organization environment agreement', () => {
  assert.match(
    migrationSource,
    /v_campaign\.is_demo is distinct from v_organization\.is_demo/i
  )
  assert.match(
    migrationSource,
    /v_campaign\.demo_group is distinct from v_organization\.demo_group/i
  )
  assert.match(
    migrationSource,
    /Campaign and organization environment mismatch/i
  )
})

test('seller roster claims require membership and organization environment agreement', () => {
  assert.match(
    migrationSource,
    /v_membership\.is_demo is distinct from v_organization\.is_demo/i
  )
  assert.match(
    migrationSource,
    /v_membership\.demo_group is distinct from v_organization\.demo_group/i
  )
  assert.match(
    migrationSource,
    /Seller membership and organization environment mismatch/i
  )
})

test('seller roster claims validate the canonical or legacy organization relationship', () => {
  assert.match(
    migrationSource,
    /v_campaign\.canonical_organization_id = v_organization\.id/i
  )
  assert.match(
    migrationSource,
    /v_organization\.legacy_profile_id = v_campaign\.organization_id/i
  )
  assert.match(
    migrationSource,
    /Campaign roster organization mismatch/i
  )
})

test('seller roster claim RPC remains unavailable to signed-out callers', () => {
  assert.match(
    migrationSource,
    /revoke all on function public\.claim_campaign_seller_roster_entry\(uuid, uuid\) from anon;/i
  )
  assert.match(
    migrationSource,
    /grant execute on function public\.claim_campaign_seller_roster_entry\(uuid, uuid\) to authenticated;/i
  )
})

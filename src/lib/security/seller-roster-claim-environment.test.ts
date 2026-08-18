import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'

const migrationSource = readFileSync(
  join(
    process.cwd(),
    'supabase/migrations/20260818052500_harden_seller_roster_claim_environment.sql'
  ),
  'utf8'
)

test('seller roster claims enforce canonical organization and environment boundaries', () => {
  assert.ok(
    migrationSource.includes(
      'create or replace function public.claim_campaign_seller_roster_entry'
    )
  )
  assert.ok(
    migrationSource.includes(
      'v_campaign.canonical_organization_id = v_organization.id'
    )
  )
  assert.ok(
    migrationSource.includes(
      'v_campaign.is_demo is distinct from v_organization.is_demo'
    )
  )
  assert.ok(
    migrationSource.includes(
      'v_actor_profile.is_demo is distinct from v_organization.is_demo'
    )
  )
  assert.ok(
    migrationSource.includes(
      'v_membership.is_demo is distinct from v_organization.is_demo'
    )
  )
  assert.ok(
    migrationSource.includes(
      'demo_group is distinct from v_organization.demo_group'
    )
  )
})

test('seller roster claim RPC remains signed-in only', () => {
  assert.ok(
    migrationSource.includes(
      'revoke all on function public.claim_campaign_seller_roster_entry(uuid, uuid)\nfrom public, anon;'
    )
  )
  assert.ok(
    migrationSource.includes(
      'grant execute on function public.claim_campaign_seller_roster_entry(uuid, uuid)\nto authenticated, service_role;'
    )
  )
})

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'

const migrationSource = readFileSync(
  join(
    process.cwd(),
    'supabase/migrations/20260818055500_fix_atomic_purchase_canonical_organization.sql'
  ),
  'utf8'
)

test('atomic purchase fulfillment persists the canonical organization parent', () => {
  assert.ok(
    migrationSource.includes(
      'select o.id into v_organization_workspace_id'
    )
  )
  assert.ok(
    migrationSource.includes(
      'where o.legacy_profile_id = p_selected_organization_id'
    )
  )
  assert.ok(
    migrationSource.includes('organization_workspace_id, donation_amount')
  )
  assert.ok(
    migrationSource.includes(
      'v_organization_workspace_id, v_donation_amount'
    )
  )
})

test('atomic purchase RPC remains service-role only', () => {
  assert.ok(
    migrationSource.includes(
      ') from public, anon, authenticated;'
    )
  )
  assert.ok(
    migrationSource.includes(') to service_role;')
  )
})

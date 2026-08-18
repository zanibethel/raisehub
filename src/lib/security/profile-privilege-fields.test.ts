import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const migrationUrl = new URL(
  '../../../supabase/migrations/20260818053500_guard_profile_privilege_fields.sql',
  import.meta.url
)

async function readMigration() {
  return readFile(migrationUrl, 'utf8')
}

test('blocks direct authenticated edits to privileged profile fields', async () => {
  const sql = await readMigration()

  assert.match(sql, /subscription_tier is distinct from old\.subscription_tier/i)
  assert.match(sql, /new\.is_demo is distinct from old\.is_demo/i)
  assert.match(sql, /new\.demo_group is distinct from old\.demo_group/i)
  assert.match(sql, /new\.email is distinct from old\.email/i)
  assert.match(sql, /new\.role is distinct from old\.role/i)
  assert.match(sql, /new\.role in \('business', 'organization'\)/i)
})

test('installs the guard before profile updates', async () => {
  const sql = await readMigration()

  assert.match(sql, /create trigger guard_profile_privilege_fields[\s\S]*before update on public\.profiles/i)
  assert.match(sql, /current_user <> 'authenticated'/i)
  assert.match(sql, /old\.id is distinct from auth\.uid\(\)/i)
})

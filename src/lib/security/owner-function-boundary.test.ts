import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const migrationUrl = new URL(
  '../../../supabase/migrations/20260818044500_tighten_owner_function_boundary.sql',
  import.meta.url
)

async function readMigration() {
  return readFile(migrationUrl, 'utf8')
}

test('removes anonymous access to owner-only demo metadata', async () => {
  const sql = await readMigration()

  assert.match(sql, /revoke all privileges on table public\.demo_groups from anon/i)
  assert.match(sql, /revoke all privileges on table public\.demo_profiles from anon/i)
  assert.match(sql, /alter policy demo_groups_owner_select[\s\S]*to authenticated/i)
  assert.match(sql, /alter policy demo_profiles_owner_select[\s\S]*to authenticated/i)
})

test('removes the anonymous is_owner RPC surface', async () => {
  const sql = await readMigration()

  assert.match(sql, /revoke execute on function public\.is_owner\(\) from public/i)
  assert.match(
    sql,
    /grant execute on function public\.is_owner\(\) to authenticated, service_role/i
  )
})

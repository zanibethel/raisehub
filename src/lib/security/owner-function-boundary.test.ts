import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const boundaryMigrationUrl = new URL(
  '../../../supabase/migrations/20260818044500_tighten_owner_function_boundary.sql',
  import.meta.url
)

const explicitAnonRevokeMigrationUrl = new URL(
  '../../../supabase/migrations/20260818045200_revoke_anon_is_owner_execute.sql',
  import.meta.url
)

async function readBoundaryMigration() {
  return readFile(boundaryMigrationUrl, 'utf8')
}

async function readExplicitAnonRevokeMigration() {
  return readFile(explicitAnonRevokeMigrationUrl, 'utf8')
}

test('removes anonymous access to owner-only demo metadata', async () => {
  const sql = await readBoundaryMigration()

  assert.match(sql, /revoke all privileges on table public\.demo_groups from anon/i)
  assert.match(sql, /revoke all privileges on table public\.demo_profiles from anon/i)
  assert.match(sql, /alter policy demo_groups_owner_select[\s\S]*to authenticated/i)
  assert.match(sql, /alter policy demo_profiles_owner_select[\s\S]*to authenticated/i)
})

test('removes both public and explicit anonymous is_owner execute grants', async () => {
  const boundarySql = await readBoundaryMigration()
  const explicitAnonSql = await readExplicitAnonRevokeMigration()

  assert.match(
    boundarySql,
    /revoke execute on function public\.is_owner\(\) from public/i
  )
  assert.match(
    explicitAnonSql,
    /revoke execute on function public\.is_owner\(\) from anon/i
  )
  assert.match(
    explicitAnonSql,
    /grant execute on function public\.is_owner\(\) to authenticated, service_role/i
  )
})

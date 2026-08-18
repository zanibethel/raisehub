import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const migrationUrl = new URL(
  '../../../supabase/migrations/20260818063000_revoke_client_table_ddl_privileges.sql',
  import.meta.url
)

async function readMigration() {
  return readFile(migrationUrl, 'utf8')
}

test('revokes non-RLS table privileges from client roles', async () => {
  const sql = await readMigration()

  assert.match(
    sql,
    /revoke truncate, references, trigger on table %I\.%I from anon, authenticated/i
  )
})

test('prevents the same default privileges on future public tables', async () => {
  const sql = await readMigration()

  assert.match(
    sql,
    /alter default privileges in schema public[\s\S]*revoke truncate, references, trigger on tables from anon, authenticated/i
  )
})

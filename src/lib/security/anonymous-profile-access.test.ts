import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const migrationUrl = new URL(
  '../../../supabase/migrations/20260818051500_narrow_anonymous_profile_columns.sql',
  import.meta.url
)

async function readMigration() {
  return readFile(migrationUrl, 'utf8')
}

test('removes broad anonymous privileges from profiles', async () => {
  const sql = await readMigration()

  assert.match(sql, /revoke all privileges on table public\.profiles from anon/i)
})

test('grants only approved public presentation columns to anon', async () => {
  const sql = await readMigration()

  assert.match(sql, /grant select \([\s\S]*business_name[\s\S]*display_name[\s\S]*logo_url[\s\S]*phone[\s\S]*address[\s\S]*website_url[\s\S]*google_maps_url[\s\S]*is_demo[\s\S]*demo_group[\s\S]*\) on table public\.profiles to anon/i)
  assert.doesNotMatch(sql, /grant select \([\s\S]*\bemail\b[\s\S]*\) on table public\.profiles to anon/i)
  assert.doesNotMatch(sql, /grant select \([\s\S]*\bsubscription_tier\b[\s\S]*\) on table public\.profiles to anon/i)
  assert.doesNotMatch(sql, /grant select \([\s\S]*\bonboarding_completed\b[\s\S]*\) on table public\.profiles to anon/i)
})

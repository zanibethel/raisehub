import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const migrationUrl = new URL(
  '../../../supabase/migrations/20260818060000_narrow_authenticated_partner_profile_reads.sql',
  import.meta.url
)

async function readMigration() {
  return readFile(migrationUrl, 'utf8')
}

test('limits the public partner profile policy to anonymous callers', async () => {
  const sql = await readMigration()

  assert.match(
    sql,
    /alter policy "Anyone can view public partner profiles"[\s\S]*to anon/i
  )
  assert.match(
    sql,
    /drop policy if exists "Authenticated users can view business profiles"/i
  )
})

test('keeps redemption-based customer visibility without broad partner rows', async () => {
  const sql = await readMigration()

  assert.match(sql, /redemptions\.user_id = profiles\.id/i)
  assert.match(sql, /offers\.business_id = auth\.uid\(\)/i)
  assert.doesNotMatch(sql, /role\s*=\s*'business'/i)
})

import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'

const migrationPath = new URL(
  '../../../supabase/migrations/20260818062500_harden_public_logo_bucket.sql',
  import.meta.url
)

test('public logo bucket enforces bounded image uploads', async () => {
  const sql = await readFile(migrationPath, 'utf8')

  assert.match(sql, /file_size_limit\s*=\s*5242880/i)
  assert.match(sql, /image\/png/)
  assert.match(sql, /image\/jpeg/)
  assert.match(sql, /image\/webp/)
  assert.match(sql, /image\/gif/)
  assert.doesNotMatch(sql, /image\/svg\+xml/)
})

test('authenticated direct uploads are restricted to business logo paths', async () => {
  const sql = await readFile(migrationPath, 'utf8')

  assert.match(sql, /to authenticated/i)
  assert.match(sql, /storage\.foldername\(name\)/i)
  assert.match(sql, /'businesses'/i)
})

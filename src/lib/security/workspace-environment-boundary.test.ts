import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const migrationUrl = new URL(
  '../../../supabase/migrations/20260818051500_preserve_workspace_environment_boundary.sql',
  import.meta.url
)

async function readMigration() {
  return readFile(migrationUrl, 'utf8')
}

test('business workspace creation inherits the actor environment', async () => {
  const sql = await readMigration()

  assert.match(sql, /select p\.is_demo, p\.demo_group[\s\S]*where p\.id = v_user_id/i)
  assert.match(
    sql,
    /insert into public\.businesses[\s\S]*is_demo,[\s\S]*demo_group[\s\S]*v_actor_is_demo,[\s\S]*v_actor_demo_group/i
  )
})

test('organization workspace creation inherits the actor environment', async () => {
  const sql = await readMigration()

  assert.match(
    sql,
    /insert into public\.organizations[\s\S]*is_demo,[\s\S]*demo_group[\s\S]*v_actor_is_demo,[\s\S]*v_actor_demo_group/i
  )
})

test('workspace RPCs remain unavailable to signed-out callers', async () => {
  const sql = await readMigration()

  assert.match(
    sql,
    /revoke execute on function public\.create_business_workspace\(text\) from public, anon/i
  )
  assert.match(
    sql,
    /revoke execute on function public\.create_organization_workspace\(text\) from public, anon/i
  )
  assert.match(
    sql,
    /grant execute on function public\.create_business_workspace\(text\) to authenticated, service_role/i
  )
})

import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import assert from 'node:assert/strict'

const source = fs.readFileSync(
  path.join(process.cwd(), 'src/app/gifts/actions.ts'),
  'utf8'
)

test('gift pricing resolves from the campaign organization workspace', () => {
  assert.match(source, /const selectedOrganizationId = campaign\.organization_id/)
  assert.match(source, /legacy_profile_id', selectedOrganizationId/)
  assert.match(source, /organizationId: canonicalOrganizationResult\.data\.id/)
  assert.match(source, /isDemo: environment\.mode === 'demo'/)
})

test('gift support recipient remains the campaign organization', () => {
  assert.match(source, /p_selected_organization_id: selectedOrganizationId/)
  assert.match(source, /selected_organization_id: selectedOrganizationId/)
})

test('gift donations are normalized to cents', () => {
  assert.match(
    source,
    /Math\.round\(Math\.max\(0, normalized\) \* 100\) \/ 100/
  )
})

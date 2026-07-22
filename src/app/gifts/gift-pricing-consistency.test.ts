import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import assert from 'node:assert/strict'

const source = fs.readFileSync(
  path.join(process.cwd(), 'src/app/gifts/actions.ts'),
  'utf8'
)

test('gift pricing resolves from the campaign organization', () => {
  assert.match(
    source,
    /legacy_profile_id', campaign\.organization_id/
  )
  assert.match(
    source,
    /campaignOrganizationRecord\?\.id \?\? null/
  )
  assert.match(
    source,
    /isDemo: campaignOrganizationProfile\.is_demo/
  )
})

test('selected support recipient does not replace the pricing owner', () => {
  assert.doesNotMatch(
    source,
    /legacy_profile_id', selectedOrganizationId/
  )
})

test('gift donations are normalized to cents', () => {
  assert.match(
    source,
    /Math\.round\(Math\.max\(0, normalized\) \* 100\) \/ 100/
  )
})

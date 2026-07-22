import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const actionSource = readFileSync(new URL('./actions.ts', import.meta.url), 'utf8')
const setupActionSource = readFileSync(
  new URL('../../components/dashboards/organization/organization-profile-actions.ts', import.meta.url),
  'utf8'
)
const setupLoaderSource = readFileSync(
  new URL('../../components/dashboards/organization/organization-profile-setup-loader.tsx', import.meta.url),
  'utf8'
)

test('campaign creation requires completed organization pricing location', () => {
  assert.ok(actionSource.includes('organizationSetupIsComplete'))
  assert.ok(actionSource.includes('town_name'))
  assert.ok(actionSource.includes('state_code'))
  assert.ok(
    actionSource.includes(
      'Complete your organization name, town, and state before creating a campaign.'
    )
  )
})

test('organization setup validates and saves canonical town and state', () => {
  assert.ok(setupActionSource.includes('Town or city is required'))
  assert.ok(setupActionSource.includes('town_name: townName'))
  assert.ok(setupActionSource.includes('state_code: stateCode'))
})

test('organization membership setup avoids unsupported partial-index upsert', () => {
  assert.ok(setupActionSource.includes('existingMembership'))
  assert.ok(setupActionSource.includes(".eq('status', 'active')"))
  assert.ok(setupActionSource.includes(".from('organization_memberships').insert"))
  assert.ok(
    !setupActionSource.includes("onConflict: 'organization_id,user_id'")
  )
})

test('dashboard setup state uses the same readiness requirements', () => {
  assert.ok(setupLoaderSource.includes('profileData.name.trim()'))
  assert.ok(setupLoaderSource.includes('profileData.townName.trim()'))
  assert.ok(setupLoaderSource.includes('profileData.stateCode'))
})

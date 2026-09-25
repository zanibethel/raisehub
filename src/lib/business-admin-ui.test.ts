import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'

const adminPage = readFileSync(
  join(process.cwd(), 'src/app/site/[slug]/admin/page.tsx'),
  'utf8'
)

const adminManifest = readFileSync(
  join(
    process.cwd(),
    'src/app/site/[slug]/admin/manifest.webmanifest/route.ts'
  ),
  'utf8'
)

const publicSite = readFileSync(
  join(process.cwd(), 'src/app/site/[slug]/page.tsx'),
  'utf8'
)

test('business admin uses RaiseHub auth and owner/manager authorization', () => {
  assert.ok(adminPage.includes('supabase.auth.getUser()'))
  assert.ok(adminPage.includes("from('business_memberships')"))
  assert.ok(adminPage.includes("['owner', 'manager']"))
  assert.ok(adminPage.includes('/login?next='))
  assert.ok(adminPage.includes('You do not have permission'))
})

test('business admin exposes the core operating sections', () => {
  for (const label of [
    'Business Details',
    'Locations',
    'Schedule',
    'Appointments',
    'Integrations',
    'RaiseHub Offers',
  ]) {
    assert.ok(adminPage.includes(label))
  }

  assert.ok(adminPage.includes('Install Admin App'))
  assert.ok(adminPage.includes('Google Calendar'))
})

test('admin app has its own standalone manifest and admin start URL', () => {
  assert.ok(adminManifest.includes('/admin?source=installed-admin'))
  assert.ok(adminManifest.includes("display: 'standalone'"))
  assert.ok(adminManifest.includes('RaiseHub Business Admin'))
})

test('public business sites include a subtle RaiseHub offers callout', () => {
  assert.ok(publicSite.includes('Exclusive RaiseHub offers'))
  assert.ok(publicSite.includes('Take advantage of exclusive offers for'))
  assert.ok(publicSite.includes('through RaiseHub.'))
  assert.ok(publicSite.includes('/businesses/${site.business_id}'))
})

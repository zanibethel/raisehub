import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const schoolsSource = readFileSync(
  new URL('./page.tsx', import.meta.url),
  'utf8'
)

const itSource = readFileSync(
  new URL('./it-access/page.tsx', import.meta.url),
  'utf8'
)

const organizationSignupSource = readFileSync(
  new URL('../signup/organization/page.tsx', import.meta.url),
  'utf8'
)

test('school setup explains account-optional managed seller participation', () => {
  assert.match(schoolsSource, /Student accounts are optional/)
  assert.match(schoolsSource, /Organization-managed seller/)
  assert.match(schoolsSource, /Optional seller account/)
  assert.match(schoolsSource, /children under 13/)
})

test('school IT page publishes core vendor-review requirements', () => {
  assert.match(itSource, /https:\/\/raisehub\.app/)
  assert.match(itSource, /buoczurgckoazbkwgcik\.supabase\.co/)
  assert.match(itSource, /checkout\.stripe\.com/)
  assert.match(itSource, /\/privacy/)
  assert.match(itSource, /\/terms/)
  assert.match(itSource, /\/fundraising-policy/)
  assert.match(itSource, /support@raisehub\.app/)
})

test('organization signup links directly to school setup and IT review', () => {
  assert.match(organizationSignupSource, /href="\/schools"/)
  assert.match(organizationSignupSource, /href="\/schools\/it-access"/)
})

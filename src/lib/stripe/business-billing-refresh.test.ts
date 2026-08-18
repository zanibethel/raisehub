import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import assert from 'node:assert/strict'

const refreshSource = fs.readFileSync(
  path.join(process.cwd(), 'src/lib/stripe/business-billing-refresh.ts'),
  'utf8'
)
const upgradeSource = fs.readFileSync(
  path.join(process.cwd(), 'src/app/upgrade/page.tsx'),
  'utf8'
)

test('billing refresh reads Stripe period dates from subscription items when needed', () => {
  assert.match(refreshSource, /itemRecord\.current_period_start/)
  assert.match(refreshSource, /itemRecord\.current_period_end/)
})

test('billing refresh treats either Stripe cancellation signal as scheduled', () => {
  assert.match(refreshSource, /subscription\.cancel_at_period_end/)
  assert.match(refreshSource, /subscriptionRecord\(subscription\)\.cancel_at/)
  assert.match(refreshSource, /cancel_at_period_end: hasScheduledCancellation\(subscription\)/)
  assert.match(refreshSource, /current_period_end: period\.end/)
})

test('upgrade page refreshes Stripe state and clearly shows scheduled cancellation', () => {
  assert.match(upgradeSource, /refreshBusinessBillingFromStripe/)
  assert.match(upgradeSource, /Growth cancellation scheduled/)
  assert.match(upgradeSource, /Your subscription will not renew/)
  assert.match(upgradeSource, /Renewal/)
})

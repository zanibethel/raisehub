import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import assert from 'node:assert/strict'

const billingSource = fs.readFileSync(
  path.join(process.cwd(), 'src/lib/stripe/business-billing.ts'),
  'utf8'
)

test('webhook billing sync accepts Stripe item period fields', () => {
  assert.match(billingSource, /itemRecord\.current_period_start/)
  assert.match(billingSource, /itemRecord\.current_period_end/)
})

test('webhook billing sync honors both Stripe scheduled-cancellation representations', () => {
  assert.match(billingSource, /subscription\.cancel_at_period_end/)
  assert.match(billingSource, /subscriptionRecord\(subscription\)\.cancel_at/)
  assert.match(
    billingSource,
    /cancel_at_period_end: hasScheduledCancellation\(subscription\)/
  )
})

test('cleared Stripe cancellation signals are not persisted as scheduled', () => {
  assert.match(
    billingSource,
    /cancelAt > Math\.floor\(Date\.now\(\) \/ 1000\)/
  )
})

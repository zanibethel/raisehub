import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import assert from 'node:assert/strict'

const billingSource = fs.readFileSync(
  path.join(process.cwd(), 'src/lib/stripe/business-billing.ts'),
  'utf8'
)
const checkoutSource = fs.readFileSync(
  path.join(process.cwd(), 'src/app/api/business/billing/checkout/route.ts'),
  'utf8'
)
const webhookSource = fs.readFileSync(
  path.join(process.cwd(), 'src/app/api/stripe/webhook/route.ts'),
  'utf8'
)
const upgradeSource = fs.readFileSync(
  path.join(process.cwd(), 'src/app/upgrade/page.tsx'),
  'utf8'
)

test('business upgrades use recurring Stripe Checkout and reject demo workspaces', () => {
  assert.match(checkoutSource, /mode: 'subscription'/)
  assert.match(checkoutSource, /recurring: \{ interval: plan\.interval \}/)
  assert.match(checkoutSource, /Demo businesses cannot create Stripe subscriptions/)
  assert.match(checkoutSource, /subscription_status: 'incomplete'/)
})

test('signed Stripe webhook handles business billing before normal checkout fulfillment', () => {
  const billingIndex = webhookSource.indexOf('handleBusinessBillingEvent(admin, event)')
  const checkoutIndex = webhookSource.indexOf('validateProductionCheckoutAttempt')
  assert.ok(billingIndex > 0)
  assert.ok(checkoutIndex > billingIndex)
})

test('subscription state controls both canonical and legacy business tiers', () => {
  assert.match(billingSource, /subscription_tier: tier/)
  assert.match(billingSource, /\.from\('profiles'\)/)
  assert.match(billingSource, /GROWTH_ACCESS_STATUSES/)
  assert.match(billingSource, /cancel_at_period_end/)
})

test('upgrade page does not grant Growth from checkout redirect alone', () => {
  assert.match(upgradeSource, /activates Growth from signed Stripe subscription events/)
  assert.doesNotMatch(upgradeSource, /subscription_tier:\s*'growth'/)
})

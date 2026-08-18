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
const portalSource = fs.readFileSync(
  path.join(process.cwd(), 'src/app/api/business/billing/portal/route.ts'),
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

test('only Business owners can change paid billing', () => {
  assert.match(checkoutSource, /membership\.membership_role !== 'owner'/)
  assert.match(checkoutSource, /Only the Business owner can change the paid plan/)
  assert.match(portalSource, /membership\.membership_role !== 'owner'/)
  assert.match(portalSource, /Only the Business owner can manage paid billing/)
})

test('unfinished business upgrade checkouts resume instead of creating duplicates', () => {
  assert.match(checkoutSource, /checkout\.sessions\.list/)
  assert.match(checkoutSource, /status: 'open'/)
  assert.match(checkoutSource, /resumed: true/)
  assert.match(checkoutSource, /Another billing change is already in progress/)
})

test('Business billing portal is provisioned with launch-safe subscription controls', () => {
  assert.match(portalSource, /billingPortal\.configurations\.list/)
  assert.match(portalSource, /billingPortal\.configurations\.create/)
  assert.match(portalSource, /payment_method_update/)
  assert.match(portalSource, /invoice_history/)
  assert.match(portalSource, /mode: 'at_period_end'/)
  assert.match(portalSource, /proration_behavior: 'none'/)
  assert.match(portalSource, /configuration: configuration\.id/)
})

test('Business billing portal fails safely if Stripe portal setup is unavailable', () => {
  assert.match(portalSource, /Billing management is temporarily unavailable/)
  assert.match(portalSource, /status: 503/)
})

test('signed Stripe webhook handles business billing before normal checkout fulfillment', () => {
  const billingIndex = webhookSource.indexOf('handleBusinessBillingEvent(admin, event)')
  const fulfillmentIndex = webhookSource.lastIndexOf(
    'await validateProductionCheckoutAttempt'
  )
  assert.ok(billingIndex > 0)
  assert.ok(fulfillmentIndex > billingIndex)
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

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const stripeSource = readFileSync(
  new URL('./event-promotion.ts', import.meta.url),
  'utf8'
)
const billingSource = readFileSync(
  new URL('./business-billing.ts', import.meta.url),
  'utf8'
)
const actionsSource = readFileSync(
  new URL('../../app/dashboard/business/events/actions.ts', import.meta.url),
  'utf8'
)
const controlsSource = readFileSync(
  new URL(
    '../../app/dashboard/business/events/event-promotion-controls.tsx',
    import.meta.url
  ),
  'utf8'
)
const eventsPageSource = readFileSync(
  new URL('../../app/dashboard/business/events/page.tsx', import.meta.url),
  'utf8'
)
const repositorySource = readFileSync(
  new URL('../repositories/business-event-repository.ts', import.meta.url),
  'utf8'
)
const migrationSource = readFileSync(
  new URL(
    '../../../supabase/migrations/20260926233000_paid_event_promotion_checkout.sql',
    import.meta.url
  ),
  'utf8'
)

test('paid Event Promotion uses Stripe Checkout with dynamic payment methods and webhook fulfillment', () => {
  assert.match(stripeSource, /stripe\.checkout\.sessions\.create/)
  assert.match(stripeSource, /checkout\.session\.completed/)
  assert.match(stripeSource, /checkout\.session\.async_payment_succeeded/)
  assert.match(stripeSource, /fulfill_paid_event_promotion_purchase/)
  assert.doesNotMatch(stripeSource, /payment_method_types/)
  assert.match(billingSource, /handleEventPromotionStripeEvent/)
})

test('server resolves Owner-managed price and persists service-only checkout attempts', () => {
  assert.match(migrationSource, /event_promotion_price_options/)
  assert.match(migrationSource, /price_cents/)
  assert.match(migrationSource, /create_event_promotion_purchase_attempt/)
  assert.match(
    migrationSource,
    /revoke all on table public\.event_promotion_purchases from public, anon, authenticated/
  )
  assert.match(
    migrationSource,
    /grant select, insert, update on table public\.event_promotion_purchases to service_role/
  )
  assert.doesNotMatch(actionsSource, /priceCents\s*:\s*input/)
})

test('Demo paid promotion is simulated without creating a Stripe Checkout Session', () => {
  assert.match(actionsSource, /if \(context\.business\.is_demo\)/)
  assert.match(actionsSource, /fulfill_demo_event_promotion_purchase/)
  assert.match(
    actionsSource,
    /Demo paid promotion simulated successfully\. No Stripe charge was created\./
  )
  assert.match(migrationSource, /'demo_paid'/)
})

test('live Event Promotion charging remains safety locked until explicitly enabled', () => {
  assert.match(stripeSource, /EVENT_PROMOTION_LIVE_PAYMENTS_ENABLED/)
  assert.match(stripeSource, /'live-disabled'/)
  assert.match(
    controlsSource,
    /Live charging is safety-locked until the Stripe live account is verified/
  )
})

test('Promote Event targets the exact event and converges paid and Partner Points into one promotion table', () => {
  assert.match(migrationSource, /target_event_id/)
  assert.match(migrationSource, /redeem_partner_reward_for_event/)
  assert.match(migrationSource, /create_business_event_promotion_from_source/)
  assert.match(migrationSource, /purchase_id/)
  assert.match(migrationSource, /reward_redemption_id/)
  assert.match(controlsSource, /Promote Event/)
  assert.match(controlsSource, /Use Partner Points/)
  assert.match(controlsSource, /Pay to Promote/)
})

test('promotion exposure stops with event lifecycle and never extends beyond the event boundary', () => {
  assert.match(
    migrationSource,
    /v_event_boundary := coalesce\(v_event\.ends_at, v_event\.starts_at \+ interval '4 hours'\)/
  )
  assert.match(migrationSource, /least\(/)
  assert.match(migrationSource, /is_active = new\.is_published/)
})

test('paid and Partner Point promotion labels remain distinct in Local Events', () => {
  assert.match(repositorySource, /promotion_source/)
  assert.match(controlsSource, /Sponsored Local Event/)
  assert.match(controlsSource, /Featured Local Event/)
})

test('checkout return page does not fulfill payment', () => {
  assert.match(
    eventsPageSource,
    /Promotion activates only after RaiseHub receives verified payment confirmation/
  )
  assert.doesNotMatch(eventsPageSource, /fulfill_paid_event_promotion_purchase/)
})

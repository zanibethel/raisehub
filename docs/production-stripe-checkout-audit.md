# Production Stripe Checkout Audit

## Current state

- `purchaseCampaignPassAction` performs pricing resolution, records the purchase, and grants the entitlement in the same request.
- `create_campaign_purchase_with_entitlement` is atomic and service-role only, but it hardcodes `payment_status = 'test_paid'`.
- There is no Stripe Checkout Session creation path in the current campaign purchase action.
- There is no signed Stripe webhook fulfillment path tied to campaign purchases.
- The existing atomic database function is a strong fulfillment primitive, but it must only run after Stripe confirms payment.

## Production target

1. Customer submits campaign, organization, donation, and seller attribution.
2. Server authenticates the customer and resolves sellability and managed pricing.
3. Server creates a pending checkout record containing immutable pricing and attribution snapshots.
4. Server creates a Stripe Checkout Session using server-calculated totals only.
5. Customer is redirected to Stripe.
6. A signed `checkout.session.completed` webhook validates payment state, currency, amount, and metadata.
7. Fulfillment runs through one idempotent database transaction that records the paid purchase and grants the entitlement once.
8. Duplicate or retried webhook events return success without duplicating purchases or entitlements.
9. Cancel and return pages show the current checkout state without granting access from the browser redirect.

## Required database changes

- Add a checkout-attempt table with Stripe session ID, user, campaign, organization, pricing snapshot, donation, attribution, status, and timestamps.
- Add a processed Stripe event table or equivalent unique event constraint.
- Add Stripe identifiers to completed purchase history for reconciliation.
- Replace the test-only fulfillment function with a production fulfillment function that accepts a verified checkout attempt and writes `payment_status = 'paid'`.
- Preserve the unique purchase-to-entitlement constraint.

## Required application changes

- Add a server-only Stripe client and environment validation.
- Replace immediate purchase fulfillment with Checkout Session creation.
- Add a raw-body webhook route with Stripe signature verification.
- Add success and cancel states that read checkout status but never grant entitlement.
- Add regression tests for server-calculated totals, duplicate webhook delivery, amount mismatch, failed payment, donation-only support, and one-time entitlement creation.

## Safety rules

- Never trust prices, fees, organization earnings, or user IDs from the browser.
- Never grant an entitlement from the success-page redirect.
- Never treat Checkout Session creation as payment confirmation.
- Never retry fulfillment outside an idempotent transaction.
- Never expose the Stripe secret key or webhook secret to client code.

## Implementation order

1. Database schema and idempotent fulfillment RPC.
2. Stripe server configuration and Checkout Session creation.
3. Signed webhook fulfillment.
4. Success/cancel UX and customer status recovery.
5. Automated tests, preview validation, and Stripe test-mode end-to-end verification.

## Preview and production configuration

Required server-side environment variables:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

For a Vercel Preview deployment protected by Vercel Authentication, Stripe cannot reach the webhook route unless the project has a Protection Bypass for Automation secret. Add that secret to the Stripe preview webhook destination as the `x-vercel-protection-bypass` query parameter. Never commit or document the secret itself.

Example protected preview destination shape:

```text
https://<preview-host>/api/stripe/webhook?x-vercel-protection-bypass=<secret>
```

Production uses its own live Stripe secret key, live webhook endpoint, and endpoint-specific webhook signing secret. The preview bypass is not needed for an unprotected production domain.

## Test-mode validation completed

Validated against the PR #15 Vercel preview and the RaiseHub Supabase project on July 22, 2026:

- Stripe Checkout Session creation succeeded using server-calculated pricing.
- A declined test card remained unfulfilled and granted no pass.
- A successful test payment returned to `/checkout/success`.
- The signed `checkout.session.completed` webhook reached `/api/stripe/webhook` and returned HTTP `200`.
- The checkout attempt changed from `open` to `paid`.
- One paid campaign purchase was created.
- One active `purchased_pass` entitlement was created with the expected six-month term.
- Re-sending the same Stripe event returned HTTP `200` without creating a duplicate purchase or entitlement.
- Browser return alone did not grant access before webhook confirmation.

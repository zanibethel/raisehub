# Controlled Pilot Customer QA

## Goal

Validate the complete production customer journey before expanding QA to business, organization, admin, and owner roles.

This pass focuses on the customer-facing money, entitlement, offer, and redemption paths that must work reliably during a controlled pilot.

## Environment

- Application: `https://raisehub.vercel.app`
- Branch: `sprint/controlled-pilot-customer-qa`
- Stripe: Sandbox/test mode until explicit live-payment cutover
- Production code baseline: merge commit `57e27cd837b13d90a64660b79ea2dc0995b027fe`

## Already validated

- [x] Production Stripe Checkout opens successfully.
- [x] Sandbox card payment completes successfully.
- [x] Signed production webhook reaches RaiseHub.
- [x] Paid checkout creates one purchase and one active pass entitlement.
- [x] Duplicate webhook delivery does not create duplicate purchases or entitlements.
- [x] Customer returns to the production success flow.
- [x] Active-pass customer can make an additional donation without receiving another pass.
- [x] Production and preview use separate webhook destinations.

## Production evidence — 2026-07-23

The same production customer completed both paths against the production deployment while Stripe remained in Sandbox mode.

### First pass purchase

- Checkout attempt: `77da5b05-1090-4220-bbe6-f5d9b0fba2d7`
- Status: `paid`
- Amount: `$20.00`
- Donation amount: `$0.00`
- Entitlement requested: yes
- Result: exactly one paid `campaign_purchases` row and exactly one linked `customer_entitlements` row

### Active-pass donation

- Checkout attempt: `fa1af618-1a92-4528-8fa1-3416766224d7`
- Status: `paid`
- Amount: `$25.00`
- Donation amount: `$25.00`
- Entitlement requested: no
- Result: exactly one paid `campaign_purchases` row and zero linked entitlement rows

This verifies the database-level distinction between a first pass purchase and a donation made by a customer who already has an active pass.

### Customer persistence check

After signing out and signing back in on production, the customer confirmed:

- the active pass remained visible
- the displayed expiration date looked correct
- saved offers and purchase history loaded
- campaign support remained donation-only instead of offering a second pass

## Customer QA matrix

### A. Authentication and routing

- [ ] Logged-out customer is prompted to create an account or log in before purchase.
- [ ] Customer login returns to the intended campaign or checkout path.
- [x] Customer dashboard loads without role-routing errors.
- [ ] Expired or invalid authentication is handled without a broken page.
- [ ] Customer cannot access business, organization, admin, or owner workspaces.

### B. First pass purchase

- [x] Campaign page shows the expected pass price before checkout.
- [x] Charged Stripe amount matches the displayed amount.
- [x] Selected organization receives the intended support attribution.
- [ ] Optional seller name is preserved when provided.
- [ ] Canceling Stripe Checkout returns to the dedicated recovery page.
- [x] Returning from successful checkout shows a clear confirmation state.
- [x] Pass appears on the customer dashboard without a manual support action.
- [x] Pass start and expiration dates are correct.

### C. Active-pass donation

- [x] Active-pass customer sees donation-only behavior instead of a second-pass purchase.
- [ ] Zero-dollar donation is blocked.
- [x] Valid donation amount opens Stripe Checkout.
- [x] Charged amount matches the entered donation amount.
- [x] Donation creates a purchase record without creating a second entitlement.
- [x] Donation confirmation clearly states that the existing pass remains active.

### D. Pass access and account isolation

- [x] My Pass displays the correct active pass.
- [x] Pass remains available after signing out and back in.
- [ ] A different customer account cannot see the first customer’s pass, purchases, saved offers, or redemption history.
- [ ] Expired-pass behavior is clear and does not grant offer access.

### E. Offer discovery and saving

- [ ] Customer can browse active offers.
- [ ] Offer detail pages load on mobile and desktop.
- [ ] Active-pass access requirements are enforced consistently.
- [ ] Customer can save and remove offers.
- [ ] Saved offers persist after refresh and re-login.
- [ ] Demo and production offers remain clearly separated.

### F. Redemption journey

- [ ] Customer can present an eligible offer for redemption.
- [ ] Business redemption action succeeds once.
- [ ] Duplicate redemption is prevented or clearly handled.
- [ ] Redemption appears in customer history.
- [ ] Redemption appears in the correct business reporting context.
- [ ] Another customer cannot view or reuse the redemption record.

### G. Mobile usability

- [ ] No horizontal overflow on campaign, checkout return, dashboard, pass, offer, or redemption pages.
- [x] Primary purchase and donation actions are visible and usable on mobile.
- [x] Checkout errors and recovery messages are readable and actionable on mobile.
- [ ] Browser back navigation does not accidentally create duplicate checkout attempts.
- [x] External Stripe return opens the correct production page.

## Failure handling to verify

- [x] Invalid Stripe configuration shows a recoverable customer message.
- [ ] Invalid Stripe configuration logs the provider reason without exposing it to the customer.
- [x] Expired checkout sessions do not fulfill purchases.
- [x] Mismatched amount, currency, or payment state does not fulfill purchases at the database function boundary.
- [x] Webhook retries remain idempotent.
- [x] Failed attempts are distinguishable from abandoned/open attempts.
- [x] Customer-facing errors avoid exposing secrets or internal database details.

## Exit criteria

Customer controlled-pilot QA is complete when:

1. Every critical item above is either passed or linked to a documented blocking issue.
2. A first purchase, donation-only payment, offer save, and redemption have each been completed on mobile.
3. Customer data isolation has been verified with at least two accounts.
4. No unresolved production-severity errors remain in Vercel logs.
5. Any fixes are reviewed through this branch’s pull request before merge.

## Next role after completion

Business QA: onboarding, offer creation/editing, redemption controls, reporting, and free-tier enforcement.

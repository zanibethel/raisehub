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

## Customer QA matrix

### A. Authentication and routing

- [ ] Logged-out customer is prompted to create an account or log in before purchase.
- [ ] Customer login returns to the intended campaign or checkout path.
- [ ] Customer dashboard loads without role-routing errors.
- [ ] Expired or invalid authentication is handled without a broken page.
- [ ] Customer cannot access business, organization, admin, or owner workspaces.

### B. First pass purchase

- [ ] Campaign page shows the expected pass price before checkout.
- [ ] Charged Stripe amount matches the displayed amount.
- [ ] Selected organization receives the intended support attribution.
- [ ] Optional seller name is preserved when provided.
- [ ] Canceling Stripe Checkout returns to the dedicated recovery page.
- [ ] Returning from successful checkout shows a clear confirmation state.
- [ ] Pass appears on the customer dashboard without a manual support action.
- [ ] Pass start and expiration dates are correct.

### C. Active-pass donation

- [ ] Active-pass customer sees donation-only behavior instead of a second-pass purchase.
- [ ] Zero-dollar donation is blocked.
- [ ] Valid donation amount opens Stripe Checkout.
- [ ] Charged amount matches the entered donation amount.
- [ ] Donation creates a purchase record without creating a second entitlement.
- [ ] Donation confirmation clearly states that the existing pass remains active.

### D. Pass access and account isolation

- [ ] My Pass displays the correct active pass.
- [ ] Pass remains available after signing out and back in.
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
- [ ] Primary actions are visible without excessive scrolling.
- [ ] Error and recovery messages are readable and actionable.
- [ ] Browser back navigation does not accidentally create duplicate checkout attempts.
- [ ] External Stripe return opens the correct production page.

## Failure handling to verify

- [ ] Invalid Stripe configuration shows a recoverable message and logs a useful server-side reason.
- [ ] Expired checkout sessions do not fulfill purchases.
- [ ] Mismatched amount, currency, or payment state does not fulfill purchases.
- [ ] Webhook retries remain idempotent.
- [ ] Failed attempts are distinguishable from abandoned/open attempts.
- [ ] Customer-facing errors avoid exposing secrets or internal database details.

## Exit criteria

Customer controlled-pilot QA is complete when:

1. Every critical item above is either passed or linked to a documented blocking issue.
2. A first purchase, donation-only payment, offer save, and redemption have each been completed on mobile.
3. Customer data isolation has been verified with at least two accounts.
4. No unresolved production-severity errors remain in Vercel logs.
5. Any fixes are reviewed through this branch’s pull request before merge.

## Next role after completion

Business QA: onboarding, offer creation/editing, redemption controls, reporting, and free-tier enforcement.

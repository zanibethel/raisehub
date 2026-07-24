# Stripe Revenue and Payout Foundations

## Goal

Ship a production-safe Stripe foundation for RaiseHub while keeping every Stripe interaction in test mode until all money journeys pass end-to-end QA.

## Merge decision

This sprint is prepared for deployment to the production RaiseHub site so Stripe integration work can continue against the stable production hostname. Stripe remains strictly in test mode. No live keys, live connected accounts, real transfers, or real subscription charges are enabled.

## Guardrails

- Stripe test mode only.
- Server-side Stripe requests reject any secret key that is not prefixed with `sk_test_`.
- Signed webhook processing rejects all live-mode Stripe events.
- Never grant access from a success-page redirect alone.
- Webhooks are the source of truth for payment state.
- Webhook processing must remain signed and idempotent.
- Preserve immutable pricing and fee snapshots at transaction time.
- Do not expose secret keys or service-role credentials to browser code.
- Production-site QA does not authorize Stripe live mode.

## Completed and verified

### Supporter purchase foundation

- [x] Official Stripe Node SDK and server-only client.
- [x] Test-key enforcement and signed webhook verification.
- [x] Trusted server-side Checkout Session creation.
- [x] Immutable checkout-attempt and pricing snapshots.
- [x] Canonical Organization linkage for purchases.
- [x] Atomic purchase and entitlement fulfillment.
- [x] Duplicate webhook protection.
- [x] Successful manual test purchase created exactly one purchase and one entitlement.
- [x] Active pass displayed on the Supporter dashboard after webhook confirmation.

### Campaign trust and publishing controls

- [x] Campaign drafts are private by default.
- [x] Terms and Fundraising and Payout Policy acceptance is recorded at review submission.
- [x] Campaign review status and publishing gates are stored in Supabase.
- [x] Sharing is unavailable until publication.
- [x] Owner-only campaign review queue.
- [x] Approve, request changes, reject, and suspend review actions.
- [x] Append-only campaign review audit records.
- [x] Public Terms of Use and Fundraising and Payout Policy pages.
- [x] Mobile return navigation from policy pages.

### Organization Connect foundation

- [x] Express connected-account model selected.
- [x] Service-role-only connected-account, transfer, and payout-event tables.
- [x] Protected Organization payout setup entry.
- [x] Server-side Organization membership and permission checks.
- [x] Idempotent connected-account creation request.
- [x] Server-side Account Link creation with stable return and refresh routes.
- [x] Test-mode-only enforcement.
- [x] Actionable Connect activation and configuration errors.
- [x] Production-site copy clearly states that Stripe remains in test mode.

### Identity and dashboard improvements

- [x] Every authenticated account receives a personal My Pass experience.
- [x] Seller identity, campaign assignment, referral, and purchase-attribution database foundation.
- [x] Mobile workspace switcher containment and stacking.
- [x] Compact Owner Console management and analytics sections.
- [x] Campaign Reviews quick action in the Owner Console.

## External blocker

Stripe currently rejects API-created connected accounts with: `You can only create new accounts if you've signed up for Connect.` The RaiseHub request reaches Stripe correctly. Platform setup is visible in Stripe, but API account creation still requires Stripe activation, propagation, or support review.

## Deferred to the next sprint

### Connect completion and payouts

- [ ] Complete one Express connected-account onboarding flow in Stripe test mode.
- [ ] Add and verify `account.updated` webhook synchronization.
- [ ] Confirm whether `card_payments` is required for the selected separate-charges-and-transfers architecture.
- [ ] Add Organization earnings ledger entries per completed purchase.
- [ ] Calculate gross, RaiseHub fee, Organization share, refunds, disputes, and net payable.
- [ ] Add campaign-close payout calculation and release review.
- [ ] Create Stripe transfers idempotently.
- [ ] Track transfer state separately from bank payout state.
- [ ] Prevent overpayment and duplicate payout release.

### Refunds, disputes, and expiration

- [ ] Handle Checkout expiration and cancellation state.
- [ ] Handle full and partial refunds.
- [ ] Handle dispute opened, won, and lost events.
- [ ] Update entitlements and reporting consistently after adjustments.

### Business subscriptions

- [ ] Finalize paid plan names, pricing, interval, and limits.
- [ ] Create subscription Checkout Sessions.
- [ ] Store Stripe customer and subscription identifiers.
- [ ] Activate paid access only from verified subscription webhooks.
- [ ] Handle renewal, cancellation, unpaid, past-due, and expiration states.
- [ ] Add Stripe Billing Portal access and safe downgrade behavior.

### Reporting and reconciliation

- [ ] Add transaction-level Owner audit views.
- [ ] Add campaign gross, fees, refunds, earnings, transfers, and payout reporting.
- [ ] Add Business subscription and billing-history visibility.
- [ ] Add Stripe-to-Supabase reconciliation checks and unresolved alerts.

## Production test plan after merge

1. Confirm the production deployment is built from the expected merge commit.
2. Confirm Google login and Owner, Organization, Business, and My Pass workspace switching.
3. Confirm the existing Supporter test checkout still fulfills by signed webhook.
4. Open Organization payout setup and capture the exact production Stripe response.
5. Confirm the UI clearly shows Stripe test mode and never suggests real funds will move.
6. Inspect Vercel runtime logs and Stripe test logs for the onboarding request.
7. Continue Connect implementation in a new sprint without enabling Stripe live mode.

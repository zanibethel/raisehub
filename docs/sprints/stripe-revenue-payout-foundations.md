# Stripe Revenue and Payout Foundations

## Goal

Build the production-safe payment foundation for RaiseHub while keeping every Stripe interaction in test mode until all three money journeys pass end-to-end QA.

## Money journeys

1. Supporter campaign purchase
2. Organization campaign earnings and payout
3. Business paid upgrade subscription

## Guardrails

- Stripe test mode only during this sprint.
- Never grant access from a success-page redirect alone.
- Webhooks are the source of truth for payment and subscription state.
- Every webhook handler must be idempotent.
- Preserve immutable pricing and fee snapshots at transaction time.
- Do not expose secret keys or service-role credentials to the browser.
- Do not merge without explicit approval.
- Keep the pull request in draft until focused preview QA is complete.

## Phase 1 — Current-state audit

- [ ] Inventory existing checkout, upgrade, purchase, entitlement, campaign earnings, and payout code.
- [ ] Inspect Supabase tables, constraints, RLS policies, grants, and existing migrations related to money movement.
- [ ] Inspect Vercel environment variables without exposing secret values.
- [ ] Inspect Stripe test-mode products, prices, webhook endpoints, and Connect configuration.
- [ ] Document gaps between current code and the target transaction model.

## Phase 2 — Shared Stripe foundation

- [ ] Add the official Stripe server SDK.
- [ ] Add server-only Stripe client configuration.
- [ ] Add typed environment validation for Stripe test-mode variables.
- [ ] Add a webhook event ledger with a unique Stripe event ID.
- [ ] Add shared money helpers using integer cents only.
- [ ] Add shared transaction status vocabulary and audit metadata.

## Phase 3 — Supporter campaign purchase

- [ ] Create Checkout Sessions from trusted server-side campaign pricing.
- [ ] Store an immutable pending purchase and pricing snapshot before redirecting.
- [ ] Include safe internal identifiers in Stripe metadata.
- [ ] Verify signed Stripe webhook payloads.
- [ ] Finalize purchase and pass entitlement atomically after confirmed payment.
- [ ] Prevent duplicate webhooks from creating duplicate purchases or passes.
- [ ] Handle checkout expiration, cancellation, failed payment, refund, and dispute states.
- [ ] Ensure displayed, charged, recorded, and reported totals match.

## Phase 4 — Organization Connect and campaign payouts

- [ ] Choose and document the Stripe Connect account model.
- [ ] Add organization connected-account fields and onboarding state.
- [ ] Create Connect onboarding and account-refresh links server-side.
- [ ] Require payout readiness before campaign payout release.
- [ ] Add an organization earnings ledger per purchase.
- [ ] Calculate gross amount, RaiseHub fee, organization share, refunds, disputes, and net payable.
- [ ] Add campaign-close payout calculation and owner/admin review state.
- [ ] Create Stripe transfers idempotently.
- [ ] Track transfer status separately from bank payout status.
- [ ] Prevent overpayment and duplicate payout release.

## Phase 5 — Business upgrade subscriptions

- [ ] Confirm paid plan names, pricing, billing interval, and feature limits.
- [ ] Create Stripe subscription Checkout Sessions server-side.
- [ ] Store Stripe customer and subscription identifiers on the Business workspace.
- [ ] Activate paid access only from verified subscription webhooks.
- [ ] Handle renewal, cancellation, unpaid, past-due, and expired states.
- [ ] Add a Stripe Billing Portal link.
- [ ] Preserve a safe downgrade path when paid access ends.

## Phase 6 — Reporting and reconciliation

- [ ] Add transaction-level audit views for Owner/Admin.
- [ ] Add campaign gross, fees, refunds, organization earnings, transfers, and payout statuses.
- [ ] Add Business subscription status and billing history visibility.
- [ ] Add reconciliation checks between Stripe and Supabase records.
- [ ] Ensure reports exclude invalid, refunded, or disputed revenue as appropriate.

## Phase 7 — Focused QA

- [ ] Successful Supporter test purchase creates exactly one purchase and one entitlement.
- [ ] Duplicate webhook delivery creates no duplicates.
- [ ] Canceled and expired checkout grants no access.
- [ ] Refund and dispute states update reporting correctly.
- [ ] Organization onboarding reaches payout-ready test status.
- [ ] Campaign payout cannot exceed the net payable balance.
- [ ] Repeated payout action cannot duplicate a transfer.
- [ ] Business subscription activates only after webhook confirmation.
- [ ] Failed or canceled subscription removes paid access according to policy.
- [ ] Cross-workspace and cross-account access is denied.
- [ ] Mobile checkout return paths and dashboard states are usable.

## Exit criteria

- All three money journeys work in Stripe test mode.
- Webhook processing is signed, idempotent, and auditable.
- Purchase, entitlement, earnings, transfer, payout, and subscription states remain consistent.
- No production Stripe mode changes have been made.
- Preview QA is approved before merge.

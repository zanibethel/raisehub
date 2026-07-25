# PR #35 Payment-Loss Reconciliation QA

## Status

Draft only. Do not merge or apply the migrations to production yet.

## Confirmed against the production schema

- `campaign_purchases` contains the stored Stripe PaymentIntent and canonical organization references required for reconciliation.
- `customer_entitlements` contains `status`, `revoked_at`, `expires_at`, and `updated_at`.
- `organization_transfers` contains completed-transfer state and integer cent amounts.
- `organization_earnings_ledger` supports signed cent entries, availability dates, Stripe event IDs, and idempotency keys.

## Required correction before migration QA

Refund losses must be allocated only to the organization's original earnings share. RaiseHub must not debit an organization for the platform-fee portion of a refund.

Example:

- customer payment: $20.00
- organization earnings: $16.00
- platform fee: $4.00
- full customer refund: $20.00
- organization ledger loss: $16.00, not $20.00

Partial and repeated cumulative refund events must calculate only the new incremental organization loss. The pure allocation rule and unit tests are now checked in at:

- `src/lib/rules/payment-loss-allocation.ts`
- `src/lib/rules/payment-loss-allocation.test.ts`

The SQL reconciliation function must use equivalent logic before the migration is considered safe.

## Remaining QA

1. Update the SQL reconciliation function to track cumulative organization-allocated refund loss.
2. Validate both migrations on a non-production Supabase branch.
3. Run `npm test`, `npm run lint`, and `npm run build`.
4. Verify a partial refund reduces campaign progress only by the refunded organization share.
5. Verify a full refund revokes the pass and removes all organization earnings from progress.
6. Verify dispute open, won, and lost paths.
7. Replay every Stripe event and confirm ledger, purchase, and entitlement idempotency.
8. Confirm 7-day/14-day holds and 5%/60-day reserve release calculations.
9. Confirm the $50-or-1% post-payout tolerance absorbs only the permitted portion.
10. Confirm amounts above the tolerance remain as organization liability without rewriting historical entries.

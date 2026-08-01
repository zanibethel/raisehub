# Demo and Production Isolation Audit

Status: P0 launch blocker

Baseline: `main` at `ae9c39e566a8fd27dbcc195abb99ebb18a0748ee` (PRs #84 and #85 preserved)

## Confirmed root cause

Production-facing reads are not consistently environment scoped. The clearest confirmed path is `src/app/offers/page.tsx`, which loads every active offer and every matching business profile without filtering `is_demo` or `demo_group`. `src/app/offers/[id]/page.tsx` also retrieves a known offer ID without validating environment ownership and records an offer view before validating the offer.

The database permits ambiguous and cross-environment relationships because environment ownership is represented by duplicated nullable columns instead of enforced parent consistency. A live offer currently points to the Lakeview demo business profile, proving that filtering only the offer row is not sufficient.

## Existing data findings

Production database inspection on July 31, 2026 found:

- 21 of 29 offers are marked demo.
- 23 of 51 profiles are marked demo.
- 135 of 143 campaign purchases are marked demo.
- One demo pricing rule has no demo group.
- Eight offers disagree with their business profile environment/group.
- Five saved offers disagree with their offer environment/group.
- Three redemptions disagree with their offer environment/group.
- Ten campaign purchases disagree with their campaign environment/group.
- One customer entitlement disagrees with its purchase environment/group.
- The Lakeview business profile `Maple Street Coffee Co.` owns both correctly marked demo offers and at least one incorrectly live-marked offer.

No rows were deleted or automatically rewritten during this audit.

## Environment-capable tables

Tables with explicit `is_demo` and `demo_group` ownership include:

- profiles
- offers
- saved_offers
- redemptions
- offer_views
- offer_clicks
- campaigns
- campaign_purchases
- businesses
- business_memberships
- organizations
- organization_memberships
- campaign_memberships
- customer_entitlements
- gift_passes
- pricing_rules
- checkout_attempts

`support_requests` uses an `environment` enum instead of `is_demo`/`demo_group` and currently has no demo-group ownership.

## Tables inheriting or lacking sufficient ownership

Important descendants currently lack consistent explicit environment ownership or group constraints, including:

- seller_profiles
- campaign_sellers
- campaign_seller_invitations
- campaign_seller_invitation_acceptances
- organization_stripe_accounts
- organization_transfers
- organization_payout_events
- organization_earnings_ledger
- campaign_review_events
- business_billing_accounts
- business_billing_events
- notifications
- owner_preview_profiles
- owner_action_logs

These tables must either inherit environment through one authoritative parent with validated joins or gain explicit immutable ownership.

## Required rules

1. Production records are exactly `is_demo = false AND demo_group IS NULL`.
2. Demo records are exactly `is_demo = true AND demo_group` references an active demo group key.
3. Demo reads require an explicit selected group; `is_demo = true` alone is prohibited.
4. Child environment and group must equal the authoritative parent.
5. Direct-record routes validate ownership after retrieval and fail closed.
6. Owner production management does not bypass environment isolation.
7. Demo Center access is an explicit separate context.
8. Preview role changes presentation only and never changes the saved Owner role.
9. Support requests preserve both environment and, for demo requests, demo-group context.
10. No production query is complete until environment scope is explicit.

## Prohibited query patterns

- Unscoped `.from('offers')`, `.from('campaigns')`, `.from('profiles')`, or other demo-capable reads in public/live code.
- Filtering only a child row without validating its parent environment.
- Filtering demo data with only `.eq('is_demo', true)`.
- Treating Owner role as permission to mix live and demo data.
- Rendering a direct ID before environment validation.
- Writing analytics, views, clicks, saves, purchases, or redemptions before validating the target environment.

## Delivery plan

### PR 1 — foundation and audit

- Add fail-closed environment primitives.
- Add unit coverage for production, explicit demo-group access, cross-group denial, and ambiguous metadata denial.
- Record the confirmed schema/data contamination and migration requirements.

### PR 2 — P0 application containment

- Route all public offer, business, campaign, customer pass, purchase, redemption, checkout, and support access through scoped repositories.
- Reject direct demo IDs in production.
- Require the selected demo group in Demo deployment repositories.
- Add the requested Owner Support, Demo Center terminology, and Manage UI cleanup after data access is scoped.

### PR 3 — database enforcement and cleanup tooling

- Add non-destructive report views/functions first.
- Quarantine inconsistent rows.
- Verify owner-approved mappings.
- Add validated check constraints, parent-consistency triggers or immutable ownership functions, indexes, and RLS updates.
- Clean contaminated rows only through an explicit reviewed migration or Owner action.

## Cleanup order

1. Report all inconsistent rows with IDs and expected parent ownership.
2. Quarantine ambiguous rows from live/demo reads.
3. Assign or correct ownership only after reviewing source records.
4. Validate constraints without deleting records.
5. Clean legacy duplicates and orphans in a separate reversible migration.

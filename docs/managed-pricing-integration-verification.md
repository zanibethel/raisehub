# Managed Pricing Integration Verification

## Purpose

Use this checklist to verify RaiseHub's managed pricing system end to end before removing legacy campaign pricing fields or preparing a destructive database migration.

This verification covers:

- Platform pricing
- State pricing
- Town pricing
- Organization pricing
- Campaign pricing
- Production and Demo separation
- Scheduled rule activation
- Rule retirement and replacement
- Application fallback behavior
- Normal pass purchases
- Gift a Pass purchases
- Purchase pricing snapshots
- Owner Pricing history

## Pricing precedence

The expected resolver order is:

1. Campaign
2. Organization
3. Town
4. State
5. Platform
6. Hard application fallback

The hard application fallback must remain available when no active database rule can be resolved:

- Pass price: $20
- RaiseHub platform fee: 20%

A missing pricing rule must not make checkout or fundraising estimates unavailable.

## Organization location resolution

Town and State pricing context must come from the campaign or selected organization's canonical `organizations` record.

Verify all of the following:

- Single pricing resolution enriches missing Town and State from the canonical organization ID.
- Batch pricing resolution enriches missing Town and State from canonical organization IDs.
- Campaign pages do not need separate organization-location queries.
- Organization dashboards do not need separate organization-location queries.
- Normal checkout does not need a separate organization-location query.
- Gift checkout does not need a separate organization-location query.
- Signup campaign pricing uses the centralized campaign pricing service.
- Consumer location never changes the winning price.
- Consumer location may only affect discovery, sorting, filtering, or proximity notifications.
- Missing or incomplete organization location safely falls through to Organization, Platform, or hard fallback pricing as applicable.
- Campaign and Organization rules still outrank Town and State rules.
- Production and Demo separation remains intact while location enrichment runs.

## Safety rules

Before testing:

- Use Demo records whenever the scenario does not require Production verification.
- Do not delete Production pricing rules merely to test fallback behavior.
- Do not edit historical purchase snapshot values.
- Do not remove the legacy `campaigns.pass_price` column during this verification phase.
- Do not restore organizer-controlled pricing.
- Record the campaign, organization, town, state, environment, rule ID, and timestamps used for each scenario.

## Pre-verification checks

Confirm all of the following before running scenarios:

- The latest `main` deployment is READY in Vercel.
- GitHub TypeScript and Build checks are green when those checks are available.
- The Owner Pricing page loads successfully.
- The Owner Pricing page displays sections in this order:
  - Platform
  - State
  - Town
  - Organization
  - Campaign
- Production and Demo can be selected and managed separately.
- An active Platform rule exists for the environment being tested unless the scenario specifically tests fallback behavior.
- The test campaign is currently sellable.
- The campaign is connected to the expected organization.
- The organization has the expected town and state context.

## Verification record template

Copy this block for each scenario:

- Scenario:
- Environment: Production / Demo
- Campaign:
- Organization:
- Town:
- State:
- Expected winning scope:
- Expected pass price:
- Expected platform fee percent:
- Expected RaiseHub amount:
- Expected organization pass earnings:
- Optional donation:
- Expected total charged:
- Actual result:
- Purchase ID:
- Pricing rule ID snapshot:
- Pricing scope snapshot:
- Pass price snapshot:
- Platform fee percent snapshot:
- Organization pass earnings snapshot:
- Resolved-at snapshot:
- Result: Pass / Fail
- Notes:

## Scenario 1 — Platform pricing

Setup:

- Ensure the campaign has no active Campaign rule.
- Ensure its organization has no active Organization rule.
- Ensure its town has no active Town rule.
- Ensure its state has no active State rule.
- Keep an active Platform rule for the selected environment.

Verify:

- Campaign pages display the Platform pass price.
- Fundraising estimates use the Platform pass price and organization earnings.
- Checkout uses the Platform rule.
- The purchase snapshot records `platform` as the pricing scope.
- The purchase snapshot records the winning Platform rule ID.
- A donation is added to the pass price without changing the fee calculation on the pass.

## Scenario 2 — State overrides Platform

Setup:

- Keep the Platform rule active.
- Create or activate a State rule for the campaign's state.
- Ensure no matching Town, Organization, or Campaign rule is active.

Verify:

- State pricing wins over Platform pricing.
- The campaign page and fundraising estimates show the State price.
- Checkout uses the State rule.
- The purchase snapshot records `state`.
- State pricing history shows the created or activated rule.

## Scenario 3 — Town overrides State

Setup:

- Keep matching Platform and State rules active.
- Create or activate a Town rule using the campaign's town and state.
- Ensure no matching Organization or Campaign rule is active.

Verify:

- Town pricing wins over State and Platform pricing.
- Town matching is not broken by letter casing or surrounding spaces in the supplied context.
- Checkout uses the Town rule.
- The purchase snapshot records `town`.
- Town pricing history shows the rule lifecycle.

## Scenario 4 — Organization overrides Town

Setup:

- Keep matching Platform, State, and Town rules active.
- Create or activate an Organization rule for the campaign's canonical organization.
- Ensure no Campaign rule is active.

Verify:

- Organization pricing wins over Town, State, and Platform pricing.
- Checkout uses the Organization rule.
- The purchase snapshot records `organization`.
- Organization pricing history shows the rule lifecycle.

## Scenario 5 — Campaign overrides Organization

Setup:

- Keep matching Platform, State, Town, and Organization rules active.
- Create or activate a Campaign rule for the selected campaign.

Verify:

- Campaign pricing wins over every broader scope.
- Checkout uses the Campaign rule.
- The purchase snapshot records `campaign`.
- Campaign pricing history shows the rule lifecycle.

## Scenario 6 — Production and Demo separation

Setup:

- Create different Production and Demo prices for the same scope where possible.
- Use a Production campaign and a Demo campaign with otherwise comparable context.

Verify:

- Production campaigns never resolve Demo rules.
- Demo campaigns never resolve Production rules.
- Owner Pricing editors show the correct environment values.
- Owner Pricing history labels each record with the correct environment.
- Purchases preserve the correct `is_demo` value and pricing snapshots.

## Scenario 7 — Scheduled pricing

Setup:

- Keep a current active rule.
- Schedule a replacement rule for a future timestamp.

Before the scheduled time, verify:

- The current rule remains active.
- Campaign displays and estimates use the current rule.
- Checkout uses the current rule.
- History shows the future rule as scheduled.

At or after the scheduled time, verify:

- The scheduled rule becomes the effective rule.
- The prior rule no longer wins.
- There is no unintended pricing gap.
- New purchases snapshot the replacement rule.
- Older purchases retain their original snapshots.

## Scenario 8 — Rule replacement and retirement

Setup:

- Replace an active rule at one scope.
- Retire a rule only when a broader rule or fallback can safely cover the campaign.

Verify:

- Replacement preserves continuous pricing coverage.
- Retirement does not make campaign pages or checkout unavailable.
- The next matching scope wins after retirement.
- History shows active, scheduled, expired, or retired states correctly.
- Existing purchases remain unchanged.

## Scenario 9 — Hard application fallback

Use a safe test method that does not require deleting Production rules. A controlled development or Demo setup is preferred.

Verify:

- With no resolvable active database rule, the resolver returns:
  - $20 pass price
  - 20% RaiseHub platform fee
  - $4 RaiseHub amount
  - $16 organization pass earnings
- Campaign pages remain available.
- Fundraising estimates remain available.
- Normal checkout remains available.
- The purchase snapshot records:
  - `fallback` pricing scope
  - no pricing rule ID
  - $20 pass price
  - 20% fee
  - $16 organization pass earnings
- The interface identifies fallback pricing where that indicator is supported.

## Scenario 10 — Normal pass purchase

Verify a normal pass purchase with no existing active entitlement:

- Server-side pricing determines the amount charged.
- The browser does not supply or control `pass_price`.
- The purchase and entitlement are created together.
- The entitlement is present when the action reports success.
- The amount paid equals pass price plus optional donation.
- Platform fee is calculated from the pass price.
- The organization receives pass earnings plus the full donation.
- All pricing snapshot columns are populated.
- Campaign progress updates using recorded purchase values.

## Scenario 11 — Donation-only support

Use a customer who already has active pass access.

Verify:

- A positive donation is required.
- No new entitlement is created.
- Platform fee is zero for the donation-only record.
- Organization earnings equal the donation.
- Pass-pricing snapshot fields remain null when no pass is purchased.
- Campaign progress includes the donation.

## Scenario 12 — Gift a Pass purchase

Verify:

- Gift checkout resolves managed pricing server-side.
- The gift purchase does not trust a browser-supplied pass price.
- Production and Demo pricing remain separated.
- The gift purchase stores its pricing snapshots.
- The recipient flow remains functional.
- Existing gift purchases retain their original pricing snapshots after rules change.

## Scenario 13 — Historical purchase stability

Setup:

- Complete a purchase under one rule.
- Change the winning rule.
- Complete a second purchase.

Verify:

- The first purchase retains its original:
  - pricing rule ID
  - pricing scope
  - pass price
  - platform fee percent
  - organization pass earnings
  - resolved-at timestamp
- The second purchase stores the new values.
- Reports do not recalculate old purchases using current pricing.

## Scenario 14 — Owner Pricing history

For Platform, State, Town, Organization, and Campaign history, verify:

- Scope is labeled correctly.
- Environment is labeled correctly.
- Status is correct.
- Start and end timestamps are correct.
- Pass price is correct.
- Platform fee percent is correct.
- RaiseHub amount is correct.
- Organization pass earnings are correct.
- Reason is displayed when present.
- Internal note is displayed only in the Owner experience.
- The newest relevant records appear as expected.

## Scenario 15 — Failure behavior

Verify safe behavior for these failures:

- Pricing query returns an error.
- Pricing table is temporarily unavailable.
- No active rule matches.
- Campaign becomes unavailable during purchase.
- Purchase RPC fails.
- Expected entitlement is missing after a pass purchase.
- An unexpected entitlement appears for a donation-only purchase.

Expected behavior:

- Pricing lookup failures use the hard fallback when resolution cannot safely complete.
- Campaign recovery handles campaigns that are no longer sellable.
- A failed purchase does not report success.
- A pass purchase does not report success without its entitlement.
- A donation-only purchase does not create an entitlement.
- User-facing errors remain understandable and do not expose internal details.

## Legacy-read audit

After all integration scenarios pass, search live `main` for:

- `campaign.pass_price`
- `campaigns.pass_price`
- `.select(...pass_price...)` against the `campaigns` table
- campaign create or update inputs containing `pass_price`
- browser action payloads containing `pass_price`
- organizer forms that allow pass-price editing
- reports that calculate historical values from current campaign pricing
- generated types that still expose the legacy column

Classify every remaining result as one of:

- Active legacy read that must be removed
- Temporary database type that remains until migration
- Pricing-rule field that must remain
- Purchase snapshot field that must remain
- Test fixture or documentation reference

Do not remove pricing-rule `pass_price` fields or purchase snapshot fields. The cleanup target is direct reliance on the legacy campaign-level price.

## Migration readiness gate

Do not prepare or apply a migration that removes the legacy campaign price until all are true:

- All scenarios above pass.
- No browser payload supplies pass pricing.
- No organizer form controls pass pricing.
- No active runtime query reads `campaigns.pass_price`.
- Normal purchases use resolved server-side pricing.
- Gift purchases use resolved server-side pricing.
- Campaign pages and listings use resolved pricing.
- Dashboards and reports use resolved pricing or preserved purchase snapshots.
- Production and Demo behavior is verified.
- Fallback behavior is verified.
- Historical purchases remain stable.
- Generated database types can be updated in the same migration sequence.
- A rollback plan is documented.

## Completion result

When this checklist passes, the managed pricing hierarchy can be treated as integration-verified. The next dependency-first work should be the legacy-read audit and removal, followed by migration preparation. The legacy database column should be removed only after those application reads are gone and the migration readiness gate is satisfied.
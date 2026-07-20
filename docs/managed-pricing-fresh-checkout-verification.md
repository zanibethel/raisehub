# Managed Pricing Fresh Checkout Verification

## Purpose

Use this runbook to verify that newly created purchases still behave correctly in the deployed RaiseHub experience before removing the legacy `campaigns.pass_price` column.

This is a verification procedure, not a migration.

## Safety rules

- Do not remove or alter the legacy pricing column during this procedure.
- Use clearly identified test accounts and campaigns.
- Keep Production and Demo records separate.
- Record the purchase IDs created during testing.
- Stop immediately if pricing, entitlement, Demo separation, or customer access differs from the expected result.
- Do not mark the legacy-column migration ready until every required check passes.

## Required test scenarios

Complete all three scenarios:

1. Fresh Production paid-pass purchase.
2. Fresh Demo paid-pass purchase.
3. Donation-only support from a customer who already has an active pass.

## Before testing

Confirm:

- The latest `main` deployment is READY.
- The deployed build includes the shared pricing resolution core.
- The deployed build includes the shared purchase snapshot helper.
- The read-only persisted integrity query currently returns zero violations.
- A valid Production campaign and Production organization are available.
- A valid Demo campaign and Demo organization are available.
- The Production and Demo campaigns have active managed-pricing rules or intentionally use the verified fallback.
- A clean customer account is available for each paid-pass scenario.
- A customer with an active pass is available for the donation-only scenario.

Record the following before starting:

| Item | Value |
|---|---|
| Deployment SHA | |
| Production campaign ID | |
| Production organization ID | |
| Production customer ID | |
| Demo campaign ID | |
| Demo organization ID | |
| Demo group | |
| Demo customer ID | |
| Donation-only customer ID | |
| Test started at | |

## Scenario 1: Production paid-pass purchase

### Customer experience

1. Open the deployed Production campaign page.
2. Confirm the displayed pass price matches managed pricing.
3. Confirm any donation changes the total correctly.
4. Complete the purchase with the Production customer account.
5. Confirm the purchase returns a success state.
6. Confirm the customer can access the pass and saved offers.
7. Confirm no Demo label, Demo group, or Demo-only experience appears.

### Database evidence

Record:

| Field | Expected | Actual |
|---|---:|---:|
| `is_demo` | `false` | |
| `demo_group` | `null` | |
| `pricing_scope` | resolved scope or `fallback` | |
| `pass_price_charged` | displayed pass price | |
| `donation_amount` | submitted donation | |
| `amount_paid` | pass price + donation | |
| `platform_fee_percent` | resolved percentage | |
| `platform_fee` | pass price × percentage | |
| `organization_pass_earnings` | pass price - platform fee | |
| `organization_earnings` | pass earnings + donation | |
| `pricing_resolved_at` | non-null | |

Confirm:

- One `campaign_purchases` record was created.
- One `customer_entitlements` record was created.
- The entitlement type is `purchased_pass`.
- The entitlement is active.
- The entitlement expires six months after its start time.
- Purchase and entitlement `is_demo` values match.
- Purchase and entitlement `demo_group` values match.
- The entitlement points to the new purchase ID.

Record:

| Item | Value |
|---|---|
| Purchase ID | |
| Entitlement ID | |
| Pricing rule ID | |
| Pricing scope | |
| Pass price | |
| Donation | |
| Amount paid | |
| Verified at | |

## Scenario 2: Demo paid-pass purchase

### Customer experience

1. Open the deployed Demo campaign experience.
2. Confirm the displayed pass price uses Demo pricing only.
3. Complete the purchase with the Demo customer account.
4. Confirm the purchase returns a success state.
5. Confirm the customer receives Demo pass access.
6. Confirm the experience remains inside the correct Demo group.
7. Confirm no Production purchase or entitlement is created.

### Database evidence

Record:

| Field | Expected | Actual |
|---|---:|---:|
| `is_demo` | `true` | |
| `demo_group` | expected Demo group | |
| `pricing_scope` | resolved Demo scope or `fallback` | |
| `pass_price_charged` | displayed Demo pass price | |
| `amount_paid` | pass price + donation | |
| `pricing_resolved_at` | non-null | |

Confirm:

- One Demo `campaign_purchases` record was created.
- One Demo `customer_entitlements` record was created.
- Purchase and entitlement use the same Demo group.
- No Production record references the Demo purchase.
- No Production entitlement references the Demo customer test.

Record:

| Item | Value |
|---|---|
| Purchase ID | |
| Entitlement ID | |
| Demo group | |
| Pricing rule ID | |
| Pricing scope | |
| Pass price | |
| Amount paid | |
| Verified at | |

## Scenario 3: Donation-only support

Use a customer who already has an active pass.

### Customer experience

1. Open a valid campaign.
2. Confirm the experience asks for a donation rather than another pass purchase.
3. Submit a positive donation.
4. Confirm the support action succeeds.
5. Confirm no second pass entitlement is granted.
6. Confirm the existing active pass remains unchanged.

### Database evidence

Record:

| Field | Expected | Actual |
|---|---:|---:|
| `amount_paid` | donation amount | |
| `donation_amount` | donation amount | |
| `platform_fee` | `0` | |
| `organization_earnings` | donation amount | |
| `pricing_rule_id` | `null` | |
| `pricing_scope` | `null` | |
| `pass_price_charged` | `null` | |
| `platform_fee_percent` | `null` | |
| `organization_pass_earnings` | `null` | |
| `pricing_resolved_at` | `null` | |

Confirm:

- One donation-only `campaign_purchases` record was created.
- No new `customer_entitlements` record was created for that purchase.
- The customer's existing pass remains active.
- Production/Demo fields match the selected campaign context.

Record:

| Item | Value |
|---|---|
| Purchase ID | |
| Existing entitlement ID | |
| Donation amount | |
| Verified at | |

## Post-test integrity check

After all three scenarios:

1. Run:

```text
supabase/verification/managed-pricing-purchase-integrity.sql
```

2. Confirm the query returns:

```text
0 violations
```

3. Confirm the three new purchase records are visible in the expected environments.
4. Confirm the two paid-pass purchases each have exactly one entitlement.
5. Confirm the donation-only purchase has no entitlement.
6. Confirm Production and Demo records did not cross environments.
7. Confirm the deployed customer pages still load without errors.

## Go / no-go decision

The destructive legacy pricing migration remains a **no-go** if any of the following occurs:

- Displayed price differs from the persisted pass price.
- Amount paid does not equal pass price plus donation.
- Platform fee math differs from the persisted snapshot.
- A paid pass does not create exactly one entitlement.
- Donation-only support creates an entitlement.
- Production and Demo flags or Demo groups do not match.
- The integrity query returns any violation.
- The deployed experience errors or shows inconsistent pass access.
- Any required evidence field is missing.

The migration may move to final preparation only when all three scenarios pass and the post-test integrity query returns zero violations.

## Verification sign-off

| Item | Result |
|---|---|
| Production paid-pass purchase | |
| Demo paid-pass purchase | |
| Donation-only support | |
| Post-test integrity query | |
| Deployed customer access | |
| Production/Demo separation | |
| Final decision | |
| Verified by | |
| Verification date | |
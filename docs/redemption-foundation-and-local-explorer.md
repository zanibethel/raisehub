# RaiseHub Redemption Foundation & Local Explorer

## Product Decision

RaiseHub will prioritize a reliable supporter/business redemption workflow before building customer exploration rewards.

The post-launch **Local Explorer** rewards concept depends on trustworthy redemption data. Redemption is therefore launch-foundation work; Local Explorer is an after-launch upgrade.

The launch redemption model is **exception-based review**, not mandatory staff approval.

---

# Priority 1 — Redemption Foundation

## Goal

Create a redemption flow that is simple for supporters, nearly frictionless for businesses, resistant to accidental or abusive use, and strong enough to become the source of truth for business reporting, POS integrations, and future rewards.

## Supporter Experience

A supporter with an active RaiseHub Pass should be able to:

1. Open **My Pass**.
2. Browse unlocked participating local offers.
3. Open an offer and clearly see:
   - business name
   - member benefit
   - offer description
   - redemption frequency/rules
   - expiration date
   - participating location details
4. Tap **Redeem Offer** only when using the offer at the participating business.
5. Receive an immediate **Offer Redeemed** screen to show staff.
6. Have the redemption recorded immediately as `pending` while RaiseHub gives the business a 24-hour exception-review window.
7. Have the redemption become `confirmed` automatically after the review window unless the business reports it as unauthorized.
8. See the offer's next state immediately:
   - unavailable for a one-time offer
   - in cooldown for a daily/weekly offer
   - available according to the unlimited/reusable rule
9. View personal redemption history and confirmed savings.

The supporter should never have to explain RaiseHub mechanics to the employee completing the redemption.

---

## Business Experience

A participating business should **not** have to approve every RaiseHub transaction at the register.

### Launch workflow

1. Supporter taps **Redeem Offer** while using the offer at the business.
2. RaiseHub validates server-side:
   - active supporter pass
   - active offer
   - active business
   - correct live/demo environment
   - offer usage rule
   - prior pending/confirmed redemption history
   - reuse-window eligibility
   - rate limits
3. RaiseHub creates one authoritative redemption record immediately with `status = pending`.
4. The supporter gets a successful redemption screen immediately.
5. The business sees the pending activity in its RaiseHub report but does not need to take action.
6. The business has 24 hours to select **Report unauthorized** if the redemption did not legitimately occur.
7. If no exception is reported, RaiseHub moves the redemption to `confirmed` after the review window.
8. Rejected redemptions remain in the audit history but do not count toward confirmed analytics, customer savings, Local Explorer, or future rewards.

### Optional instant verification

A supporter may also receive a short-lived verification code. Business staff can enter that code to confirm the same pending redemption immediately.

This is an optional acceleration path, not a required checkout step.

---

# POS / QR Integration Direction

QR codes, POS discount codes, Square, and future POS integrations must feed the **same redemption lifecycle** rather than creating provider-specific redemption systems.

Preferred future flow:

1. Business connects a supported POS provider to RaiseHub.
2. A RaiseHub offer is mapped to the appropriate POS discount/catalog rule where supported.
3. Customer presents a RaiseHub QR or discount code.
4. Staff scans/enters it through the normal POS workflow.
5. POS verification confirms the existing RaiseHub redemption immediately.
6. RaiseHub records the appropriate verification method, such as:
   - `qr_code`
   - `staff_code`
   - `square`
   - future POS provider identifiers
7. Business staff otherwise continues operating the POS normally.

Businesses without a supported POS integration remain fully usable through 24-hour auto validation.

The manual/instant verification tool remains a fallback for connectivity, camera, or POS limitations.

---

## Redemption Lifecycle

Supported core statuses:

- `pending` — recorded and usable, inside the business review window
- `confirmed` — finalized after auto validation or an instant verification method
- `rejected` — business reported the redemption as unauthorized during the review window
- `voided` — exceptional administrative correction after confirmation

A pending redemption blocks duplicate/reuse attempts in the same way a confirmed redemption does. A rejected or voided redemption does not continue blocking the customer's usage eligibility.

Confirmed-only calculations should be used for business performance, customer savings, Local Explorer, and reward eligibility.

---

## Redemption Record Requirements

Every redemption should preserve enough historical information to support reporting even if the offer later changes.

Recommended/current fields and snapshots include:

- redemption ID
- offer ID
- business ID
- supporter/user ID
- redemption timestamp
- status
- auto-confirm timestamp
- confirmed timestamp
- rejected timestamp / rejecting business user / reason
- usage rule at time of redemption
- offer title snapshot
- member-benefit snapshot
- customer-value snapshot
- verification method
- confirming business user when applicable
- environment (`is_demo` / `demo_group`)
- future pass entitlement / campaign / organization context where useful
- future location / business-location ID when multi-location support requires it
- future reversal/void audit metadata

Historical redemption records should not be recalculated from the business's current offer configuration.

---

## Duplicate & Abuse Protection

The redemption service must enforce eligibility server-side.

At minimum:

- one-time offers cannot have a second pending/confirmed redemption for the same eligible supporter
- daily offers respect the 24-hour reuse window
- weekly offers respect the 7-day reuse window
- unlimited offers create separate redemption events
- repeated taps cannot bypass server-side rules
- expired or paused offers cannot redeem
- inactive/expired passes cannot redeem
- paused/archived businesses cannot accept new redemptions
- rejected and voided redemptions remain auditable
- rejected/voided records do not count as valid reward or savings events
- demo redemptions never affect production reporting
- the client is never the authority for redemption eligibility

---

# Business Redemption Reporting

The Business workspace should answer:

> How many RaiseHub customers actually came through my business, which offers brought them in, and is there anything I need to review?

## Launch report

Show at minimum:

- confirmed redemptions
- pending redemptions in the 24-hour review window
- rejected redemptions retained for audit
- unique confirmed supporters
- confirmed customer value delivered
- redemptions by offer
- most redeemed offers
- recent redemption activity
- verification method
- auto-confirm deadline for pending records
- **Report unauthorized** action for pending records

Normal redemptions require no business action.

## Useful filters — next reporting hardening

- date range
- offer
- redemption status
- location when multi-location support is available

## Privacy

Reports should expose only the supporter information the business genuinely needs. Avoid expanding customer personal information simply because it is technically available.

---

# Supporter Redemption History & Savings

My Pass / customer dashboard should show redemption history including:

- business
- offer
- date redeemed
- redemption state where useful
- customer value
- current availability when reusable

A pending redemption should immediately affect offer availability, but only confirmed redemptions should count toward verified savings and rewards.

### Known hardening item

Reusable offers can create multiple redemption events. Customer history and savings must ultimately operate on **redemption events**, not only unique offer IDs, so daily/weekly/unlimited uses are represented and totaled correctly.

This event-level history upgrade should be completed before Local Explorer uses redemption history for milestone calculations.

---

# After Launch — Local Explorer Rewards

## Objective

Reward supporters for exploring multiple participating local businesses rather than repeatedly using only one deal.

Local Explorer should launch only after redemption tracking is proven reliable.

## Recommended mechanic

Progress is based primarily on **unique participating businesses with confirmed redemptions**, not dollars spent.

Example milestones:

- 3 unique businesses — Bronze Explorer
- 5 unique businesses — unlock a Bonus Deal
- 10 unique businesses — Silver Explorer + monthly reward entry
- 20 unique businesses — Gold Explorer + special local reward

Example progress guidance:

> Local Explorer — 4 of 5 businesses visited
>
> Try one more participating local business to unlock your next reward.

## Reward Funding

Prefer business-funded perks and promotional rewards over RaiseHub-funded cash.

Examples:

- free appetizer
- free drink
- free upgrade
- $10 bonus value
- BOGO item
- special members-only bonus offer

## Reward Rules

- Count `confirmed` redemption events only.
- Favor unique businesses over total redemption count.
- Do not count pending, rejected, voided, fraudulent, demo, or invalid production redemptions.
- Keep milestone calculation server-side.
- Preserve milestone and reward-claim history.
- Reuse the same redemption foundation for reward claims wherever possible.

---

# Sequence

## Before / At Launch

1. Finish supporter redemption UX.
2. Finish 24-hour business exception-review workflow.
3. Keep redemption creation authoritative and server validated.
4. Enforce one-time/daily/weekly/unlimited rules server-side.
5. Keep confirmed analytics separate from pending/rejected activity.
6. Complete business redemption reporting and export QA.
7. Verify redemption and reporting end-to-end on mobile and desktop.
8. Verify demo/production isolation.
9. Harden event-level supporter history for reusable offers.

## After Launch

1. Observe real redemption behavior and business feedback.
2. Add QR/POS instant confirmation integrations using the same redemption record.
3. Prioritize Square, then other POS providers based on participating-business demand.
4. Add Local Explorer progress based on unique-business confirmed redemptions.
5. Add milestone badges, business-funded Bonus Deals/rewards, and reward reporting.

---

# Product Principle

**Businesses should manage exceptions, not transactions.**

The redemption system must remain a trusted platform event rather than merely a UI interaction. Once RaiseHub can reliably answer **who redeemed what, where, when, and with what validation status**, customer rewards, business analytics, POS automation, offer optimization, seller rewards, and future loyalty features can all build on the same foundation.

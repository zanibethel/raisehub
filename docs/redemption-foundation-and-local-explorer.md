# RaiseHub Redemption Foundation & Local Explorer

## Product Decision

RaiseHub will prioritize a reliable supporter/business redemption workflow before building customer exploration rewards.

The post-launch **Local Explorer** rewards concept depends on trustworthy redemption data. Redemption is therefore launch-foundation work; Local Explorer is an after-launch upgrade.

---

# Priority 1 — Redemption Foundation

## Goal

Create a redemption flow that is simple for supporters, fast for businesses, resistant to accidental duplicate use, and strong enough to become the source of truth for business reporting and future rewards.

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
4. Tap **Redeem Offer**.
5. Present a clear redemption screen to the business.
6. Receive immediate confirmation after successful redemption.
7. See the offer's next state:
   - Redeemed / no longer available for one-time offers
   - Available again at the correct time for daily or weekly offers
   - Still available for unlimited/reusable offers
8. View personal redemption history.

The supporter should never have to explain RaiseHub mechanics to the employee completing the redemption.

---

## Business Experience

A participating business should have a fast verification workflow that works well at a checkout counter.

### Recommended launch workflow

Use a business-confirmed redemption rather than relying only on the supporter tapping a button.

Preferred flow:

1. Supporter opens the offer and taps **Redeem Offer**.
2. RaiseHub displays a short-lived redemption confirmation screen / QR code.
3. Business verifies the redemption from its RaiseHub business workspace by scanning the QR code or entering/confirming the displayed redemption token.
4. RaiseHub validates:
   - active supporter pass
   - active offer
   - correct data environment
   - offer usage rule
   - prior redemption history
   - reuse-window eligibility
5. Business confirms **Redeem**.
6. RaiseHub writes one authoritative redemption record.
7. Both supporter and business receive immediate success feedback.

A manual business confirmation fallback should remain available when camera/QR scanning is inconvenient.

---

## Redemption Record Requirements

Every confirmed redemption should preserve enough historical information to support reporting even if the offer later changes.

Recommended fields / snapshots include:

- redemption ID
- offer ID
- business ID
- supporter/user ID
- pass entitlement ID
- campaign / originating fundraising context when available
- organization context when available
- redemption timestamp
- redemption status
- usage rule at time of redemption
- offer title snapshot
- member-benefit snapshot
- customer-value snapshot
- location / business-location ID when supported
- verification method (QR, manual code, business confirmation, future POS integration)
- confirming business user when applicable
- environment (`is_demo` / `demo_group` where applicable)
- reversal/void information and audit timestamps

Historical redemption records should not be recalculated from the business's current offer configuration.

---

## Duplicate & Abuse Protection

The redemption service should enforce eligibility server-side and be idempotent.

At minimum:

- one-time offers cannot redeem twice for the same eligible supporter
- daily offers respect the 24-hour reuse window
- weekly offers respect the 7-day reuse window
- unlimited offers still create separate redemption events
- repeated taps/scans cannot create duplicate records
- expired or paused offers cannot redeem
- inactive/expired passes cannot redeem
- reversed/voided redemptions remain in history rather than being silently deleted
- demo redemptions never affect production reporting

The client should never be the authority for redemption eligibility.

---

# Business Redemption Reporting

The Business workspace should include a useful **Redemptions** report.

## Launch report

Show at minimum:

- total redemptions
- unique supporters who redeemed
- redemptions by offer
- redemptions over time
- most redeemed offers
- customer value delivered
- recent redemption activity
- active vs paused/expired offer context

## Useful filters

- date range
- offer
- location (when multi-location support is available)
- redemption status

## Suggested rows

Each redemption row can show:

- date/time
- offer
- supporter represented safely (avoid unnecessary personal data)
- customer value
- verification method
- status

Businesses should be able to answer:

> How many RaiseHub customers actually came through my business, and which offers brought them in?

This report is part of the core value proposition to participating businesses, not an optional analytics extra.

---

# Supporter Redemption History

My Pass / customer dashboard should show a simple redemption history including:

- business
- offer
- date redeemed
- customer value
- current offer availability when reusable

This creates trust, gives supporters a visible record of savings, and provides the foundation for future Local Explorer progress.

A future summary can display **Total value redeemed** across the lifetime of the pass.

---

# After Launch — Local Explorer Rewards

## Objective

Reward supporters for exploring multiple participating local businesses rather than repeatedly using only one deal.

Local Explorer should launch only after redemption tracking is proven reliable.

## Recommended mechanic

Progress is based primarily on **unique participating businesses with verified redemptions**, not dollars spent.

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

This turns Local Explorer into another acquisition channel for businesses instead of a direct cash liability for RaiseHub.

## Rules

- Count verified redemptions only.
- Favor unique businesses over total redemption count.
- Do not count voided, fraudulent, demo, or invalid redemptions.
- Keep milestone calculation server-side.
- Preserve milestone history and reward-claim history.
- Reuse the same redemption foundation for reward claims wherever possible.

---

# Sequence

## Before / At Launch

1. Finish supporter redemption UX.
2. Finish business confirmation workflow.
3. Make redemption creation authoritative and idempotent.
4. Enforce one-time/daily/weekly/unlimited rules server-side.
5. Add supporter redemption history.
6. Add business redemption reporting.
7. Verify redemption and reporting end-to-end on mobile and desktop.
8. Verify demo/production isolation.

## After Launch

1. Observe real redemption behavior and business feedback.
2. Add Local Explorer progress based on unique-business redemptions.
3. Add milestone badges and progress guidance.
4. Add business-funded Bonus Deals/rewards.
5. Add reward reporting and conversion measurement.

---

# Product Principle

The redemption system must become a trusted platform event, not merely a UI interaction.

Once RaiseHub can reliably answer **who redeemed what, where, and when**, customer rewards, business analytics, offer optimization, seller rewards, and future loyalty features can all build on the same foundation.

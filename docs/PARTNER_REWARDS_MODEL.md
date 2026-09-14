# RaiseHub Partner Rewards Model

**Status:** Future upgrade / post-launch roadmap candidate  
**Purpose:** Incentivize verified businesses to participate, promote RaiseHub, and help grow the local fundraising ecosystem while keeping rewards financially self-funding and transparent.

## 1. Core Model

RaiseHub currently envisions retaining a 20% platform allocation from qualifying sales. Under the Partner Rewards model, that 20% allocation would be split conceptually as follows:

- **15% of the qualifying sale:** retained by RaiseHub as platform revenue for overhead, operations, growth, reserves, and eventual profit.
- **5% of the qualifying sale:** allocated to the quarterly **Partner Rewards Pool**.

This means the Partner Rewards Pool is funded only by qualifying sales that actually occur. RaiseHub does not promise a fixed dollar payout independent of platform usage.

Example:

```text
$100 qualifying sale
$80 -> existing fundraiser / seller / campaign economics
$15 -> RaiseHub platform revenue
$5  -> Partner Rewards Pool
```

The exact transaction allocation should remain configuration-driven so future pricing or economic-model changes do not require rewriting the rewards engine.

## 2. Eligibility

Partner Rewards are intended for **verified businesses** that meet the participation requirements for the applicable quarter.

Verification should be a prerequisite for receiving a cash reward. Additional eligibility rules may include:

- Business remains in good standing.
- Business has at least one qualifying active offer or other eligible participation during the quarter.
- Required payout and tax information is complete before cash distribution.
- No unresolved fraud, abuse, chargeback, or verification hold exists.
- Business meets any published minimum activity threshold for that quarter.

Verification therefore becomes more than an identity check; it becomes entry into the economic rewards program.

## 3. Partner Points

Eligible businesses earn **Partner Points** for activity that creates measurable value for the RaiseHub ecosystem.

Potential point-producing activities include:

- Completing verified business onboarding.
- Maintaining an eligible active offer.
- Verified customer redemptions.
- Unique-customer engagement bonuses.
- Referring a business that becomes verified and active.
- Referring an organization that launches a qualifying campaign.
- Participating in fundraiser campaigns.
- Renewing or refreshing offers.
- Reaching legitimate performance milestones.
- Other future activities approved by the rewards-rule system.

Actual point values should be configurable and versioned rather than hard-coded into product logic.

Points should favor **real customer and ecosystem activity** over passive actions so the program rewards behaviors that increase usage, trust, and sustainable revenue.

## 4. Quarterly Distribution Formula

At the end of each quarter, all eligible Partner Points earned during that quarter are totaled.

Each business receives the same proportion of the Partner Rewards Pool as its proportion of eligible quarterly points.

```text
Business Reward =
(Business Eligible Points / Total Eligible Partner Points)
× Final Quarterly Partner Rewards Pool
```

Example:

```text
Quarterly Partner Rewards Pool: $25,000
Total eligible Partner Points: 100,000

Business A: 1,000 points
1,000 / 100,000 = 1%
Reward = $250

Business B: 2,000 points
2,000 / 100,000 = 2%
Reward = $500
```

The effective dollar value of one point is determined only after the quarter is finalized:

```text
Point Value = Final Rewards Pool / Total Eligible Points
```

This keeps the system self-balancing. A stronger quarter produces a larger pool; a weaker quarter automatically produces a smaller pool.

## 5. Quarterly Reset Without Deleting History

Points are earned inside a defined reward period, such as 2027 Q1.

At quarter close:

1. The reward period is frozen.
2. Qualifying revenue is finalized.
3. Refunds, chargebacks, reversals, and fraud adjustments are applied.
4. Eligible Partner Points are finalized.
5. The point value is calculated.
6. Each participating business reward is calculated.
7. Reports are generated.
8. Payouts move to approval / payment status.
9. A new quarterly reward period begins.

Historical points must **not** be deleted or overwritten. The next quarter begins a new earning period while prior quarters remain permanently auditable.

## 6. Ledger-Based Architecture

Do not store Partner Points only as a mutable total on the business record.

Use an append-oriented rewards ledger where each earning or adjustment event is recorded independently.

Conceptual examples:

```text
+100  Verified onboarding
+2    Redemption #48291
+5    Unique customer bonus for redemption #48291
+250  Referred business #287 activated
-7    Refunded transaction adjustment
```

The displayed point balance for a quarter is derived from eligible ledger entries.

Each ledger record should eventually support fields such as:

- Business ID
- Reward period ID
- Event type
- Point amount
- Source entity / transaction ID
- Rule version
- Timestamp
- Reversal reference when applicable
- Audit metadata

The same principle should apply to Partner Rewards Pool contributions. Each qualifying transaction should generate an auditable contribution record instead of only incrementing a single pool counter.

## 7. Rewards Rule Versioning

Reward rules must be versioned by effective period.

Example:

```text
2027 Q1 -> Partner Rewards Rules v1
2027 Q2 -> Partner Rewards Rules v2
```

Changing a future rule must never alter the historical calculation for a closed quarter.

A quarterly report should identify the exact rule version used for that reward period.

## 8. Business Dashboard

A verified participating business should eventually see a Partner Rewards dashboard with at least:

- Current quarter.
- Points earned this quarter.
- Network-wide eligible points.
- Current estimated share of points.
- Current Partner Rewards Pool.
- Estimated reward.
- Point-earning activity ledger.
- Eligibility / verification status.
- Prior quarterly statements.
- Prior payouts and statuses.

During an active quarter, monetary values should be labeled **estimated** because revenue, refunds, chargebacks, points, reversals, and eligibility can change before close.

Example:

```text
Q1 Partner Rewards
Points earned: 1,240
Current network points: 82,450
Current share: 1.50%
Current rewards pool: $18,760
Estimated reward: $281.40
```

## 9. Network Transparency

RaiseHub should publish enough aggregate information to let participating businesses understand and trust the program without exposing private competitor data.

Potential transparent metrics include:

- Total qualifying quarterly transaction volume.
- Total Partner Rewards Pool.
- Total eligible Partner Points.
- Number of participating verified businesses.
- Final point value after quarter close.
- Total amount approved and distributed.
- Current rewards-rule version.

Businesses should not see competitors' private sales, customer, or proprietary performance data.

## 10. Quarterly Business Statement

At quarter close, RaiseHub should automatically generate a permanent statement for each participating business.

The statement should include:

- Quarter start and end dates.
- Business identity.
- Verification / eligibility status.
- Partner Points earned by category.
- Adjustments and reversals.
- Final eligible points.
- Total eligible network points.
- Business percentage of eligible points.
- Total final Partner Rewards Pool.
- Final point value.
- Final business reward.
- Payout status and date when applicable.
- Rewards-rule version.

A downloadable report or PDF may be added as part of the reporting layer.

## 11. Owner Console / Audit View

The Owner Console should provide a complete Partner Rewards audit view containing:

- Qualifying transaction volume.
- RaiseHub retained allocation.
- Partner Rewards Pool contribution total.
- Refund / chargeback adjustments.
- Eligible businesses.
- Total Partner Points.
- Final / estimated point value.
- Calculated payouts.
- Payout status.
- Exceptions and fraud flags.
- Rule version.
- Drill-down into every points event and pool contribution.

Example:

```text
Q1 2027 Partner Rewards
Qualifying volume: $472,840
20% platform allocation: $94,568
RaiseHub retained allocation: $70,926
Partner Rewards Pool: $23,642
Eligible businesses: 183
Total Partner Points: 238,417
Point value: $0.09916
Pending payouts: $23,642
```

## 12. Automation

The system should be designed so normal quarterly calculations do not depend on manual spreadsheets.

Automation should eventually cover:

1. Recording pool contributions from qualifying transactions.
2. Recording Partner Point events.
3. Applying reversals for refunds and chargebacks.
4. Tracking active-quarter estimates.
5. Closing a quarterly reward period.
6. Freezing final eligible revenue and points.
7. Calculating final point value.
8. Calculating each business reward.
9. Generating business statements.
10. Generating Owner audit reports.
11. Preparing payout instructions.
12. Sending business notifications.
13. Opening the next reward period.

## 13. Initial Human Payout Approval

Calculations and report generation should be automated, but initial releases of real money should require an Owner approval step.

Conceptual flow:

```text
Quarter closes
-> calculations finalize
-> exception / fraud checks run
-> statements generate
-> Owner reviews payout batch
-> Owner approves payout batch
-> payments are released
```

After the system has operated reliably and financial / fraud controls have been proven, fully automated payouts may be considered separately.

## 14. Fraud and Abuse Controls

Before implementation, the engine should account for attempts to manufacture points or illegitimate transaction activity.

Controls should eventually include:

- Verified-business requirement.
- Unique-event constraints where appropriate.
- Duplicate redemption detection.
- Self-referral controls.
- Referral qualification requirements.
- Refund and chargeback reversals.
- Manual fraud holds.
- Payout holds while a business is under review.
- Owner-visible anomalies.
- Immutable historical audit events.

Point rules should never reward behavior that can be cheaply spammed without creating real RaiseHub value.

## 15. Reporting and Notifications

Potential automated communications include:

- Welcome to Partner Rewards after verification / eligibility.
- Monthly or mid-quarter progress summaries.
- Quarter-closing reminder when an action is required.
- Final quarterly reward notification.
- Payout-issued notification.
- Payout-problem or missing-information notification.

Example business-facing message:

> Your Q1 Partner Reward is ready. Your business earned 4,207 eligible Partner Points, representing 1.76% of eligible points this quarter. The Q1 Partner Rewards Pool totaled $23,642. Your finalized reward and complete quarterly statement are now available in RaiseHub.

## 16. Product Positioning

Partner Rewards should be presented as a benefit of verified participation, not as equity, ownership, or a guaranteed dividend.

Preferred language:

- Partner Rewards
- Partner Rewards Pool
- Partner Points
- Quarterly Partner Reward
- Verified RaiseHub Partner

Avoid describing ordinary business participants as shareholders, equity owners, or recipients of company dividends unless RaiseHub intentionally creates a separate legal ownership program.

Potential positioning:

> **Join RaiseHub, bring customers through your door, support local fundraising, and share in the growth of the RaiseHub community.**

## 17. Legal / Accounting Review Gate

Before cash Partner Rewards are activated in production, RaiseHub should obtain appropriate legal and accounting review of:

- Program terms.
- Tax reporting and payout thresholds.
- Treatment of rewards for businesses.
- Required payout / identity information.
- Refund and chargeback treatment.
- Program modification language.
- Avoiding unintended equity, partnership, or securities treatment.

This review is an implementation gate, not a rejection of the product concept.

## 18. Implementation Priority

This is a **future upgrade**, not a launch blocker unless deliberately promoted into the launch roadmap.

Recommended implementation sequence:

1. Finalize RaiseHub's production transaction economics.
2. Establish verified-business workflows.
3. Build append-only Partner Points and pool ledgers.
4. Add configurable / versioned reward rules.
5. Add business dashboard estimates.
6. Add Owner audit views.
7. Add quarter-close automation.
8. Add report / statement generation.
9. Add payout preparation and Owner approval.
10. Add production payouts after legal, accounting, fraud, and operational review.

## 19. Product Principle Alignment

The Partner Rewards Engine should support RaiseHub's existing product principles:

- **Increase revenue:** incentives encourage businesses to activate, refer, participate, and promote RaiseHub.
- **Increase trust:** transparent calculations, immutable ledger events, and permanent statements make rewards explainable.
- **Reduce support:** self-service dashboards and detailed audit trails answer "How was my reward calculated?" without manual investigation.
- **Answer "What should I do next?":** the business dashboard can show which legitimate actions can increase Partner Points and participation during the current quarter.

---

## Decision Summary

RaiseHub should preserve the Partner Rewards concept as a future upgrade built around a **quarterly, self-funding pool** for verified participating businesses.

The working economic model is:

```text
20% platform allocation from qualifying sales
= 15% RaiseHub platform revenue
+ 5% Partner Rewards Pool
```

At quarter close:

```text
Business share of pool
= Business eligible points / Total eligible points
```

The system should ultimately be automated, ledger-based, auditable, versioned, transparent, and report-driven, with Owner approval of real-money payout batches during the initial implementation period.

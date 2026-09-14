# RaiseHub Partner Points and Business Verification

**Status:** Approved product design / future implementation plan  
**Related:** `docs/PARTNER_REWARDS_MODEL.md`

## 1. Purpose

The Partner Points system should reward business behavior that creates measurable value for RaiseHub while giving businesses a clear, motivating answer to: **What should I do next to earn more?**

Partner Points feed the quarterly Partner Rewards model. Cash Partner Rewards remain limited to eligible **verified businesses**.

The system should be:

- Easy for businesses to understand.
- Visually motivating during the quarter.
- Weighted toward real customer and ecosystem activity.
- Difficult to game with spam, duplicate accounts, or meaningless edits.
- Fully auditable through append-only point events.
- Configuration-driven and versioned by reward period.

---

## 2. Recommended Initial Point Schedule

The first production rule set should be treated as **Partner Rewards Rules v1** and monitored before future quarterly adjustments.

### Profile and Verification

| Activity | Points | Frequency / Limit |
|---|---:|---|
| Complete required business profile | +100 | Once per business |
| Verification approved | +200 | Once per approval lifecycle |

Profile-completion points should only be granted when all required profile fields are genuinely complete. Removing required information later may place the business into an eligibility warning state, but should not silently rewrite historical ledger events.

Verification primarily serves as the gate to cash Partner Rewards. The +200 bonus recognizes the additional trust value created by completing manual verification.

### Active Offers

| Activity | Points | Frequency / Limit |
|---|---:|---|
| Qualifying active offer | +1 per day | Per qualifying offer, maximum 3 offers/day |
| High-Value Offer activation | +50 | Once per qualifying offer/version; recommended max 3 bonuses/quarter |

Daily active-offer points create a steady visual sense of progress without allowing passive activity to dominate the quarterly pool.

An offer only qualifies for daily points when it is public, active, valid, not expired, not paused, and not under moderation or fraud review.

### Customer Activity

| Activity | Points | Frequency / Limit |
|---|---:|---|
| Valid verified redemption | +10 | Per eligible redemption |
| First unique supporter/customer redemption at that business in the quarter | +5 bonus | Once per unique customer/business/quarter |

Redemptions should be one of the strongest renewable earning sources because they demonstrate that the business is creating actual customer value and platform usage.

Refunded, reversed, duplicated, self-generated, or fraudulent activity should not produce lasting eligible points.

### Business Referrals

A business referral should pay in stages so RaiseHub rewards quality rather than raw signups.

| Milestone | Points |
|---|---:|
| Referred business creates a qualified net-new account | +50 |
| Referred business completes required profile | +150 |
| Referred business is manually verified by RaiseHub | +300 |
| **Maximum initial referral value** | **500** |

The largest bonus is intentionally tied to verification. Referring a legitimate business that completes onboarding and passes manual Owner review creates substantially more value than generating an abandoned signup.

### Organization Referrals

| Milestone | Points |
|---|---:|
| Referred organization creates a qualified net-new account | +50 |
| Organization completes required onboarding / approval requirements | +150 |
| Organization launches its first qualifying live campaign or completes its first qualifying transaction milestone | +300 |
| **Maximum initial referral value** | **500** |

### Supporter Referrals

| Milestone | Points |
|---|---:|
| Net-new supporter creates a qualified account through the business referral | +5 |
| Referred supporter completes first qualifying purchase or redemption | +20 |
| **Maximum initial referral value** | **25** |

Supporter referrals should be rewarded at a smaller per-person level because they can scale in volume. The meaningful bonus should occur only after the supporter completes a real qualifying action.

---

## 3. Why These Weights Are Fair

The system should not let one-time setup actions or passive offer listings outweigh real usage.

The initial weighting intent is:

- **Profile / trust:** meaningful one-time boost.
- **Offer availability:** steady but capped passive progress.
- **High-value offers:** noticeable bonus for creating stronger customer value.
- **Redemptions:** strongest repeatable source tied to actual platform activity.
- **Business and organization referrals:** large milestone-based bonuses because they expand the ecosystem.
- **Supporter referrals:** smaller scalable bonuses tied to real conversion.

The actual network-wide mix should be reviewed after each quarter. If one category begins dominating the pool in a way that no longer reflects real value, the next quarter can use a new versioned rule set without changing closed-quarter history.

---

## 4. High-Value Offer Definition

“High Value” must be based on transparent, versioned rules rather than subjective favoritism.

A future **Offer Value Score** should evaluate objective factors such as:

- Meaningful customer savings.
- Clear and understandable terms.
- Reasonable restrictions.
- Availability broad enough to be genuinely useful.
- Offer type and normal category economics.
- Verified face value where applicable.

Initial examples that may qualify include:

- Percentage discount at or above a configured threshold.
- Fixed-dollar savings at or above a configured threshold.
- BOGO / free-item offers with a verified minimum customer value.
- Owner-approved equivalent value for categories where percentage or dollar thresholds do not fit.

The thresholds must remain configuration-driven. RaiseHub should not encourage businesses to create financially unsustainable offers merely to earn points.

A High-Value Offer bonus should be awarded once for a qualifying offer/version, not repeatedly for minor edits. Repeated edit-and-resave behavior must not create new bonuses.

---

## 5. Verification as the Partner Rewards Gate

### Business-facing flow

The Business Dashboard should include a **Verification / Partner Rewards** section.

Possible statuses:

- `not_applied`
- `needs_profile`
- `pending`
- `approved`
- `declined`
- `revoked`

An unverified business should see a clear **Apply for Verification** action.

Before submission, RaiseHub performs a profile-completion preflight. The application cannot be submitted until all required fields are complete.

Recommended required fields include:

- Business public name.
- Legal business name where applicable.
- Business category.
- Business description.
- Business logo / profile image.
- Public business phone.
- Physical or service address as applicable.
- Website or legitimate public social/business presence when available.
- Primary owner/contact identity.
- Owner contact method.
- Ownership / authority attestation.
- At least one valid active or ready-to-activate offer, if required by the active rewards rules.

The UI should show exactly what is missing and link the business directly to the relevant edit action.

After submission:

- Status becomes **Pending review**.
- Duplicate submissions are blocked.
- The business can see that manual verification is required.
- The business can continue using normal platform features while review is pending unless another policy says otherwise.

### Pending points recommendation

Unverified businesses may earn **pending Partner Points** during the current quarter so progress is visible before verification.

Pending points do not participate in the final cash-reward denominator or payout unless the business becomes eligible by the quarter-close rules.

Recommended v1 behavior:

> If a business is approved before quarter close, its legitimate pending points from that same open quarter become eligible. Closed quarters are never retroactively recalculated unless an explicit correction process is invoked.

This creates a strong verification incentive without forcing a new business to lose all legitimate activity while awaiting manual review.

---

## 6. Owner Verification Queue

The Owner Console should contain a dedicated **Business Verification** queue.

Each application should show:

- Business name.
- Primary owner/contact.
- Profile-completion status.
- Application date.
- Business address / service area.
- Public contact details.
- Referral source, if applicable.
- Current Partner Points and pending/eligible state.
- Existing fraud, duplication, moderation, or support flags.
- Verification history.

Owner actions should include:

- **Open Business Profile**
- **Call / Contact Business**
- **Record Phone Verification**
- **Record In-Person Visit**
- **Record Other Verification Evidence**
- **Approve Verification**
- **Decline Verification**
- **Request Corrections / More Information**
- **Revoke Verification**
- **Remove / Deactivate Business** as a separate destructive action

Verification evidence and notes are internal Owner records and should not be exposed publicly.

### Approval

When Owner approves verification:

1. Business status becomes `approved`.
2. Verified Business badge becomes active.
3. Partner Rewards eligibility becomes active, subject to all other quarter rules.
4. Legitimate pending points for the open quarter become eligible according to the current rules.
5. Verification approval points are ledgered.
6. If the business was referred, the referring business receives the verified-business referral milestone points.
7. The business receives an automated verification / Partner Rewards welcome notification.
8. The event is written to the audit trail.

### Decline

Declining verification should require an internal reason and a customer-facing outcome category.

Examples:

- Could not confirm ownership / authority.
- Business information could not be verified.
- Duplicate business account.
- Profile requires corrections.
- Business is ineligible under current policy.
- Suspected fraud / impersonation.

Where appropriate, Owner can permit reapplication after corrections. Fraud / impersonation cases may instead require deactivation or removal.

### Removal is separate from decline

Declining a verification request should **not automatically delete the business**.

If Owner determines that the account is fraudulent, impersonating a real owner, or otherwise unsafe to keep active, removal / deactivation should be a separate confirmed action with a required reason and permanent audit event.

---

## 7. Business Rewards Experience

The Business Dashboard should make Partner Rewards feel alive throughout the quarter.

### Primary Partner Rewards card

Display:

- Current quarter.
- Large animated / visually prominent point total.
- Eligible points.
- Pending points, when applicable.
- Verification status.
- Current network eligible points.
- Current estimated share of the Partner Rewards Pool.
- Current estimated reward.
- Quarter time remaining.
- Progress toward the next recommended earning action.

All monetary values during an open quarter must be labeled **Estimated**.

### Category visualization

Show a simple breakdown such as:

```text
Profile & Trust      300
Active Offers        164
Offer Quality        100
Redemptions          925
Referrals            550
-------------------------
Quarter Points     2,039
```

This makes the calculation understandable without forcing the business to read a ledger.

### Recent activity

Show a compact points feed:

```text
+10  Customer redemption
+5   New unique customer bonus
+1   Active offer daily point
+300 Referred business verified
```

The complete ledger can live behind **View all activity**.

---

## 8. “Ways to Earn” Recommendation Engine

The rewards UI should automatically answer **What should I do next?**

Instead of showing every possible rule equally, surface the most relevant actions based on the business's current state.

Examples:

- **Finish your profile — earn +100 points**
- **Apply for verification — unlock quarterly Partner Rewards**
- **Add your first active offer — start earning daily**
- **Keep 3 qualifying offers active — earn up to +3/day**
- **Improve this offer to High Value — eligible for +50**
- **Share your referral link — verified businesses can earn you up to +500**
- **Refer an organization — earn up to +500 when it activates**
- **Invite supporters — earn up to +25 each after qualifying activity**
- **Your offer has views but few redemptions — consider improving the value**

Recommendations should be generated from factual state and reward rules, not arbitrary engagement prompts.

Completed actions should disappear or move to a completed state so the dashboard continuously surfaces the next legitimate opportunity.

---

## 9. Referral Attribution

Every referral must have durable attribution.

Supported referral mechanisms may include:

- Business-specific referral link.
- QR code.
- Referral code.
- In-product invite flow.

Attribution should be recorded when the referred user/entity first qualifies and should not be freely changed afterward.

Rules:

- Referred account/entity must be net-new.
- No self-referrals.
- No duplicate referral claims.
- Milestone points may be awarded only once per referred entity.
- A referral signup alone receives only the smallest milestone.
- Larger points require verified / activated behavior.
- Fraudulent or reversed referrals generate point reversals.

---

## 10. Anti-Gaming and Audit Requirements

Every points event must be ledger-based and idempotent.

Required protections include:

- One-time event keys for setup and milestone bonuses.
- Daily active-offer earning cap.
- High-Value Offer bonus cap and offer-version uniqueness.
- Duplicate redemption protection.
- Self-redemption / suspicious-loop detection.
- Refund and chargeback point reversals.
- Net-new referral validation.
- Self-referral prevention.
- Referral milestone uniqueness.
- Owner-visible fraud flags.
- Required reason for manual point adjustments.
- Permanent audit trail for verification decisions and reward adjustments.
- Closed-quarter immutability except explicit correction entries.

Never silently edit historical point totals. Corrections should appear as explicit positive or negative ledger events.

---

## 11. Suggested Data Model

Exact schema should be finalized after inspecting current production tables and RLS policies.

Conceptual entities:

### `business_verification_applications`

- id
- business_id / workspace_id
- status
- submitted_at
- reviewed_at
- reviewed_by
- verification_method
- internal_notes
- decision_reason
- reapply_allowed_at
- created_at
- updated_at

### `partner_reward_periods`

- id
- label
- starts_at
- ends_at
- status
- reward_rule_version
- pool_total
- total_eligible_points
- finalized_point_value
- closed_at

### `partner_point_events`

- id
- business_id
- reward_period_id
- event_type
- points
- eligibility_status
- source_type
- source_id
- idempotency_key
- rule_version
- reversal_of_event_id
- metadata
- created_at

### `partner_referrals`

- id
- referring_business_id
- referred_entity_type
- referred_entity_id
- referral_token / attribution key
- status
- attributed_at
- qualified_at
- metadata

### `partner_reward_rules`

Configuration / versioning layer for point values, limits, qualification requirements, and effective reward periods.

---

## 12. Initial Implementation Sequence

Because RaiseHub's current roadmap blocks unrestricted financial feature testing until environment separation is complete, implement this in stages.

### Stage A — Product / trust foundation

1. Finalize Partner Points Rules v1.
2. Add profile-completion scoring.
3. Add business verification statuses and application records.
4. Add Business Dashboard **Apply for Verification** flow.
5. Add Owner Console **Business Verification** queue.
6. Add approve / decline / request-info / revoke actions with audit logging.
7. Add Verified Business badge.

### Stage B — Points foundation

8. Add reward periods and versioned rule configuration.
9. Add append-only point ledger.
10. Add pending vs eligible point state.
11. Add profile / verification points.
12. Add daily active-offer points.
13. Add High-Value Offer scoring and points.
14. Add redemption points.
15. Add referral attribution and milestone points.

### Stage C — Business experience

16. Add Partner Rewards dashboard card.
17. Add visual category breakdown.
18. Add recent points activity.
19. Add personalized **Ways to Earn** recommendations.
20. Add referral links / QR / codes.

### Stage D — Quarterly financial rewards

Only after environment separation, transaction economics, legal/accounting review, and financial testing are ready:

21. Connect qualifying sales to the Partner Rewards Pool ledger.
22. Add live estimated pool / share / reward calculations.
23. Add quarter close.
24. Generate statements and Owner reports.
25. Prepare payout batches.
26. Require Owner approval before initial real-money payout release.

---

## 13. Initial Product Decision Summary

RaiseHub should launch the Partner Points system around five value categories:

1. **Complete and trustworthy business profiles.**
2. **Useful active offers.**
3. **Higher-value offers.**
4. **Real customer redemptions.**
5. **Qualified network growth through business, organization, and supporter referrals.**

The Business Dashboard should continuously show points growing, explain where they came from, and recommend the next best legitimate action.

Business verification should remain a manual Owner-controlled trust decision. The business applies from its dashboard only after required profile completion; the Owner reviews the business and may confirm ownership through profile review, phone contact, an in-person visit, or other appropriate evidence before approving.

Verification unlocks eligibility for quarterly Partner Rewards and triggers referral milestones where applicable.

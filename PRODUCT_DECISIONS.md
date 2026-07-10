# RaiseHub Product Decisions

Version: 1.0

---

# Purpose

This document records important product decisions and why they were made.

The goal is to preserve reasoning, not just outcomes.

If a future feature conflicts with a previous decision, revisit the decision
rather than accidentally drifting away from the RaiseHub vision.

---

# 2026-07-10

## Rules Before AI

Decision

RaiseHub should prioritize deterministic business rules before AI.

Reason

- Lower operating cost
- Predictable behavior
- Easier testing
- Faster performance
- Platform remains functional without AI

AI should enhance—not power—the platform.

---

# 2026-07-10

## Evergreen Offers

Decision

Recommended offer duration should be:

- Ongoing

or

- One Year

Reason

Businesses should not lose customers because they forgot to renew offers.

---

# 2026-07-10

## Performance Over Calendar

Decision

Businesses should manage offers because performance changed.

Not because an expiration date arrived.

Preferred triggers

- Low redemption rate
- Strong performing offer
- Seasonal opportunity
- Empty offer slot
- Review reminder

Expiration should be secondary.

---

# 2026-07-10

## Offer Quality

Decision

RaiseHub should recommend offers with high perceived customer value while
keeping business fulfillment costs reasonable.

Weak generic discounts should not be recommended.

Reason

Customers should immediately feel their membership is worthwhile.

---

# 2026-07-10

## Rule Engine

Decision

All reusable business intelligence should live inside:

src/lib/rules/

Reason

Centralized logic is easier to:

- Test
- Reuse
- Maintain
- Expand

---

# 2026-07-10

## AI Boundary

AI may

- Rewrite offers
- Improve descriptions
- Generate marketing
- Explain analytics
- Brainstorm ideas

AI may not

- Determine permissions
- Override business rules
- Make billing decisions
- Perform automatic moderation
- Replace deterministic rules

---

# 2026-07-10

## Dashboard Philosophy

Every dashboard should answer three questions.

1. What happened?

2. What needs attention?

3. What should I do next?

If a dashboard cannot answer those questions, simplify it.

---

# Future Decisions

Append future decisions to the bottom of this document.

Never rewrite history.

If a previous decision changes, document the change and the reason.
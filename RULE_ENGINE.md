# RaiseHub Rule Engine

Version: 1.0

---

# Purpose

RaiseHub should provide intelligent recommendations using deterministic logic
before relying on AI.

Rules should be:

- Predictable
- Fast
- Testable
- Reusable
- Low cost

AI is optional.

The Rule Engine is required.

---

# Philosophy

Rules decide.

AI explains.

---

# Future Location

src/lib/rules/

---

# Core Rule Categories

## Offer Rules

Determine:

- Active
- Scheduled
- Review Recommended
- Paused
- Expired
- Archived

---

## Business Health

Evaluate:

- Active offer count
- Redemption trends
- Conversion trends
- Missing profile data
- Empty offer slots
- Review reminders

---

## Customer Rules

Evaluate:

- Savings earned
- Favorite businesses
- Redemption streaks
- Nearby recommendations

---

## Organization Rules

Evaluate:

- Campaign health
- Fundraising progress
- Business participation
- Coupon performance

---

## Owner Rules

Evaluate:

- Marketplace growth
- Revenue
- Business adoption
- Community activity
- Platform health

---

# Rule Priorities

1. Security
2. Billing
3. Permissions
4. Notifications
5. Recommendations
6. Analytics

---

# Review Philosophy

Businesses should review offers because:

- Performance changed

Not because:

- Time passed

---

# Offer Defaults

Recommended:

• Ongoing

or

• One Year

Expiration is optional.

Review reminders are preferred.

---

# Notification Levels

Dashboard

↓

Notification Center

↓

Email

↓

Mobile Push

Only escalate when needed.

---

# AI Boundary

AI may:

- Rewrite
- Suggest
- Explain
- Generate marketing

AI may never determine:

- Billing
- Permissions
- Security
- Moderation
- Rule outcomes

Rule Engine remains the source of truth.
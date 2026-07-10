# ChatGPT Working Guide for RaiseHub

Version: 1.0

---

# Purpose

This file defines how ChatGPT should help build and maintain RaiseHub.

ChatGPT should use the project documentation as the source of truth before
recommending major features or architectural changes.

Primary reference files:

- ARCHITECTURE_PRINCIPLES.md
- BUSINESS_PHILOSOPHY.md
- RULE_ENGINE.md
- PRODUCT_DECISIONS.md
- PRODUCT_VISION.md
- PROJECT_STATUS.md
- OWNER_VISION.md
- IDEA_BACKLOG.md
- LESSONS_LEARNED.md
- AGENTS.md

If a recommendation conflicts with one of these documents, ChatGPT should point
out the conflict before proceeding.

---

# Product Priorities

RaiseHub should:

- Reduce work for businesses
- Prioritize strong exclusive offers
- Help organizations raise more money
- Help customers receive obvious membership value
- Use rules and analytics before AI
- Keep AI optional
- Preserve user trust
- Remain easy to operate from a phone or browser

---

# Rules Before AI

Preferred order:

1. Deterministic rules
2. Analytics
3. AI

Use normal application logic for:

- Status
- Permissions
- Billing
- Offer limits
- Alerts
- Health scores
- Recommendations based on known data
- Expiration and review checks
- Dashboard attention items

Use AI only where language or creativity adds real value.

Examples:

- Rewriting offers
- Marketing copy
- Social posts
- Optional plain-language summaries
- Brainstorming seasonal promotions

The product should continue functioning normally if AI services are unavailable.

---

# Offer Philosophy

Recommended offer durations should generally be:

- Ongoing
- One year

Shorter durations should be reserved for:

- Seasonal promotions
- Holidays
- Events
- Limited-time business goals

Review dates should be separate from expiration dates.

Businesses should manage offers because performance changed, not because they
forgot to renew them.

Offer recommendations should balance:

- Strong customer value
- Reasonable fulfillment cost
- Exclusivity
- Business growth potential
- Membership value

Avoid weak generic discounts that customers could receive elsewhere.

---

# Dashboard Philosophy

Every dashboard should answer:

1. What happened?
2. What needs attention?
3. What should I do next?

Dashboard guidance should begin with rule-based logic.

Alert priority:

1. Dashboard attention banner
2. In-app notification center
3. Optional email alerts
4. Mobile push notifications later

Avoid excessive notifications.

---

# User Roles

RaiseHub has five primary roles:

- Customer
- Business
- Organization
- Admin
- Owner

The Admin Dashboard manages platform operations.

The Owner Dashboard includes executive analytics, marketplace health, company
performance, and private owner tools.

Owner-only personal finance information must remain isolated from public
RaiseHub product data.

---

# Offer Lifecycle

Supported or planned offer states:

- Scheduled
- Active
- Expiring Soon
- Paused
- Expired
- Archived

User-facing language should use:

- Pause Offer
- Resume Offer
- Extend Offer
- Duplicate Offer
- Archive Offer
- Restore Offer

Avoid permanent deletion unless clearly necessary.

Paused, expired, and archived offers should retain history and remain available
to the business where appropriate.

---

# Engineering Style

Code should be:

- Clean
- Sectioned
- Modular
- Beginner-friendly
- Easy to enhance
- Secure by default

Prefer:

- Full-file replacements when helping the owner make manual edits
- Exact file paths
- Rough line numbers when available
- Clear start and end markers for partial replacements
- Reusable components
- Shared rule libraries
- Server-side privileged actions
- Soft deletion and archival
- Explicit error handling

Avoid:

- Vague instructions such as "put this inside the card"
- Large unexplained refactors
- Exposing service-role keys to the browser
- Duplicating business logic across pages
- Assuming code exists without checking GitHub first
- Renaming internal functions during a wording-only update

---

# GitHub Usage

Before giving code that modifies an existing file:

1. Read the current GitHub file when access is available.
2. Reference the actual file structure.
3. Give the exact path.
4. Give approximate line numbers.
5. Provide the whole block to replace.
6. Clearly state what should remain unchanged.

When GitHub differs from the user's local copy, explain that unpushed local
changes may shift line numbers.

Do not claim a file was created or updated unless the write actually succeeded.

---

# Development Workflow

At the start of work on the Mac:

```bash
git pull
npm run dev
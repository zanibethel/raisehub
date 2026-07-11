# RaiseHub Architecture Standard

As RaiseHub grows, every major feature should follow a consistent architecture. This makes the codebase easier to understand, safer to modify, easier to work on from mobile devices, and more maintainable for future developers or AI agents.

## Design Principles

- Prefer deterministic logic over AI whenever possible.
- Separate business rules from UI.
- Keep files focused on one responsibility.
- Favor reusable components over duplicated code.
- Build new architecture first, then perform a single switch-over when possible.
- Avoid modifying large production files repeatedly. Create replacement modules first, then replace the entry point in one commit.

---

# Layered Architecture

## 1. Route Layer

Responsible for:

- Authentication
- Authorization
- Selecting the correct experience
- Minimal orchestration

Example:

src/app/dashboard/page.tsx

Target:

- Under 100 lines whenever practical.
- No business logic.

---

## 2. Loader Layer

Responsible for:

- Loading role-specific data
- Calling services
- Preparing props

Example:

src/components/dashboards/business/business-dashboard.tsx

---

## 3. Content Layer

Responsible for:

- Page layout
- Modal state
- Passing props
- Composing sections

No database queries.

---

## 4. Section Layer

Each logical dashboard section should become its own component.

Examples:

- Snapshot
- Quick Actions
- Offers
- Reports
- Analytics
- Attention Center

---

## 5. Card Layer

Reusable visual building blocks.

Examples:

- Offer Card
- Campaign Card
- Metric Card
- Seller Card

---

## 6. Rules Layer

Location:

src/lib/rules/

Requirements:

- Pure functions
- No React
- No database access
- Deterministic results
- Explainable calculations

---

## 7. Service Layer

Location:

src/lib/services/

Responsibilities:

- Supabase queries
- External APIs
- Data loading
- Business persistence

Services may call rules.

Rules should never call services.

---

# Standard Project Structure

Example:

src/components/dashboards/

business/
customer/
organization/
admin/
owner/

Each role should contain:

- dashboard.tsx
- dashboard-content.tsx
- sections/
- cards/

---

# File Size Guidelines

Ideal:

100–250 lines

Target maximum:

300 lines

Large files are acceptable during rapid development but should become refactoring candidates before production maturity.

---

# Refactoring Strategy

Preferred workflow:

1. Build new modular files.
2. Verify with GitHub Actions.
3. Keep production behavior unchanged.
4. Perform one final switch-over.
5. Remove obsolete code after verification.

This minimizes production risk and makes changes easier to review.

---

# Shared Components

Reusable UI belongs in:

src/components/dashboard/

Examples:

- MetricCard
- StatusBadge
- AttentionCenter
- OfferHealthCard
- EmptyState
- SectionHeader

---

# Shared Logic

Business logic belongs in:

src/lib/rules/

Database logic belongs in:

src/lib/services/

This separation ensures consistent behavior across Business, Customer, Organization, Admin, and Owner experiences.

---

# Long-Term Goal

Every new RaiseHub feature should naturally evolve toward this architecture before production maturity.
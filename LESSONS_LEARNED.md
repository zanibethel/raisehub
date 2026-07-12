# RaiseHub Environment and Data Lessons

**Last updated:** July 2026

This document captures lessons related to environments, Supabase, database architecture, campaign calculations, financial integrity, and production safety.

---

# Lesson 1 — Local and Production Shared the Same Database

## Problem

Campaign progress appeared inconsistent between local development and production.

Testing locally unexpectedly affected production data.

## Root Cause

Local development and production were configured to use the same Supabase project.

There was no environment isolation.

As a result:

- Local purchases became production purchases.
- Demo data mixed with live data.
- Campaign progress changed unexpectedly.
- Local testing could affect real businesses.

## Resolution

The issue was verified and documented.

Environment separation became a launch requirement rather than a future enhancement.

## Prevention

- Never assume environments are isolated.
- Verify Supabase project IDs before testing.
- Create separate Development, Staging, and Production projects.
- Clearly identify demo records.
- Treat every local write as production until environments are separated.

---

# Lesson 2 — Shared Business Logic Should Live in Rules

## Problem

Campaign progress calculations existed in multiple locations.

Future changes could cause different pages to calculate different percentages.

## Root Cause

The calculation was copied instead of centralized.

Payment status was also ignored.

## Resolution

Campaign progress was identified as a candidate for a shared rule under:

    src/lib/rules/

## Prevention

Any calculation used in multiple places should exist only once.

Shared business rules should define:

- Valid payment statuses
- Refund behavior
- Goal calculations
- Rounding
- Edge cases

---

# Lesson 3 — Verify Schema Before Writing Queries

## Problem

Repository code assumed profile columns that were never verified.

TypeScript compiled successfully even though runtime queries might fail.

## Root Cause

The repository was built from assumptions instead of the actual schema.

## Resolution

Repository development now begins with schema inspection.

## Prevention

Before writing a repository:

- Inspect the table.
- Confirm column names.
- Confirm nullability.
- Review existing queries.
- Review indexes.
- Review RLS.

Never guess database fields.

---

# Lesson 4 — A Green Build Does Not Mean Runtime Success

## Problem

Several new files compiled successfully before they were connected to the application.

This could give the impression that a feature was complete.

## Root Cause

Compilation only validates code.

It does not verify:

- Routing
- Database queries
- Authorization
- Runtime behavior

## Resolution

RaiseHub now distinguishes:

- Foundation Complete
- Connected
- Runtime Verified
- Production Verified

## Prevention

Always document which implementation stage has actually been reached.

---

# Lesson 5 — Database Foundations Are Not Finished Features

## Problem

Support tables and preview tables existed before the surrounding application logic.

## Root Cause

Schema completion was confused with feature completion.

## Resolution

Features are now considered complete only after:

    Schema
    ↓
    RLS
    ↓
    Repository
    ↓
    Service
    ↓
    Authorization
    ↓
    UI
    ↓
    Audit
    ↓
    Testing

## Prevention

Do not describe a feature as complete because its tables exist.

---

# Lesson 6 — Repositories and Services Have Different Jobs

## Problem

Some early services queried Supabase directly.

This mixed business logic with database access.

## Root Cause

The repository layer had not yet been introduced.

## Resolution

RaiseHub adopted:

    Loader
    ↓
    Service
    ↓
    Repository
    ↓
    Supabase

## Prevention

Repositories:

- Query data
- Insert data
- Update data
- Delete data

Services:

- Apply permissions
- Combine data
- Map models
- Sort
- Filter
- Apply business rules

Keep responsibilities separate.

---

# Lesson 7 — Financial Rules Must Be Explicit

## Problem

Campaign progress counted purchase records without considering payment state.

This would become inaccurate once Stripe supports:

- Pending
- Failed
- Refunded
- Partially refunded

payments.

## Root Cause

Early development assumed every purchase represented completed revenue.

## Resolution

Financial calculations were identified for refactoring before production payments.

## Prevention

Every financial calculation should define:

- Valid statuses
- Refund behavior
- Currency representation
- Rounding
- Gross
- Net
- Platform fee

---

# Lesson 8 — Demo Data Must Never Be Confused with Live Data

## Problem

Demo accounts and production accounts can become difficult to distinguish.

## Root Cause

The initial data model did not clearly separate demo and live records.

## Resolution

RaiseHub now plans to support designated demo workspaces.

## Prevention

Demo records should include fields such as:

    is_demo
    demo_group
    data_source

The Owner Platform should always display whether a workspace is Demo or Live.

---

# Permanent Rules

- Separate environments.
- Never guess schema fields.
- Use repositories for data access.
- Use services for business logic.
- Centralize repeated calculations.
- Keep RLS enabled.
- Verify authorization server-side.
- Treat financial data as high risk.
- Distinguish demo from live data.
- A feature is not complete until it is connected, tested, and verified.
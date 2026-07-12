# RaiseHub Project Status

**Last updated:** July 2026  
**Current version:** v0.8 — Platform Foundation  
**Overall status:** Stable development build  
**Current initiative:** Owner Platform Console and Workspace System — read-only foundation connected

---

## Current Product Position

RaiseHub is a community fundraising and local-business growth platform.

The core product now supports:

- Customer accounts
- Business accounts
- Organization accounts
- Admin accounts
- Permanent Owner accounts
- Fundraising campaigns
- Campaign purchases
- Local business offers
- Saved offers
- Offer redemptions
- Role-specific dashboards
- Rule-based offer health and dashboard alerts
- Demo-mode infrastructure
- GitHub Actions build verification

The immediate goal is to turn the Owner Platform Console into the central operating system for testing, supporting, and managing RaiseHub.

---

## Current Architecture Status

### Dashboard Refactor

Status: **Complete**

Completed:

- Business dashboard extracted into modular files
- Customer dashboard extracted into modular files
- Organization dashboard extracted into modular files
- Admin dashboard extracted into modular files
- Owner Platform Console introduced
- `src/app/dashboard/page.tsx` reduced to role routing and orchestration
- Dashboard structure standardized around:
  - Loader
  - Content
  - Sections
  - Reusable components
- Dependency-first migration workflow adopted
- GitHub Actions kept green between completed commits

### Data Architecture

Status: **In progress**

Completed:

- Workspace service introduced
- Workspace repository introduced
- Service and repository responsibilities separated
- Platform components introduced under `src/components/platform/`

### Owner Platform — Workspace Browser and Read-Only Support Shell

Status: **Connected foundations**

The workspace browser and the read-only support shell are connected, meaning:

- The Owner Platform Console loads live workspace results from the database.
- A workspace can be selected and its URL state is set.
- A read-only support view renders the selected workspace context.

These are connected foundations. Explicit owner authorization for private role-specific records (offers, campaigns, purchases, redemptions) is not yet complete. Connecting those records requires a separate authorization step beyond workspace selection.

**URL handling:**

Selected workspace URL matching confirms the requested ID and role match an available workspace result. This does not replace explicit authenticated-owner authorization for private role-specific data.

---

### Environment Separation

Status: **Incomplete — development and production share the same Supabase project**

Environment separation is incomplete. This has the following impact:

**Currently blocking:**

- Assisted edits against live client accounts
- Destructive testing
- Financial feature testing
- Broad live onboarding
- Unrestricted testing of audit-producing writes

**Not blocking:**

- Read-only Owner Platform development
- Authorization service implementation
- Audit repository and service design
- Read-only audit timeline work

Continue read-only and foundational work. Do not unblock write features until environment separation is complete.

---

### Offers Schema — Required Before Business-Offer Repository

Before designing or connecting the business-offer repository for the Owner Platform, the real `offers` table schema and RLS policies must be inspected and documented.

Do not invent offer fields, statuses, health columns, or ownership fields. Read the actual table and policies first.

---

Current data access direction:

```text
UI
↓
Service
↓
Repository
↓
Database
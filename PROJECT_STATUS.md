# RaiseHub Project Status

**Last updated:** July 2026  
**Current version:** v0.8 — Platform Foundation  
**Overall status:** Stable development build  
**Current initiative:** Owner Platform Console and Workspace System — all three read-only workspace roles now connected

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
- Multi-role identity/access domain types introduced under `src/lib/types/`
- Multi-role repositories introduced for businesses, memberships, organizations, campaign participation, customer entitlements, campaigns, and actor profiles
- Deterministic multi-role authorization rules introduced under `src/lib/rules/`
- Capability resolution and legacy compatibility services introduced for future workspace-aware authorization without changing current dashboard routing
- Workspace lifecycle, campaign sellability, and campaign recovery safeguards now align application behavior with the hardened live RLS campaign rules
- Verified live RPC prerequisites `get_campaign_recovery_context` and `get_public_campaign_progress` are integrated in the application layer only; this PR does not add SQL, migrations, policies, views, or replacement database functions
- Focused repository-side multi-role unit tests added for rules, capability resolution, campaign progress, and recovery flows

Pending:

- Extend the same multi-role capability model into broader workspace selection and invitation workflows
- Perform authorized live runtime verification against the verified database foundation and authenticated campaign accounts

### Owner Platform — Workspace Browser and Read-Only Support Shell

Status: **All three workspace roles connected with owner-authorized read-only records**

The workspace browser and the read-only support shell are connected, meaning:

- The Owner Platform Console loads live workspace results from the database.
- A workspace can be selected and its URL state is set.
- A read-only support view renders the selected workspace context.

These are now connected and owner-authorized for all three workspace roles:

- Owner workspace read authorization service is complete.
- Business-offer repository is complete and filtered by `business_id`.
- Owner business-offer service is complete and validates workspace authorization before loading offers.
- Read-only business-offer viewing is connected in Owner Platform support mode.
- Organization-campaign repository is complete and filtered by `organization_id`.
- Owner organization-campaign service is complete and validates workspace authorization before loading campaigns.
- Read-only organization-campaign viewing is connected in Owner Platform support mode.
- Customer-purchase repository is complete and filtered by `user_id` (with campaign and organization name enrichment).
- Customer-saved-offer repository is complete and filtered by `user_id` (with offer title and business name enrichment).
- Customer-redemption repository is complete and filtered by `user_id` (with offer title and business name enrichment).
- Owner customer-activity service is complete, validates workspace authorization, and loads all three repositories in parallel.
- Read-only customer activity (purchased passes, saved offers, redemption history) is connected in Owner Platform support mode.

Next direction: business redemption support in Owner Platform, audit infrastructure, environment separation before assisted editing.

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

### Offers Schema and Repository

Status: **Complete for read-only business offers**

The `offers` schema and current RLS behavior were verified and applied to the repository and owner authorization flow.

No schema or RLS changes were made. Repository filtering by `business_id` remains mandatory.

---

### Campaigns Schema and Repository

Status: **Complete for read-only organization campaigns**

The `campaigns` schema was verified and applied to the repository and owner authorization flow.

The owner-only campaign SELECT policy (`allow_owner_read_all_campaigns`) was added and verified as a database prerequisite before this application PR. This PR introduces no additional schema or RLS changes. Repository filtering by `organization_id` remains mandatory.

---

### Customer Activity Schema and Repositories

Status: **Complete for read-only owner-authorized customer activity**

The `campaign_purchases`, `saved_offers`, and `redemptions` schemas were verified and applied to the repositories and owner authorization flow.

The owner-only SELECT policies (`allow_owner_read_customer_activity`) were applied and verified as a database prerequisite before this application PR. This PR introduces no additional schema or RLS changes.

Repository filtering by `user_id` remains mandatory for all three customer activity repositories.

```text
UI
↓
Service
↓
Repository
↓
Database

# Release Readiness

## Current Phase

🟢 Dashboard Completion

Next Milestone:
- Analytics
- Payments
- Pilot Launch

---

## Launch Blockers

### Critical
- [ ] Stripe integration
- [ ] Business payouts
- [ ] Organization payouts

### High
- [ ] Analytics dashboards
- [ ] Notification system
- [ ] Final security audit

### Medium
- [ ] Mobile polish
- [ ] Error monitoring
- [ ] Production logging

---

## Pilot Readiness

Business Dashboard
☑ Ready

Organization Dashboard
☑ Ready

Owner Dashboard
☑ Ready

Coupon Redemption
☐ In Progress

Payments
☐ Not Started

Analytics
☐ In Progress

---

## Last Reviewed

2026-07-12
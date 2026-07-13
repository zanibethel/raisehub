# RaiseHub Roadmap

**Last updated:** July 2026

This roadmap describes the planned progression from the current platform foundation to controlled onboarding, monetization, and public launch.

The order may change when security, data integrity, or production stability requires earlier attention.

---

## Current Status

RaiseHub currently has:

- Authentication
- Customer accounts
- Business accounts
- Organization accounts
- Admin accounts
- Permanent Owner accounts
- Modular role-specific dashboards
- Fundraising campaigns
- Campaign purchases
- Business offers
- Saved offers
- Offer redemptions
- Business analytics foundation
- Organization reporting foundation
- Rule-based dashboard alerts
- Demo-mode infrastructure
- Owner Platform Console foundation
- Workspace browser — connected foundation
- Read-only support shell — connected foundation
- GitHub Actions verification

Current focus:

> Build the Owner Workspace System and prepare RaiseHub for safe, controlled live onboarding.

**Note on environment separation:** Until a separate development Supabase project exists, the following are blocked: assisted edits against live client accounts, destructive testing, financial feature testing, broad live onboarding, and unrestricted testing of audit-producing writes. Read-only Owner Platform development, authorization service implementation, audit repository and service design, and read-only audit timeline work are not blocked.

---

# Phase 1 — Core Platform Foundation

Status: **Complete foundation**

## Authentication and Profiles

- [x] Supabase authentication
- [x] Customer profiles
- [x] Business profiles
- [x] Organization profiles
- [x] Admin profiles
- [x] Owner profiles
- [x] Role-based dashboard routing
- [ ] Centralized authorization review
- [ ] Account suspension controls
- [ ] Account deletion workflow
- [ ] Email verification enforcement review
- [ ] Workspace-independent Manage Profile experience
- [ ] Personal full-name and display-name editing
- [ ] Personal profile-image editing
- [ ] Personal phone-number editing
- [ ] Structured personal address editing
- [ ] Verified email-change flow using Supabase Auth
- [ ] Re-authentication requirements for sensitive account changes
- [ ] Password and account-security management
- [ ] Security notifications for sensitive account changes
- [ ] Keep personal contact information separate from business and organization contact information

**Profile-management architecture note:** Manage Profile belongs to the authenticated person, not to a selected business, organization, seller, or customer workspace. Personal changes must preserve all memberships and entitlements. Business and organization contact information remains entity-owned and is edited only from the relevant authorized workspace.

## Fundraising Campaigns

- [x] Campaign creation
- [x] Campaign detail pages
- [x] Campaign purchases
- [x] Organization selection
- [x] Campaign goals
- [x] Campaign sharing
- [x] Campaign archiving
- [ ] Campaign editing
- [ ] Campaign restore
- [ ] Campaign duplication
- [ ] Centralized campaign progress logic
- [ ] Verified payment-status filtering
- [ ] Refund-aware progress calculations

## Business Offers

- [x] Business offer creation
- [x] Business onboarding foundation
- [x] Offer listing
- [x] Offer saving
- [x] Offer removal
- [x] Offer redemption
- [x] Offer pause and resume
- [x] Offer status badges
- [x] Offer Health foundation
- [x] Attention Center foundation
- [x] Active-offer limits
- [ ] Inspect and document real `offers` schema and RLS policies before designing business-offer repository
- [ ] Archive offer
- [ ] Restore offer
- [ ] Duplicate offer wizard
- [ ] Extend offer
- [ ] Offer scheduling polish
- [ ] Offer moderation workflow

---

# Phase 2 — Dashboard Architecture

Status: **Complete foundation**

## Shared Account Navigation

- [ ] Add Manage Profile to the authenticated account menu
- [ ] Keep Manage Profile available from every authorized workspace
- [ ] Add Switch Experience when multi-role workspaces are connected
- [ ] Display the verified account email clearly
- [ ] Keep Sign out available and visually separated from profile actions
- [ ] Provide clear success, verification-pending, and error states for sensitive profile changes

## Business Dashboard

- [x] Modular loader
- [x] Modular content component
- [x] Profile section
- [x] Snapshot section
- [x] Quick actions
- [x] Offer creation
- [x] Offer list
- [x] Redemption reporting
- [x] Offer health
- [x] Dashboard alerts
- [x] Views and clicks
- [x] Conversion rate
- [ ] Restrict redemption analytics to the current business’s offers
- [ ] Notification Center
- [ ] Reports polish
- [ ] Export tools

## Customer Dashboard

- [x] Modular loader
- [x] Modular content component
- [x] Purchased passes
- [x] Saved deals
- [x] Available deals
- [x] Redemption state
- [ ] Digital pass polish
- [ ] Savings tracker
- [ ] Nearby businesses
- [ ] Redemption history improvements
- [ ] Customer notifications
- [ ] Favorites and recommendations

## Organization Dashboard

- [x] Modular loader
- [x] Modular content component
- [x] Campaign summary
- [x] Campaign reporting
- [x] Campaign metrics
- [x] Seller tracking
- [x] Campaign actions
- [x] Campaign creation
- [ ] Campaign editing
- [ ] Seller-management tools
- [ ] Notification Center
- [ ] Exportable reports
- [ ] Payout reporting

## Admin Dashboard

- [x] Modular loader
- [x] Modular content shell
- [x] Admin overview
- [ ] Business management
- [ ] Organization management
- [ ] Customer management
- [ ] Offer moderation
- [ ] Campaign moderation
- [ ] Account suspension
- [ ] Platform reports
- [ ] Support permissions

## Route Refactor

- [x] Extract dashboard sections
- [x] Extract dashboard content components
- [x] Extract dashboard loaders
- [x] Replace the legacy dashboard route
- [x] Keep each migration commit independently buildable
- [x] Verify changes with GitHub Actions

---

# Phase 3 — Demo and Environment Infrastructure

Status: **Partially complete**

## Demo Experience

- [x] Define `APP_MODE` strategy
- [x] Add demo-mode detection
- [x] Add demo banner
- [x] Add “Build My RaiseHub” CTA
- [x] Preserve production behavior
- [x] Document the demo experience
- [ ] Add designated demo business
- [ ] Add designated demo organization
- [ ] Add designated demo customer
- [ ] Add demo campaign content
- [ ] Add demo offer content
- [ ] Add demo workspace mappings
- [ ] Tag demo records
- [ ] Hide demo records from production users
- [ ] Add resettable demo state

**Architecture note:** Demo launcher roles (Customer / Business / Organization) currently represent distinct demo experiences implemented as separate accounts. They do not reflect the final one-user/multiple-memberships authorization model. Multi-role memberships and customer entitlements will be implemented in a separate foundational PR.

## Environment Separation

- [ ] Create a separate development Supabase project or branch
- [ ] Stop local development from writing to production data
- [ ] Track environment-specific configuration
- [ ] Add documented database migration workflow
- [ ] Add seed-data workflow
- [ ] Add staging deployment
- [ ] Add production data cleanup plan

Current deployment:

```text
raisehub.vercel.app
```

---

# Next Major Initiative

Following completion of the current documentation and architectural foundation, development will focus on the Multi-Role Foundation.

Primary objectives include:

- One authenticated identity per person
- Membership-based authorization
- Customer entitlements
- Workspace switching
- Capability-based authorization services
- Owner-managed demo platform
- Backward-compatible migration away from legacy profile roles

This initiative forms the architectural bridge between the current dashboard-based platform and the long-term RaiseHub vision.

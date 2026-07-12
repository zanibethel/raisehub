# RaiseHub Owner Platform

**Last updated:** July 2026

This document defines the purpose, security model, and development direction of the RaiseHub Owner Platform Console.

The Owner Platform Console is not a normal customer-facing dashboard.

It is RaiseHub’s internal operating system for managing the platform, previewing role experiences, supporting clients, and reviewing activity.

---

# 1. Purpose

The Owner Platform Console should allow an approved owner to:

- Monitor RaiseHub
- Preview role experiences
- Search businesses, organizations, and customers
- Open client workspaces
- Diagnose account issues
- Assist clients when requested
- Review platform activity
- Review support history
- Manage future platform settings
- Monitor revenue and system health

The owner account should remain permanently authenticated as an owner.

It should never need to change its saved role to use another dashboard experience.

---

# 2. Core Model

RaiseHub separates identity, authorization, and account context.

    Actor
    ↓
    Role
    ↓
    Workspace
    ↓
    Support Mode
    ↓
    Resource
    ↓
    Audit

## Actor

The authenticated user performing an action.

Example:

    RaiseHub owner account

## Role

The actor’s authorization level.

Current roles:

    customer
    business
    organization
    admin
    owner

## Workspace

The account context currently being viewed.

Examples:

- Elysian Hair Salon
- A school fundraiser
- A customer account
- A designated demo business

## Subject

The account represented by the selected workspace.

For standard users:

    Actor ID = Subject ID

For owner support:

    Actor ID ≠ Subject ID

## Support Mode

The level of access the owner currently has inside the selected workspace.

Initial modes:

    Read-only
    Assisted editing

## Resource

The specific item being viewed or changed.

Examples:

- Profile
- Offer
- Campaign
- Redemption
- Purchase
- Support note

## Audit

The permanent record of an owner-assisted action.

---

# 3. Permanent Owner Identity

The owner’s profile role should remain:

    owner

It should not be changed to:

    customer
    business
    organization
    admin

Role switching is not the same as workspace switching.

## Why Permanent Identity Matters

Changing the saved role could affect:

- RLS policies
- Role redirects
- Account ownership
- Onboarding state
- Records created under the account
- Billing behavior
- Email automation
- Audit history
- Future subscription entitlements

The owner should always remain visibly and technically identifiable as the actor.

---

# 4. Platform Console Areas

The long-term Platform Console may include:

## Platform Overview

- Account totals
- Active campaigns
- Active offers
- Recent purchases
- Redemption activity
- Platform alerts
- Onboarding status
- System health

## Workspaces

- Businesses
- Organizations
- Customers
- Demo accounts
- Recent workspaces
- Favorite workspaces

## Support

- Read-only account view
- Assisted editing
- Support notes
- Client-request history
- Escalations
- Account corrections

## Audit

- Owner actions
- Affected workspaces
- Resource changes
- Support reasons
- Before and after values
- Timestamps

## Revenue

- Gross campaign volume
- Platform fees
- Subscription revenue
- Refunds
- Payouts
- Revenue trends

## Platform Settings

- Feature flags
- Offer limits
- Role permissions
- Support permissions
- Platform-wide configuration

## Search

- Businesses
- Organizations
- Customers
- Campaigns
- Offers
- Support notes
- Audit events

---

# 5. Workspace System

A workspace represents an account context.

Supported workspace roles:

    business
    organization
    customer

Admin and owner are platform experiences rather than client workspaces.

## Workspace Data

A workspace model should include at least:

- Workspace ID
- Display name
- Workspace role
- Subtitle
- Status
- Demo or live designation
- Recent activity
- Optional support indicators

## Workspace Navigation

Opening a workspace should not change the authenticated user.

The selected workspace may be represented in URL state:

    /dashboard?workspaceId=<id>&workspaceRole=business

URL state should be validated server-side.

The role supplied in the URL must never be trusted without checking the selected profile.

---

# 6. Demo Preview

Demo preview is for testing product experiences safely.

A preview should:

- Preserve the owner identity
- Use a designated demo account
- Clearly display preview status
- Avoid accidental live-data edits
- Keep demo and live data distinguishable
- Support role-specific testing
- Support URL refresh and browser navigation

Example:

    OWNER PREVIEW MODE
    Viewing Demo Business
    Changes disabled

## Preview Roles

Initial preview roles:

- Customer
- Business
- Organization
- Admin

Admin preview may render a platform admin experience without resolving a client workspace.

## Preview Mappings

Designated preview profiles may be stored in:

    owner_preview_profiles

A mapping should associate:

- Owner account
- Preview role
- Subject profile

The platform must verify that the subject profile’s actual role matches the requested preview role.

---

# 7. Live Client Support

Live client support is different from demo preview.

It should allow the owner to select a real business, organization, or customer account.

## Default Support State

Live client workspaces should open read-only.

Example:

    OWNER SUPPORT MODE
    Viewing Elysian Hair Salon
    Read-only

Read-only mode may allow:

- Viewing profile details
- Viewing offers
- Viewing campaigns
- Viewing redemptions
- Viewing analytics
- Viewing account state
- Diagnosing client problems

It should not allow writes.

---

# 8. Assisted Editing

Assisted editing is for cases where a client requests help or cannot complete a task.

Examples:

- Correcting profile information
- Updating an offer description
- Fixing an offer date
- Helping publish an offer
- Correcting campaign text
- Assisting with onboarding

## Activation

Assisted editing must be explicitly enabled.

Example action:

    Enable assisted editing

The interface must clearly warn:

    Changes will affect the live client account.

## Required Reason

The owner should provide a support reason.

Example:

    Client requested help correcting the offer expiration date.

The reason should be written to the audit log.

## Session Scope

Assisted editing should apply only to:

- The selected workspace
- The current support session
- Approved actions

It should not become a permanent global bypass.

---

# 9. High-Risk Actions

Some actions require stronger controls.

Examples:

- Deleting records
- Archiving campaigns
- Changing campaign prices
- Changing payout information
- Suspending accounts
- Changing account roles
- Transferring ownership
- Issuing refunds
- Editing payment records
- Sending bulk emails
- Changing platform entitlements

These actions may require:

- A second confirmation
- Re-entering a reason
- Additional owner permissions
- A typed confirmation
- Stronger audit details
- Temporary restriction until a later platform phase

Financial and ownership actions should not be enabled merely because general assisted editing is enabled.

---

# 10. Authorization

Owner access must be verified server-side.

Never rely only on:

- Hidden buttons
- Client-side state
- URL parameters
- Dashboard routing
- Visual banners

## Owner Read Checks

Before loading another account’s private data:

1. Authenticate the actor.
2. Load the actor profile.
3. Verify the actor role is `owner` or another approved internal role.
4. Validate the selected workspace ID.
5. Load the subject profile.
6. Verify the subject role.
7. Confirm the requested data belongs to the subject.

## Assisted Write Checks

Before an owner-assisted write:

1. Authenticate the actor.
2. Verify owner capability.
3. Verify assisted-editing mode.
4. Verify the subject workspace.
5. Verify the resource belongs to the workspace.
6. Verify the action is permitted.
7. Require a support reason when applicable.
8. Perform the write.
9. Record the audit event.

RLS should remain enabled.

Application authorization and RLS should reinforce each other.

---

# 11. Capability Model

The platform should eventually support granular internal capabilities.

Possible capabilities:

    owner.accounts.view
    owner.accounts.assist
    owner.customers.view
    owner.businesses.view
    owner.organizations.view
    owner.offers.manage
    owner.campaigns.manage
    owner.financials.view
    owner.financials.modify
    owner.users.suspend
    owner.audit.view
    owner.settings.manage

Early in development, approved owners may hold all capabilities.

The model should still be designed so future support staff can receive limited access.

---

# 12. Audit Logging

Every owner-assisted write should create an audit record.

The current audit foundation uses:

    owner_action_logs

Recommended fields:

- `actor_user_id`
- `subject_user_id`
- `action`
- `resource_type`
- `resource_id`
- `before_data`
- `after_data`
- `reason`
- `created_at`

## Audit Principles

Audit history should be:

- Append-only from the application perspective
- Searchable
- Filterable by actor
- Filterable by subject
- Filterable by workspace
- Filterable by action
- Filterable by resource
- Timestamped
- Difficult to alter silently

## Client Visibility

The first version may keep audit history owner-only.

A later version may show appropriate support history to clients.

Example:

    RaiseHub Support updated “Summer Hair Special”
    July 11, 2026 at 3:42 PM

Sensitive internal notes should remain private.

---

# 13. Support Notes

Support notes act as an internal CRM timeline.

Examples:

- Needs help uploading logo
- Requested offer redesign
- Waiting for updated campaign details
- Assisted with first offer publication
- Follow up next week

Support notes should be:

- Visible only to authorized internal users
- Associated with a workspace
- Timestamped
- Associated with the note author
- Searchable
- Separate from public client content
- Separate from audit records

## Support Notes Versus Audit Logs

Support notes describe context and follow-up.

Audit logs record system actions.

Example support note:

    Client asked for help improving the offer headline.

Example audit log:

    Owner changed offer.title from “Hair Deal” to “20% Off Any Hair Service”.

Both may refer to the same support session, but they serve different purposes.

---

# 14. Recent and Favorite Workspaces

The Platform Console should make frequent support work fast.

## Recent Workspaces

Recent workspaces may track:

- Workspace ID
- Actor ID
- Last opened time
- Last support mode
- Optional last action

## Favorite Workspaces

Favorites allow owners to pin important accounts.

Examples:

- Elysian Hair Salon
- Demo Business
- Demo Organization
- Early launch partners

Recent and favorite state should be user-specific.

---

# 15. Global Search

Global search should eventually support:

- Businesses
- Organizations
- Customers
- Campaigns
- Offers
- Support notes
- Audit activity

Potential shortcut:

    Command + K
    Control + K

Search results should provide clear actions.

Example:

    Elysian Hair Salon
    Open Workspace
    View Offers
    Enter Support Mode

Global search must respect internal permissions.

---

# 16. Platform Components

General Platform Console components belong under:

    src/components/platform/

Examples:

    workspace-card.tsx
    workspace-selector.tsx
    workspace-search.tsx
    support-banner.tsx
    workspace-header.tsx
    recent-workspaces.tsx
    support-notes.tsx
    audit-timeline.tsx

Owner route composition may remain under:

    src/components/dashboards/owner/

Examples:

    owner-dashboard.tsx
    owner-dashboard-content.tsx
    sections/

---

# 17. Data Architecture

Preferred flow:

    Owner Dashboard Loader
    ↓
    Platform Service
    ↓
    Repository
    ↓
    Supabase

## Repository

Responsible for:

- Workspace profile queries
- Support-note queries
- Audit-log queries
- Recent-workspace queries
- Approved writes

## Service

Responsible for:

- Owner authorization
- Workspace mapping
- Sorting and filtering
- Demo versus live handling
- Permission checks
- Assisted-editing coordination
- Audit coordination

## UI

Responsible for:

- Display
- Selection
- Explicit mode activation
- Confirmation prompts
- Navigation
- Clear support banners

---

# 18. Database Foundations

Current platform-support foundations include:

    owner_preview_profiles
    owner_action_logs

RLS is enabled.

Before live support editing is considered complete, the platform still needs:

- Verified owner-only policies
- Repository access
- Service authorization
- Assisted-editing checks
- Audit integration
- Runtime testing

Table creation alone does not mean the feature is ready.

---

# 19. Environment Safety

Local development and production currently share the same Supabase project.

This creates major risk for Platform Console testing.

Until environment separation exists:

- Treat local writes as production writes.
- Prefer designated demo workspaces.
- Avoid destructive support testing.
- Avoid financial-impact testing.
- Clearly identify live accounts.
- Keep support mode read-only by default.
- Do not test unrestricted assisted editing against real clients.

Future target:

    Development Supabase
    Staging Supabase
    Production Supabase

---

# 20. Current Implementation Status

## Complete

- Permanent owner role
- Owner route
- Owner Platform Console shell
- Platform overview
- Role preview switcher
- Workspace card
- Workspace selector
- Workspace service
- Workspace repository
- Preview mapping table
- Action-log table
- RLS enabled on support tables

## In Progress

- Connecting workspace service to repository
- Verifying real profile schema fields
- Loading live workspaces into the console
- Owner-only workspace authorization

## Not Yet Enabled

- Live workspace rendering
- Read-only client account view
- Assisted editing
- Support notes
- Connected audit timeline
- Recent workspaces
- Favorites
- Global search
- Platform revenue
- Platform settings

---

# 21. Required Build Order

Continue dependency-first.

Recommended order:

1. Verify the real `profiles` schema.
2. Correct the workspace repository.
3. Refactor the workspace service to use the repository.
4. Pass workspaces into the owner loader.
5. Render the live workspace selector.
6. Add owner-only workspace resolution.
7. Add selected-workspace view.
8. Add support banner.
9. Add read-only support mode.
10. Add audit repository and service.
11. Add assisted-editing controls.
12. Add support notes.
13. Add recent and favorite workspaces.
14. Add global search.

---

# 22. Non-Negotiable Principles

- Owner identity never changes.
- Roles define authorization.
- Workspaces define account context.
- Actor and subject remain distinct.
- Support begins read-only.
- Assisted editing is explicit.
- Audit logging is mandatory.
- Financial and destructive actions require stronger controls.
- URL parameters are never trusted without server validation.
- RLS remains enabled.
- Platform access is verified server-side.
- Demo and live data must become clearly separated.
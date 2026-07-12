# RaiseHub Owner Workflow

**Last updated:** July 2026

This document defines how the RaiseHub Owner Platform works.

It is the operational guide for the platform owner and any AI assistant working on owner functionality.

The owner platform is **not** an administrator dashboard.

It is RaiseHub's internal operating system.

---

# 1. Purpose

The Owner Platform exists to:

- Monitor overall platform health.
- Support customers, businesses, and organizations.
- Preview every role.
- Troubleshoot client issues.
- Review analytics.
- Manage platform growth.
- Safely assist clients.
- Maintain audit history.

The owner account should never become an ordinary client account.

---

# 2. Core Identity Model

RaiseHub distinguishes:

    Actor
    ↓
    Workspace
    ↓
    Subject
    ↓
    Resource

## Actor

The authenticated user performing the action.

Current owner:

    owner

The actor never changes during workspace switching.

---

## Workspace

The currently selected client account.

Supported workspace roles:

    Customer
    Business
    Organization

Owner and Admin are not client workspaces.

---

## Subject

The client represented by the workspace.

Examples:

- Business owner
- Customer
- Organization

The subject changes as workspaces change.

---

## Resource

The actual record being viewed.

Examples:

- Offer
- Campaign
- Purchase
- Redemption
- Profile

Resources always belong to the selected workspace.

---

# 3. Workspace Browser

The workspace browser is the owner's primary navigation.

Capabilities:

- Search
- Filter by role
- View account health
- View onboarding progress
- View subscription
- View contact information
- Open workspace
- Enter support mode

Future additions:

- Last login
- Active campaigns
- Active offers
- Revenue
- Stripe status
- AI alerts
- Fraud indicators

---

# 4. Workspace Card

Each workspace card should provide enough information to determine account health without opening the workspace.

Current information:

- Name
- Role
- Subscription
- Setup progress
- Missing setup items
- Contact information
- Status
- Open Workspace
- Support Mode

Future information:

- Active campaigns
- Active offers
- Monthly revenue
- Recent activity
- Outstanding alerts
- AI recommendations

---

# 5. Workspace Preview

Selecting **Open Workspace** enters preview mode.

Purpose:

- Navigate the client experience.
- Validate UI.
- Test navigation.
- Review dashboard layout.

Preview mode should preserve:

- Owner authentication
- Owner permissions
- Owner audit identity

Preview mode does **not** imply edit access.

---

# 6. Read-Only Support

Selecting **Support Mode** opens a protected support session.

Capabilities:

- Review profile
- Review campaigns
- Review offers
- Review purchases
- Review passes
- Review redemptions
- Review analytics

Restrictions:

- No edits
- No deletes
- No financial changes
- No ownership changes
- No role changes

This mode is intended for troubleshooting and customer assistance.

---

# 7. Assisted Editing

Assisted editing is **not yet enabled**.

Before implementation, every edit must satisfy:

- Owner authorization
- Valid workspace
- Valid resource
- Explicit edit mode
- Support reason
- Audit logging
- Permission checks

Assisted editing should remain intentionally slower than read-only support to reduce accidental changes.

---

# 8. Support Session

Future support sessions should follow this lifecycle:

    Select Workspace
        ↓
    Read-Only Review
        ↓
    Enable Assisted Editing
        ↓
    Enter Support Reason
        ↓
    Perform Approved Changes
        ↓
    Save Audit Log
        ↓
    Return to Read-Only
        ↓
    Exit Workspace

Support sessions should have a clear beginning and end.

---

# 9. Audit Requirements

Every assisted edit should capture:

- Actor ID
- Subject ID
- Workspace ID
- Resource Type
- Resource ID
- Before State
- After State
- Support Reason
- Timestamp

Audit records should be append-only.

Audit history should never be editable through the application.

---

# 10. Future Owner Capabilities

The Owner Platform is expected to evolve into a full operational console.

Potential modules:

Platform Health

- Active users
- Revenue
- Growth
- Errors

Business Support

- Offers
- Analytics
- Subscriptions

Organization Support

- Campaigns
- Sellers
- Earnings

Customer Support

- Passes
- Purchases
- Redemptions

Platform Administration

- Feature flags
- Pricing
- Announcements
- Support notes

AI Assistance

- Health recommendations
- Growth suggestions
- Missing setup detection
- Offer quality analysis

---

# 11. Workflow Principles

The Owner Platform should always:

- Preserve owner identity.
- Validate workspace context.
- Respect RLS.
- Default to read-only.
- Require explicit escalation for edits.
- Log sensitive actions.
- Separate support from administration.

---

# 12. Current Implementation Status

## Completed Foundation

- Permanent owner identity
- Workspace browser
- Workspace search
- Role filtering
- Workspace cards
- Setup progress
- Contact information
- Workspace preview
- Read-only support foundation
- URL workspace validation

## In Progress

- Role-specific read-only repositories
- Business support data
- Organization support data
- Customer support data

## Planned

- Audit repository
- Support notes
- Assisted editing
- Session timeline
- Owner analytics
- AI recommendations
- Feature flags
- Environment separation

---

# 13. Success Criteria

The Owner Platform succeeds when an owner can:

- Find any client in seconds.
- Understand account health immediately.
- Troubleshoot without logging in as the client.
- Safely assist when necessary.
- Leave a complete audit trail.
- Return to the platform dashboard without changing identity.

The owner should always remain the owner.

Workspace switching changes context—not identity.
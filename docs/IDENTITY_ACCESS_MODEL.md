# RaiseHub Identity and Access Model

**Version:** 2.0  
**Status:** Approved architecture direction  
**Last updated:** July 2026

This document defines the long-term identity, authorization, membership, entitlement, workspace, and capability model for RaiseHub.

It is the source of truth for multi-role account architecture.

This document complements:

- `ARCHITECTURE_PRINCIPLES.md`
- `docs/ARCHITECTURE.md`
- `docs/SUPABASE_STANDARDS.md`
- `docs/OWNER_PLATFORM.md`
- `docs/AI_DEVELOPMENT_GUIDE.md`

It does not replace those documents.

---

# 1. Core Principle

RaiseHub uses:

**One person → one authentication identity → many capabilities**

A person should not need a second RaiseHub account or a second email address simply because they participate in RaiseHub in another way.

One authenticated person may simultaneously be:

- A customer with an active or expired pass
- A seller for one or more organizations
- An organization administrator
- A business owner
- A business manager or staff member
- A viewer in another business or organization
- A platform owner

Authentication answers:

**Who is this person?**

Authorization answers:

**What may this person access or do?**

Capabilities come from verified relationships and entitlements.

They do not come from a single permanent profile role.

---

# 2. Terminology

RaiseHub uses the following terms consistently.

## Identity

The authenticated person.

The identity is represented by:

- One Supabase Auth user
- One matching personal profile

## Entity

A business, organization, campaign, or other platform resource that exists independently of a person.

Examples:

- A salon
- A school
- A football team
- A fundraiser campaign

## Membership

A relationship between a person and an entity.

Examples:

- Business owner
- Business manager
- Organization admin
- Organization seller

## Entitlement

A time-limited or rule-limited right to use a benefit.

Examples:

- Active customer pass
- Trial
- Complimentary access

## Workspace

The current context a person is viewing.

Examples:

- My Pass
- My Fundraising
- Roosevelt Football
- Perez Auto Detail
- Owner Platform

## Capability

A permission verified on the server.

Examples:

- View a business
- Manage an organization
- Sell for a campaign
- Redeem an offer
- Access Owner Platform

---

# 3. Identity

Each person has one Supabase Auth user.

The matching `profiles` row represents the person.

A profile may contain personal information such as:

- Display name
- Full name
- Email
- Avatar
- Phone
- Accessibility preferences
- Notification preferences
- Last selected workspace
- Personal account settings

A profile must not be treated as:

- The business itself
- The organization itself
- A customer pass
- A seller assignment
- A campaign membership

Those are separate records and relationships.

One person must not need duplicate profiles merely to access multiple areas of RaiseHub.

---

# 4. Existing Legacy Role

The existing `profiles.role` field is legacy application infrastructure.

It currently supports:

- Existing dashboard routing
- Existing onboarding
- Existing profile assumptions
- Existing role-specific UI
- Existing demo behavior

During migration:

- Do not remove it immediately
- Do not rename it without coordinated application changes
- Do not make it nullable without coordinated application changes
- Do not use it as the foundation of new multi-role features
- Preserve it as a compatibility field until affected routes and actions have migrated

New authorization should use:

- Memberships
- Entitlements
- Verified platform permissions
- Capability checks

The legacy role may later become:

- A default experience hint
- A migration compatibility field
- A deprecated field
- A removable field after complete verification

It must not remain the only source of authorization.

---

# 5. Businesses Are Entities

A business is not an authentication user.

A business is an entity that users may belong to.

Recommended entity:

    businesses

A business may have:

- One or more owners
- Managers
- Staff
- View-only users
- Offers
- Locations
- Subscription information
- Analytics
- Redemption settings
- Contact details
- Branding
- Activity history

Users access businesses through memberships.

Recommended relationship:

    business_memberships

Recommended membership roles:

- owner
- manager
- staff
- viewer

A person may belong to multiple businesses.

A business may have multiple users.

Business ownership must not require the owner to create a second account.

---

# 6. Business Membership Capabilities

Suggested capability expectations:

## owner

May:

- View the business
- Edit business details
- Manage offers
- View analytics
- Manage staff
- Manage subscription settings
- Transfer ownership through an approved high-risk workflow

## manager

May:

- View the business
- Edit approved business details
- Manage offers
- View analytics
- Manage selected staff actions

May not:

- Transfer ownership
- Change protected billing or ownership settings unless explicitly allowed

## staff

May:

- View assigned business areas
- Perform approved operational tasks
- Support redemptions or offer workflows

May not:

- Manage ownership
- Manage billing
- Manage high-risk settings

## viewer

May:

- View approved business information
- View approved reports

May not perform writes.

Exact capability rules should be implemented through reusable server-side checks rather than duplicated role comparisons throughout the UI.

---

# 7. Organizations Are Entities

An organization is not an authentication user.

Organizations may include:

- Schools
- Sports teams
- Booster clubs
- Churches
- Nonprofits
- Clubs
- Community groups
- Fundraising teams

Recommended entity:

    organizations

Users access organizations through memberships.

Recommended relationship:

    organization_memberships

Recommended membership roles:

- admin
- manager
- seller
- viewer

A person may belong to multiple organizations.

An organization may have multiple administrators, managers, sellers, and viewers.

---

# 8. Organization Membership Capabilities

## admin

May:

- View the organization
- Edit organization details
- Create campaigns
- Manage campaigns
- Invite or remove members
- Assign membership roles
- View organization-wide progress
- View seller performance
- Manage approved fundraising settings

## manager

May:

- View the organization
- Manage approved campaigns
- View organization-wide progress
- View seller performance
- Manage assigned members or campaign participation

May not:

- Transfer organization ownership
- Perform protected financial changes unless explicitly allowed

## seller

May:

- View organization progress
- View assigned campaigns
- View personal sales
- View personal amount raised
- Access personal referral links
- Access personal QR codes
- View personal goals and milestones

May not:

- Create organization campaigns
- Edit organization settings
- Manage other sellers
- Change payout details
- Change ownership

## viewer

May:

- View approved organization information
- View approved progress summaries

May not perform management actions.

---

# 9. Sellers Are Organization Members

Seller is not a permanent platform-wide identity role.

A seller is a user participating under an organization.

Example:

Theo may be:

- A normal authenticated user
- A seller for Roosevelt Football
- A customer when his pass is active
- A future business owner

Theo should use one email address and one login.

His seller access comes from an active organization membership.

A seller may receive:

- Personal fundraising dashboard
- Personal referral link
- Personal QR code
- Personal sales totals
- Amount raised
- Passes sold
- Personal goal
- Organization-wide progress
- Seller ranking when enabled
- Assigned campaigns
- Personal milestones
- Campaign announcements

Seller access must remain available even when customer access expires.

---

# 10. Campaign Participation

Organization membership and campaign participation are related but distinct.

A seller may belong to an organization without participating in every campaign.

Recommended relationship:

    campaign_memberships

A campaign membership may contain:

- id
- campaign_id
- organization_membership_id
- referral_code
- personal_goal
- status
- joined_at
- disabled_at
- created_at
- updated_at

Purchases attributed to a seller should record a durable seller or campaign-membership reference.

Do not rely only on:

- Browser cookies
- Temporary query parameters
- Session-only state
- Display names

The system must support calculation of:

- Organization-wide progress
- Campaign-wide progress
- Individual seller progress
- Passes sold by seller
- Revenue attributed to a seller
- Revenue not attributed to a specific seller
- Seller rankings when enabled
- Historical seller attribution after membership changes

---

# 11. Customer Access Is an Entitlement

Customer access is not a permanent identity role.

Customer benefits come from an entitlement.

Recommended relationship:

    customer_entitlements

An entitlement may be created by:

- A pass purchase
- A promotional grant
- An owner-approved complimentary pass
- A trial
- A replacement or support action

Recommended entitlement fields:

- id
- user_id
- purchase_id
- entitlement_type
- starts_at
- expires_at
- status
- granted_by
- created_at
- updated_at
- revoked_at

Customer access is active only when the entitlement is valid according to deterministic rules.

When a customer entitlement expires:

- The user can still log in
- Business memberships remain accessible
- Organization memberships remain accessible
- Seller dashboards remain accessible
- Account history remains accessible
- Purchase history remains accessible
- Customer-only benefits become unavailable
- Customer-only redemptions become unavailable
- Renewal options may be displayed

An expired entitlement no longer grants active customer benefits.

The entitlement record must remain preserved for:

- Purchase history
- Auditing
- Customer support
- Analytics
- Renewal logic

Expiration never removes:

- The person's identity
- Business memberships
- Organization memberships
- Seller participation
- Historical activity

---

# 12. Entitlement Status

Recommended entitlement statuses may include:

- pending
- active
- expired
- revoked
- replaced
- cancelled

Status must not be trusted by itself when time rules also apply.

Active benefit checks should evaluate:

- Current status
- Start time
- Expiration time
- Revocation state
- Source purchase state when applicable

The rule must be deterministic and reusable.

Do not independently recreate entitlement logic in multiple UI components.

---

# 13. Multiple Simultaneous Capabilities

A user may have several valid access paths at once.

Example:

    Person: Theo Perez

    Customer entitlement:
    - Expired

    Organization memberships:
    - Roosevelt Football — seller
    - School Booster Club — viewer

    Business memberships:
    - Theo's Lawn Care — owner

Theo should still access:

- Roosevelt Football seller progress
- Booster Club viewer content
- Theo's Lawn Care business dashboard

Theo should not access active customer benefits until a new entitlement is granted.

This is the intended model.

The user should never need to sign out and create another account to gain an additional capability.

---

# 14. Workspace Context

A workspace is the entity or experience currently being viewed.

Possible workspace types include:

- Personal account
- Customer pass
- Business
- Organization
- Seller fundraising
- Owner platform

Selecting a workspace changes context.

It does not change authentication identity.

Recommended navigation may include:

- My Pass
- My Fundraising
- My Organizations
- My Businesses
- Owner Platform

A last-selected workspace may be saved as a preference.

Recommended relationship:

    user_preferences

Possible fields:

- user_id
- active_context_type
- active_context_id
- updated_at

Saved workspace context is convenience only.

It is not authorization.

Every request must verify access again on the server.

---

# 15. Unified User Experience

The user should not need to understand internal terms such as:

- Entitlement
- Membership record
- Workspace authorization
- Relationship table
- Capability service

The interface should use clear labels such as:

- My Pass
- My Fundraising
- My Organizations
- My Businesses
- Switch Experience

The system should avoid asking users to:

- Register again
- Use another email
- Sign out to change roles
- Re-enter the same personal information
- Maintain duplicate profiles

The platform should make multi-role access feel natural.

---

# 16. Authorization Rules

Client-side visibility is not security.

Hiding a button does not prevent an unauthorized action.

Every protected:

- Route
- Loader
- Service
- Server action
- Route handler
- Repository method
- Database query

must verify the relevant relationship.

Examples:

Customer benefit access requires:

- A valid active customer entitlement

Business management requires:

- An active business membership
- A membership role allowed to perform the requested action

Organization campaign creation requires:

- An active organization membership
- An admin or manager role

Seller progress access requires:

- An active organization membership
- Valid campaign participation when campaign-specific

Owner Platform access requires:

- Verified platform owner authorization

Authorization must not trust:

- A role supplied by the client
- A workspace ID supplied by the browser
- A hidden or disabled control
- User-editable metadata
- A route name
- A query-string role
- A selected dashboard context
- A client-supplied actor user ID

---

# 17. Authenticated Actor

Capability helpers operate on a verified authenticated actor.

The authenticated actor ID must always be resolved from the trusted server session at the request boundary.

Clients must never choose the actor `userId` used for authorization.

Repository and service helpers may accept a verified actor ID only after authentication has already occurred.

This prevents privilege escalation through client-supplied identifiers.

---

# 18. Capability-Based Helpers

Application code should move toward explicit capability checks.

Examples:

    canAccessCustomerBenefits(userId)

    canViewBusiness(userId, businessId)

    canManageBusiness(userId, businessId)

    canViewOrganization(userId, organizationId)

    canManageOrganization(userId, organizationId)

    canSellForCampaign(userId, campaignId)

    canViewSellerProgress(userId, campaignMembershipId)

    canAccessOwnerPlatform(userId)

Capability helpers should:

- Run server-side
- Return deterministic results
- Use verified database relationships
- Avoid depending solely on `profiles.role`
- Be reusable across loaders, services, and actions
- Distinguish view access from management access
- Provide clear denial reasons where useful
- Avoid trusting client-supplied actor IDs
- Return typed results

Recommended result shape:

    {
      allowed: boolean
      reason?: string
      capability?: string
      workspaceId?: string
    }

The exact shape may evolve, but capability checks should remain predictable and reusable.

---

# 19. Recommended Database Direction

The target model includes:

    profiles

    businesses
    business_memberships

    organizations
    organization_memberships

    campaign_memberships

    customer_entitlements

    user_preferences

Existing campaign, purchase, offer, pass, and redemption tables must be inspected before finalizing foreign keys.

Do not guess existing column names or relationships.

All schema work must be based on:

- The live schema
- Existing repository usage
- Current RLS
- Current foreign keys
- Current production data
- Existing Supabase types

If an equivalent table already exists, reuse or extend it rather than creating a duplicate.

---

# 20. Migration Strategy

The migration must be additive and backward compatible.

Preferred sequence:

1. Inspect the current schema and authorization model.
2. Add new entity and relationship tables.
3. Add indexes, constraints, and RLS.
4. Generate updated Supabase types.
5. Add repository modules.
6. Add capability services.
7. Backfill relationships from existing profiles.
8. Migrate business dashboard reads.
9. Migrate organization dashboard reads.
10. Add seller dashboards and campaign attribution.
11. Migrate customer access to entitlements.
12. Add unified workspace navigation.
13. Remove legacy role dependencies only after verification.

Do not begin by deleting or renaming existing profile fields.

Do not perform a destructive cutover before new paths are connected and tested.

---

# 21. Backfill Strategy

Backfills must be deliberate.

Before backfilling:

- Inspect current profile data
- Identify business profiles
- Identify organization profiles
- Identify customer profiles
- Identify owner profiles
- Identify duplicate or ambiguous records
- Verify existing relationships
- Define selection criteria

Backfill work must document:

- Selection criteria
- Duplicate handling
- Unmapped records
- Recovery strategy
- Verification counts
- Affected users
- Assumptions

Do not hardcode generated user IDs into migrations.

---

# 22. Row Level Security

RLS must remain enabled on all exposed tables.

Policies should enforce the relationship appropriate to each table.

Examples:

A business member may view a business only when an active membership exists.

A business manager may update approved business data only when their membership permits management.

An organization seller may view their assigned campaign participation and permitted organization totals.

A customer may view their own entitlements.

Users may not:

- Assign themselves elevated membership roles
- Create active entitlements for themselves
- Modify unrelated memberships
- Change protected ownership fields
- Escalate roles through client requests

Owner-only operations must verify platform owner authorization server-side.

RLS and application authorization should reinforce each other.

Neither should be treated as a substitute for the other.

---

# 23. Table Privileges

RLS policies do not replace Postgres table privileges.

Every new table must grant only the privileges required by the intended role.

Examples:

- `authenticated` may need SELECT on membership tables
- UPDATE should be granted only when the application requires direct client writes
- INSERT should not be granted broadly for privileged relationships
- DELETE should be avoided when soft removal is preferred
- `anon` should not receive access to protected membership or entitlement tables

Prefer server-side actions for privileged writes.

---

# 24. Membership Lifecycle

Membership status should be explicit.

Recommended statuses:

- invited
- active
- suspended
- removed

Removing or suspending a membership should not delete the user.

Historical activity should remain attributable after membership removal.

Role changes should be auditable.

High-risk ownership changes should require stronger confirmation.

A membership may include:

- invited_by
- invited_at
- accepted_at
- suspended_at
- removed_at
- removal_reason
- created_at
- updated_at

Exact fields should be finalized after schema inspection.

---

# 25. Invitations

Membership invitations should eventually support:

- Existing RaiseHub users
- New users without an account
- Email invitation
- Invite link or code
- Expiration
- Revocation
- Accepted timestamp
- Inviting user
- Intended membership role
- Intended business or organization

Accepting an invitation should attach the membership to the existing authenticated identity whenever the verified invitation matches.

It should not require creating a second account.

Invitation acceptance must validate:

- Invite validity
- Expiration
- Revocation state
- Target entity
- Intended role
- Authenticated identity

---

# 26. Ownership Changes

Ownership is high risk.

Business and organization ownership changes should require:

- Verified current owner authorization
- Verified target user
- Explicit confirmation
- Audit logging
- Protection against removing the final owner accidentally
- Clear rollback or support path

Ownership should not be changed by editing a generic membership field from the client.

---

# 27. Audit Requirements

The following should be auditable:

- Membership creation
- Membership acceptance
- Membership suspension
- Membership removal
- Membership role changes
- Ownership transfer
- Entitlement grants
- Entitlement revocation
- Owner-assisted changes
- Demo baseline changes
- Manual demo resets

Audit records should distinguish:

- Actor
- Subject
- Workspace
- Resource
- Action
- Reason
- Timestamp

---

# 28. Demo Experiences

Demo launcher choices currently represent separate demo experiences.

They do not represent the final production authorization model.

The public demo may continue offering:

- Customer
- Business
- Organization

The underlying demo architecture may later use:

- Dedicated demo identities
- Demo memberships
- Demo entitlements
- Owner-managed baseline data
- Resettable temporary activity

Owner is never a public demo role.

Demo behavior must not determine production authorization design.

---

# 29. Owner-Managed Demo Baseline

The Owner Dashboard should eventually manage the permanent demo baseline.

The owner should be able to:

- Add demo profiles
- Remove demo profiles
- Update demo profiles
- Enable or disable demo experiences
- Edit baseline profile information
- Manage baseline offers
- Manage baseline campaigns
- Manage baseline notifications
- Save the current state as the approved baseline
- Reset one role
- Reset all roles
- Preview each demo experience

Owner-approved baseline changes must persist.

Ordinary demo-user changes must remain temporary.

Reset behavior may include:

- Nightly reset
- Manual owner reset
- Per-role reset
- Safe logout-triggered reset when no active sessions remain

Logout-triggered reset must not erase another visitor's active demo session.

---

# 30. Demo Data Safety

Demo records must be explicitly identifiable.

Reset operations must:

- Scope only to demo identities and demo-owned records
- Never affect real users
- Never affect the owner account
- Restore the latest owner-approved baseline
- Remove temporary visitor-created records
- Restore modified baseline records
- Restore deleted baseline records
- Restore unread notification states when required

Reset operations must be server-side and protected.

---

# 31. User Experience Requirements

The multi-role system should remain simple for ordinary users.

The platform should provide clear, human-friendly experiences.

Recommended labels:

- My Pass
- My Fundraising
- My Organizations
- My Businesses
- Switch Experience

Avoid exposing internal authorization language in ordinary interfaces.

When a user lacks a capability, explain the next useful action.

Examples:

- Renew your pass
- Ask an organization admin for access
- Accept your invitation
- Contact the business owner
- Switch to an available workspace

---

# 32. Accessibility and Usability

Workspace switching should be:

- Keyboard accessible
- Screen-reader friendly
- Mobile friendly
- Clear about the active context
- Clear about expired or unavailable access
- Consistent across dashboards

Users should always understand:

- Which workspace they are viewing
- What role they hold in that workspace
- What actions are available
- Why an action is unavailable

---

# 33. Security Non-Negotiables

- Never trust the client for authorization.
- Never expose service-role credentials to the browser.
- Never use user-editable metadata as the source of authorization.
- Never let users assign themselves privileged memberships.
- Never let users create active entitlements for themselves.
- Never treat a hidden button as authorization.
- Never treat workspace selection as authorization.
- Never bypass RLS merely to fix a permission error.
- Never perform broad destructive migrations without explicit approval.
- Never remove historical attribution when a membership changes.

---

# 34. Architecture Non-Negotiables

- One person should use one authentication identity.
- Businesses are entities, not users.
- Organizations are entities, not users.
- Seller is an organization relationship, not a permanent platform role.
- Customer benefits are entitlement-based.
- Pass expiration must not remove unrelated access.
- Workspace selection must not change authentication identity.
- Client-selected context is not authorization.
- New schema changes must be additive during migration.
- RLS must remain enabled.
- Authorization must be verified server-side.
- Existing production behavior must remain functional during migration.

---

# 35. Future Roadmap Alignment

The expected sequence is:

1. Multi-role foundation
2. Business entities and memberships
3. Organization entities and memberships
4. Seller and campaign participation
5. Customer entitlements
6. Unified workspace navigation
7. Membership invitations
8. Owner-managed demo profiles
9. Demo reset automation
10. Legacy role retirement

Each phase should be implemented in focused pull requests.

Avoid combining broad schema changes, dashboard redesign, invitations, demo resets, and entitlement cutovers in one PR.

---

# 36. Decision Rule

When choosing between implementations, prefer the option that best supports:

1. One-account usability
2. Clear authorization
3. Safe data ownership
4. Backward-compatible migration
5. Reusable capabilities
6. Simple workspace switching
7. Long-term scalability
8. Auditability
9. User friendliness
10. Maintainability

Do not optimize only for the fastest short-term implementation.

---

# 37. Final Principle

RaiseHub should feel simple even when the underlying authorization model is sophisticated.

Users should experience:

- One login
- Clear workspaces
- Relevant actions
- No duplicate accounts
- No lost access to unrelated capabilities
- Predictable, secure behavior

The system should carry the complexity so the user does not have to.

# RaiseHub Identity and Access Model

**Status:** Approved architecture direction  
**Last updated:** July 2026

This document defines how identity, memberships, entitlements, roles, workspaces, and access should work across RaiseHub.

It is the source of truth for multi-role account architecture.

This document complements:

- `ARCHITECTURE_PRINCIPLES.md`
- `docs/ARCHITECTURE.md`
- `docs/SUPABASE_STANDARDS.md`
- `docs/OWNER_PLATFORM.md`

It does not replace those documents.

---

# 1. Core Principle

RaiseHub uses:

**One person → one authentication identity → many capabilities**

A person should not need a second email address simply because they participate in RaiseHub in another way.

One authenticated user may simultaneously be:

- A customer with an active or expired pass
- A seller for one or more organizations
- An organization administrator
- A business owner
- A business staff member
- A viewer or manager in another workspace
- A platform owner

Authentication answers:

**Who is this person?**

Memberships and entitlements answer:

**What may this person access or do?**

---

# 2. Identity

Each person has one Supabase Auth user.

The matching `profiles` row represents the person.

A profile may contain personal information such as:

- Display name
- Full name
- Email
- Avatar
- Phone
- Personal preferences
- Accessibility preferences
- Last selected workspace

A profile must not be treated as the business, organization, customer pass, or seller assignment.

Those are separate records and relationships.

---

# 3. Existing Legacy Role

The existing `profiles.role` field is legacy application infrastructure.

It currently supports existing routing and dashboard behavior.

During migration:

- Do not remove it immediately
- Do not make it nullable without coordinated application changes
- Do not use it as the foundation of new multi-role features
- Preserve it as a compatibility field until all affected routes and actions have migrated

New authorization should use memberships, entitlements, and verified platform permissions.

The legacy role may later become:

- A default experience hint
- A migration compatibility field
- A deprecated field removed after full verification

It must not remain the only source of authorization.

---

# 4. Businesses Are Entities

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

---

# 5. Organizations Are Entities

An organization is not an authentication user.

Organizations may include:

- Schools
- Teams
- Clubs
- Churches
- Booster clubs
- Nonprofits
- Community groups

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

# 6. Sellers Are Organization Members

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
- Personal sales link
- Personal QR code
- Personal sales totals
- Amount raised
- Passes sold
- Personal goal
- Organization-wide progress
- Seller ranking, when enabled
- Assigned campaigns

Seller access should not permit:

- Creating organization campaigns
- Editing organization settings
- Managing other sellers
- Changing payout information
- Changing organization ownership

Those actions require an organization admin or manager membership.

---

# 7. Campaign Participation

Organization membership and campaign participation are related but distinct.

A seller may belong to an organization without participating in every campaign.

Recommended relationship:

    campaign_memberships

A campaign membership may contain:

- campaign_id
- organization_membership_id
- referral_code
- personal_goal
- status
- joined_at
- disabled_at

Purchases attributed to a seller should record a durable seller or campaign-membership reference.

Do not rely only on browser cookies or temporary query parameters for permanent attribution.

The system must support calculation of:

- Organization-wide progress
- Campaign-wide progress
- Individual seller progress
- Passes sold by seller
- Revenue attributed to seller
- Revenue not attributed to a specific seller

---

# 8. Customer Access Is an Entitlement

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
- revoked_at

Customer access is active only when the entitlement is valid according to deterministic rules.

When a customer pass expires:

- The user can still log in
- Business memberships remain accessible
- Organization memberships remain accessible
- Seller dashboards remain accessible
- Account and purchase history remain accessible
- Customer-only redemption benefits become unavailable
- Renewal options may be displayed

Expiration removes an entitlement.

It does not remove the person’s identity or unrelated memberships.

---

# 9. Multiple Simultaneous Capabilities

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

---

# 10. Workspace Context

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

Saved workspace context is convenience only.

It is not authorization.

Every request must verify access again on the server.

---

# 11. Authorization Rules

Client-side visibility is not security.

Hiding a button does not prevent an unauthorized action.

Every protected loader, service, server action, route handler, and database query must verify the relevant relationship.

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

---

# 12. Capability-Based Helpers

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

---

# 13. Recommended Database Direction

The target model includes:

    profiles

    businesses
    business_memberships

    organizations
    organization_memberships

    campaign_memberships

    customer_entitlements

    user_preferences

Existing campaign, purchase, offer, pass, and redemption tables should be inspected before finalizing foreign keys.

Do not guess existing column names or relationships.

All schema work must be based on the live schema and repository usage.

---

# 14. Migration Strategy

The migration must be additive and backward compatible.

Preferred sequence:

1. Add new entity and relationship tables.
2. Add indexes, constraints, and RLS.
3. Add repository and service helpers.
4. Add capability checks.
5. Backfill relationships from existing profiles.
6. Migrate business dashboard reads.
7. Migrate organization dashboard reads.
8. Add seller dashboards and campaign attribution.
9. Migrate customer access to entitlements.
10. Add unified workspace navigation.
11. Remove legacy role dependencies only after verification.

Do not begin by deleting or renaming existing profile fields.

Do not perform a destructive cutover before new paths are connected and tested.

---

# 15. Row Level Security

RLS must remain enabled on all exposed tables.

Policies should enforce the relationship appropriate to each table.

Examples:

A business member may view a business only when an active membership exists.

A business manager may update approved business data only when their membership permits management.

An organization seller may view their assigned campaign participation and permitted organization totals.

A customer may view their own entitlements.

Users may not assign themselves elevated membership roles.

Users may not create their own active customer entitlements.

Owner-only operations must verify platform owner authorization server-side.

RLS and application authorization should reinforce each other.

Neither should be treated as a substitute for the other.

---

# 16. Membership Lifecycle

Membership status should be explicit.

Recommended statuses:

- invited
- active
- suspended
- removed

Removing or suspending a membership should not delete the user.

Historical sales and activity should remain attributable after membership removal.

Role changes should be auditable.

High-risk ownership changes should require stronger confirmation.

---

# 17. Invitations

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

Accepting an invitation should attach the membership to the existing authenticated identity whenever the email or verified invitation matches.

It should not require creating a second account.

---

# 18. Demo Experiences

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

# 19. User Experience Requirements

The multi-role system should remain simple for ordinary users.

Users should not need to understand internal terms such as:

- Entitlement
- Membership record
- Workspace authorization
- Relationship table

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

---

# 20. Non-Negotiables

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

# 21. Decision Rule

When choosing between implementations, prefer the option that best supports:

1. One-account usability
2. Clear authorization
3. Safe data ownership
4. Backward-compatible migration
5. Reusable capabilities
6. Simple workspace switching
7. Long-term scalability

Do not optimize only for the fastest short-term implementation.
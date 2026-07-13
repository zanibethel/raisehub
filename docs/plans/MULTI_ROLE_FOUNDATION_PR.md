# Multi-Role Foundation PR Plan

**Version:** 3.0  
**Status:** Approved for implementation planning  
**Target:** Next RaiseHub pull request  
**Scope type:** Additive architectural foundation  
**User-visible change:** None or minimal  
**Primary source of truth:** `docs/IDENTITY_ACCESS_MODEL.md`

This document defines the full implementation blueprint for the first RaiseHub multi-role foundation pull request.

The purpose of this PR is to establish the database, authorization, type, repository, and service foundations required for one authenticated identity to safely access multiple businesses, organizations, customer entitlements, seller experiences, and future workspaces.

This PR is foundational.

It must not attempt to complete every user-facing feature that will eventually depend on this architecture.

---

# 1. Executive Summary

RaiseHub is moving from a single-role account model toward a multi-capability platform.

A single person may eventually:

- Own one or more businesses
- Manage one or more business locations
- Belong to one or more organizations
- Sell for one or more campaigns
- Hold an active or expired customer pass
- Manage events, merchandise, teams, or fundraising seasons
- Access the Owner Platform
- Switch between experiences without signing out
- Use one email address and one authentication identity

The current application still depends on `profiles.role`.

That dependency must remain operational during migration.

The next PR should therefore build the new architecture additively while preserving current production behavior.

The PR should create the safe foundation for:

- Business entities
- Business memberships
- Organization entities
- Organization memberships
- Campaign memberships
- Customer entitlements
- Capability-based authorization
- Future workspace switching
- Future invitation workflows
- Future seller dashboards
- Future multi-location businesses
- Future fundraising seasons, teams, events, and merchandise
- Future owner-managed demo baselines

The PR should not remove the old model.

It should make the new model possible.

---

# 2. Product Direction

RaiseHub is not intended to remain only a coupon fundraiser.

The long-term platform may support:

- Local business discovery
- Customer savings
- Fundraising campaigns
- Organization management
- Seller tracking
- Fundraising seasons
- Teams and subgroups
- Events
- Merchandise
- Rewards
- Multi-location businesses
- Staff and manager access
- Shared redemption history
- Loyalty and repeat engagement
- Owner analytics
- Future payouts and financial workflows

The architecture introduced in this PR should not block these future directions.

The design should support growth without forcing premature implementation of every future feature.

---

# 3. Core Architectural Principle

RaiseHub uses:

**One person â one authenticated identity â many capabilities**

The platform should separate:

- Identity
- Entity
- Membership
- Entitlement
- Workspace
- Capability

A person should not need another account to become:

- A customer
- A seller
- A business owner
- A business manager
- An organization admin
- A viewer
- A platform owner

Authorization must come from verified relationships and entitlements.

It must not rely only on a single permanent profile role.

---

# 4. Problem Statement

The current MVP architecture stores a single required role in `profiles.role`.

The current profile also contains business-oriented fields.

That structure creates several limitations:

- A user cannot naturally hold multiple roles
- A business is too closely coupled to a person
- An organization is too closely coupled to a person
- A seller cannot be modeled cleanly as a relationship
- Customer access cannot expire independently from business or organization access
- Multi-location businesses are difficult to model
- Multiple managers and staff are difficult to model
- Multiple organizations per person are difficult to model
- Future invitation workflows become awkward
- Workspace switching becomes unsafe if role values are rewritten
- Existing demo roles can be confused with production authorization

The next PR should address these limitations without breaking the existing app.

---

# 5. Goals

The PR must:

- Preserve current authentication behavior
- Preserve current dashboard routing
- Preserve current Customer, Business, Organization, and Owner experiences
- Preserve `profiles.role`
- Introduce additive schema only
- Establish businesses as entities
- Establish organizations as entities
- Establish membership relationships
- Establish customer entitlement foundations
- Establish campaign participation foundations
- Introduce capability-based authorization services
- Add clear repository boundaries
- Add generated Supabase types
- Add RLS and table privileges
- Add verification coverage
- Update documentation
- Prepare future PRs for user-facing migration

---

# 6. Non-Goals

The PR must not:

- Replace the full dashboard system
- Add the final workspace switcher
- Add a complete seller dashboard
- Add seller rankings
- Add invitation UI
- Add business staff-management UI
- Add organization member-management UI
- Add event-management UI
- Add merchandise-management UI
- Add fundraising season UI
- Add team-management UI
- Add multi-location management UI
- Rewrite onboarding
- Remove `profiles.role`
- Delete legacy profile fields
- Perform a destructive data migration
- Change payment behavior
- Change payout behavior
- Change subscription billing
- Implement demo baseline management
- Implement demo reset automation
- Implement nightly demo reset
- Implement logout-triggered demo reset
- Change public demo login behavior
- Perform broad Owner assisted editing

These belong in future focused PRs.

---

# 7. Required Reading

Before implementation, the agent must read:

1. `PROJECT_STATUS.md`
2. `PRODUCT_VISION.md`
3. `ROADMAP.md`
4. `HERMES_PLAYBOOK.md`
5. `docs/ARCHITECTURE.md`
6. `docs/IDENTITY_ACCESS_MODEL.md`
7. `docs/AI_DEVELOPMENT_GUIDE.md`
8. `docs/DEVELOPMENT_WORKFLOW.md`
9. `docs/SUPABASE_STANDARDS.md`
10. `docs/OWNER_PLATFORM.md`
11. `docs/DOCUMENTATION_STANDARDS.md`
12. `TECHNICAL_AUDIT.md`
13. `LESSONS_LEARNED.md`

The repository and live schema remain the source of implementation truth.

Documentation describes approved direction.

---

# 8. Mandatory Investigation Before Coding

Before proposing SQL or code, inspect and report:

## Identity and Profiles

- Current `profiles` columns
- Current `profiles.role` usage
- Current profile creation flow
- Current signup behavior
- Current onboarding behavior
- Current owner authorization behavior
- Current demo account behavior
- Current profile assumptions in routes and services

## Businesses

- Existing business fields in profiles
- Existing business tables, if any
- Current offer ownership model
- Current business dashboard queries
- Current subscription fields
- Current logo and storage behavior
- Current redemption ownership
- Current analytics ownership
- Existing location-related fields

## Organizations

- Existing organization tables, if any
- Current campaign ownership model
- Current organization dashboard queries
- Existing campaign relationships
- Existing seller or fundraiser data
- Existing organization profile assumptions
- Existing team or subgroup data, if any

## Customers and Passes

- Current purchase tables
- Current pass tables
- Current redemption tables
- Current pass expiration logic
- Current customer dashboard access logic
- Current membership duration assumptions
- Current purchase status values
- Current refund behavior

## Authorization

- Current RLS policies
- Current `is_owner()` implementation
- Current security-definer functions
- Current server-side authorization helpers
- Current route guards
- Current middleware behavior
- Current direct Supabase client usage
- Current service-role usage

## Database

- Existing migration structure
- Existing generated Supabase types
- Current foreign keys
- Current indexes
- Current grants
- Current exposed schemas
- Current linter findings
- Current security advisor findings
- Current performance advisor findings

## Code Architecture

- Existing repositories
- Existing services
- Existing loaders
- Existing rules
- Existing duplicate domain types
- Existing role checks
- Existing workspace or preview logic
- Existing test structure

The agent must provide findings before implementation begins.

---

# 9. Required Planning Output

Before writing migrations or application code, the agent must provide:

1. Existing schema findings
2. Existing authorization findings
3. Existing code dependency findings
4. Existing role dependency findings
5. Proposed final schema
6. Proposed foreign keys
7. Proposed indexes
8. Proposed RLS policies
9. Proposed grants
10. Proposed repository modules
11. Proposed capability services
12. Proposed generated and domain types
13. Backward-compatibility plan
14. Backfill plan, if any
15. Testing plan
16. Manual verification plan
17. Known risks
18. Explicit assumptions
19. Open decisions
20. Owner approvals required

Broad implementation must not begin until this plan is approved.

---

# 10. Target Domain Model

The target architecture should consider:

    profiles

    businesses
    business_locations
    business_memberships

    organizations
    organization_memberships

    organization_teams
    fundraising_seasons
    campaigns
    campaign_memberships

    customer_entitlements

    user_preferences

Not every future-facing table must be implemented in this PR.

The PR should add only what can be safely introduced after inspection.

Equivalent existing tables should be reused or extended.

Duplicate entity tables must not be created.

---

# 11. Profiles

The `profiles` table should continue to represent the person.

It may retain:

- id
- email
- full_name
- display_name
- avatar or logo compatibility fields
- phone
- preferences
- legacy role
- onboarding compatibility fields

This PR must not destructively remove business-oriented profile fields.

Those fields may remain temporarily for compatibility.

Future PRs may migrate reads and writes to entity tables.

The profile must not become the long-term source of:

- Business ownership
- Organization ownership
- Seller participation
- Customer benefit access
- Workspace authorization

---

# 12. Businesses

Businesses should become independent entities.

Recommended table:

    businesses

Potential fields:

- id
- name
- legal_name
- description
- category
- logo_url
- phone
- email
- website_url
- status
- subscription_tier
- created_by
- created_at
- updated_at
- archived_at

Actual fields must be based on current schema and application needs.

Do not duplicate fields already modeled elsewhere without a migration strategy.

---

# 13. Business Locations

RaiseHub should support multiple physical locations over time.

A future-ready design may include:

    business_locations

Potential fields:

- id
- business_id
- name
- address_line_1
- address_line_2
- city
- state
- postal_code
- latitude
- longitude
- phone
- google_maps_url
- is_primary
- status
- created_at
- updated_at

This PR may defer the actual location table if existing code cannot safely consume it yet.

However, the business entity design must not assume one business always equals one location.

---

# 14. Business Memberships

Recommended relationship:

    business_memberships

Potential fields:

- id
- business_id
- user_id
- membership_role
- status
- invited_by
- invited_at
- accepted_at
- suspended_at
- removed_at
- created_at
- updated_at

Recommended roles:

- owner
- manager
- staff
- viewer

Recommended statuses:

- invited
- active
- suspended
- removed

The schema should prevent accidental duplicate active memberships for the same user and business.

Historical memberships should remain attributable.

---

# 15. Business Membership Capabilities

The architecture should support capability mapping such as:

## owner

- View business
- Edit business details
- Manage offers
- Manage locations
- View analytics
- Manage members
- Manage approved subscription settings
- Transfer ownership through a protected workflow

## manager

- View business
- Edit approved details
- Manage offers
- View analytics
- Manage selected staff functions
- View shared redemption history

## staff

- View assigned operational areas
- Support redemptions
- Perform approved offer or location tasks

## viewer

- View approved reports
- View approved business information

Exact capabilities must not be hardcoded in UI components.

---

# 16. Organizations

Organizations should become independent entities.

Recommended table:

    organizations

Potential fields:

- id
- name
- description
- organization_type
- logo_url
- phone
- email
- website_url
- status
- created_by
- created_at
- updated_at
- archived_at

Organization types may eventually include:

- school
- sports_team
- booster_club
- church
- nonprofit
- club
- community_group
- other

The exact representation should remain flexible.

---

# 17. Organization Memberships

Recommended relationship:

    organization_memberships

Potential fields:

- id
- organization_id
- user_id
- membership_role
- status
- display_name
- invited_by
- invited_at
- accepted_at
- suspended_at
- removed_at
- created_at
- updated_at

Recommended roles:

- admin
- manager
- seller
- viewer

Recommended statuses:

- invited
- active
- suspended
- removed

A user may hold memberships in multiple organizations.

---

# 18. Organization Membership Capabilities

## admin

- View organization
- Edit organization
- Create campaigns
- Manage campaigns
- Manage members
- Assign roles
- View organization-wide progress
- View seller progress
- Manage approved settings

## manager

- Manage approved campaigns
- View progress
- View seller performance
- Manage assigned members
- Manage assigned teams or seasons

## seller

- View assigned campaigns
- View personal sales
- View personal amount raised
- View organization progress
- Access referral links
- Access QR codes
- View goals and milestones

## viewer

- View approved organization information
- View approved progress

The final permission matrix should be implemented through capability services.

---

# 19. Organization Teams

Organizations may eventually contain teams, classes, grades, departments, or subgroups.

Future-ready relationship:

    organization_teams

Potential fields:

- id
- organization_id
- name
- description
- status
- created_at
- updated_at

A seller may eventually belong to:

- An organization
- One or more teams
- One or more campaigns
- One or more seasons

This PR may defer team implementation.

The membership design must not block it.

---

# 20. Fundraising Seasons

Organizations may run multiple fundraising seasons.

Future-ready entity:

    fundraising_seasons

Potential fields:

- id
- organization_id
- name
- starts_at
- ends_at
- status
- goal_amount
- created_at
- updated_at

Campaigns may eventually belong to a season.

A season may include:

- Multiple campaigns
- Multiple teams
- Events
- Merchandise
- Seller goals
- Organization-wide goals

This PR may defer season implementation.

The organization and campaign design must not block it.

---

# 21. Campaign Memberships

Organization membership and campaign participation are distinct.

Recommended relationship:

    campaign_memberships

Potential fields:

- id
- campaign_id
- organization_membership_id
- team_id
- referral_code
- personal_goal
- status
- joined_at
- disabled_at
- created_at
- updated_at

This relationship should support:

- Personal referral links
- Personal QR codes
- Personal sales totals
- Personal amount raised
- Seller ranking
- Team attribution
- Campaign participation status
- Historical attribution

---

# 22. Purchase Attribution

Purchases attributed to a seller should store a durable reference.

Do not rely only on:

- Browser cookies
- Query parameters
- Session memory
- Display names
- Editable referral labels

The purchase or attribution model should support:

- campaign_id
- organization_id
- campaign_membership_id
- seller user relationship
- team relationship when applicable
- source referral code
- unattributed purchases

Historical attribution must remain intact even after:

- Seller removal
- Membership suspension
- Role changes
- Campaign closure
- Organization changes

---

# 23. Customer Entitlements

Recommended table:

    customer_entitlements

Potential fields:

- id
- user_id
- purchase_id
- entitlement_type
- status
- starts_at
- expires_at
- granted_by
- revoked_at
- replacement_entitlement_id
- created_at
- updated_at

Potential entitlement types:

- purchased_pass
- complimentary_pass
- trial
- promotional_access
- replacement_access

Potential statuses:

- pending
- active
- expired
- revoked
- replaced
- cancelled

The exact design must reflect current purchase and pass tables.

---

# 24. Entitlement Rules

Customer access should use deterministic rules.

An entitlement should grant active benefits only when:

- Status allows access
- Start time has passed
- Expiration time has not passed
- It has not been revoked
- The source purchase is valid when applicable
- It has not been replaced or cancelled

The entitlement record must remain for history.

Expiration must not remove:

- Login access
- Business memberships
- Organization memberships
- Seller access
- Purchase history
- Historical redemptions

---

# 25. User Preferences

A future workspace preference may use:

    user_preferences

Potential fields:

- user_id
- active_context_type
- active_context_id
- notification preferences
- accessibility preferences
- updated_at

The selected workspace is convenience only.

It must never be treated as proof of authorization.

This table may be deferred if it is not required for the foundation.

---

# 26. Capability-Based Authorization

New authorization should move toward reusable capabilities.

Initial capability targets:

    canAccessCustomerBenefits

    canViewBusiness

    canManageBusiness

    canManageBusinessMembers

    canViewBusinessAnalytics

    canViewOrganization

    canManageOrganization

    canManageOrganizationMembers

    canCreateCampaign

    canManageCampaign

    canSellForCampaign

    canViewSellerProgress

    canAccessOwnerPlatform

The exact helper names may change after inspection.

The capability model must remain explicit and server-side.

---

# 27. Authenticated Actor Rules

The authenticated actor ID must come from the verified server session.

The client must never choose the actor ID.

Allowed pattern:

1. Resolve the authenticated user server-side.
2. Pass the verified actor ID into an internal service.
3. Validate the requested resource.
4. Validate the relationship.
5. Return an allowed or denied result.

Disallowed pattern:

1. Read `userId` from the client.
2. Trust it as the actor.
3. Query capabilities for that supplied user.

---

# 28. Capability Result Shape

Capability helpers should return predictable typed results.

Recommended direction:

    type CapabilityResult = {
      allowed: boolean
      reason?: string
      capability: string
      actorId: string
      workspaceType?: string
      workspaceId?: string
      membershipId?: string
    }

The exact shape may evolve.

It should support:

- Clear denials
- Logging
- Reuse across routes and actions
- Debugging
- Future audit behavior

---

# 29. Compatibility Fallbacks

A temporary compatibility fallback to `profiles.role` may be used only when necessary to preserve current behavior.

Fallbacks must be:

- Explicit
- Documented
- Temporary
- Isolated
- Easy to remove later

Do not hide legacy fallbacks throughout unrelated UI components.

Prefer a dedicated compatibility service or helper.

---

# 30. Repository Architecture

Database access should live in repositories.

Potential modules:

    src/lib/repositories/businesses.ts

    src/lib/repositories/business-memberships.ts

    src/lib/repositories/organizations.ts

    src/lib/repositories/organization-memberships.ts

    src/lib/repositories/campaign-memberships.ts

    src/lib/repositories/customer-entitlements.ts

Repositories should:

- Query explicit columns
- Apply database filters
- Return typed records
- Return meaningful errors
- Avoid UI logic
- Avoid presentation copy
- Avoid hidden authorization decisions
- Avoid broad `select('*')` where unnecessary

---

# 31. Service Architecture

Application coordination should live in services.

Potential modules:

    src/lib/services/capabilities.ts

    src/lib/services/business-access.ts

    src/lib/services/organization-access.ts

    src/lib/services/customer-entitlements.ts

Services should:

- Accept verified actor identity
- Call repositories
- Apply authorization coordination
- Map records into domain models
- Combine membership and entity data
- Return typed results
- Provide clear denial reasons
- Coordinate audit behavior when needed

---

# 32. Rules Architecture

Deterministic permission mapping may live in:

    src/lib/rules/

Examples:

- Business role capability mapping
- Organization role capability mapping
- Entitlement active-state rules
- Membership status rules

Rules must:

- Avoid React
- Avoid direct database access
- Be deterministic
- Be testable
- Return predictable values

---

# 33. Route and Loader Expectations

Routes should handle:

- Authentication entry
- Broad authorization
- Redirects
- Workspace selection validation
- Minimal orchestration

Loaders should:

- Resolve verified user context
- Call services
- Prepare UI props
- Avoid duplicating database access
- Avoid hiding authorization logic in UI composition

This PR may not connect all routes yet.

It should create foundations compatible with this structure.

---

# 34. Supabase Migration Requirements

All schema changes must use committed migrations.

Migrations must be:

- Additive
- Clearly named
- Reviewed before execution
- Safe against current production data
- Free of hardcoded generated user IDs
- Free of destructive deletion
- Compatible with current environments

Do not use schema changes that exist only in the dashboard and are absent from source control.

---

# 35. Migration Ordering

Preferred order:

1. Investigation findings
2. Approved schema design
3. Additive migrations
4. Grants and RLS
5. Generated Supabase types
6. Shared domain types
7. Repository modules
8. Capability services
9. Tests and verification
10. Documentation updates

Do not create shared types before the schema is approved.

Do not intentionally leave broken imports between commits.

---

# 36. RLS Requirements

Every new exposed table must have RLS enabled.

Policies must:

- Restrict rows by verified relationships
- Avoid broad authenticated access
- Avoid `USING (true)` for protected writes
- Use `WITH CHECK` where required
- Prevent self-escalation
- Prevent cross-entity access
- Prevent self-created entitlements
- Protect ownership changes

RLS should support defense in depth.

Application authorization remains required.

---

# 37. Table Privileges

RLS does not replace table privileges.

For each new table, define required grants explicitly.

Consider:

- SELECT
- INSERT
- UPDATE
- DELETE
- REFERENCES
- TRIGGER

Do not grant broad privileges merely because RLS exists.

Prefer server-side privileged writes for:

- Membership creation
- Role assignment
- Ownership changes
- Entitlement grants
- Entitlement revocation
- High-risk settings

---

# 38. Security-Definer Functions

Do not use `SECURITY DEFINER` merely to bypass a permission problem.

If a security-definer function is truly required:

- Keep scope narrow
- Validate `auth.uid()`
- Revoke broad execute privileges
- Avoid exposed public functions when possible
- Document why it is required
- Run Supabase advisors afterward

Existing functions such as `is_owner()` must be inspected before reuse.

---

# 39. Backfill Strategy

Do not backfill until current data is understood.

Before backfill:

- Count current profiles by role
- Identify business profiles
- Identify organization profiles
- Identify customer profiles
- Identify owner profiles
- Identify duplicate or ambiguous records
- Confirm existing offers and campaigns
- Confirm ownership assumptions
- Confirm current live users
- Confirm demo users

Backfill documentation must include:

- Selection criteria
- Mapping rules
- Duplicate handling
- Ambiguous records
- Unmapped records
- Verification counts
- Recovery strategy
- Affected users
- Assumptions

---

# 40. Backfill Scope for This PR

The preferred default is:

- Add the foundation
- Do not perform broad live backfill yet

A small verified backfill may be approved if needed to test the architecture.

Any backfill must be explicitly approved after findings are reviewed.

---

# 41. Existing Role Compatibility

The current `profiles.role` field must remain functional.

This PR must not:

- Remove it
- Rename it
- Make it nullable
- Rewrite all role routing
- Break current demo login
- Break onboarding
- Break owner access

Any new capability layer should coexist with current role checks.

---

# 42. Multi-Location Compatibility

The business architecture must support future:

- Multiple locations
- Different managers per location
- Shared business-level offers
- Location-specific offers
- Shared redemption history
- Location-specific redemption history
- Business-level analytics
- Location-level analytics

This PR does not need to deliver location features.

It must avoid making them impossible.

---

# 43. Organization Expansion Compatibility

The organization architecture must support future:

- Multiple fundraising seasons
- Multiple campaigns
- Teams
- Classes
- Departments
- Events
- Merchandise
- Seller groups
- Organization-wide goals
- Team goals
- Seller goals

This PR does not need to deliver these experiences.

It must preserve room for them.

---

# 44. Demo Compatibility

The existing demo launcher currently represents separate experiences.

This PR must not break:

- Customer demo login
- Business demo login
- Organization demo login
- Demo switching
- Demo notifications
- Demo offers
- Demo campaigns

The future demo reset architecture should use memberships and entitlements when appropriate.

This PR should document compatibility but not implement the reset system.

---

# 45. Owner Platform Compatibility

The platform owner must remain a verified platform-level identity.

The owner role must not be rewritten to preview another workspace.

Owner workspace context must remain separate from authentication identity.

The new capability system should support:

    canAccessOwnerPlatform

It must not weaken existing owner authorization.

---

# 46. Audit Requirements

This PR should define where audit logging will eventually be required.

High-value future audit actions include:

- Membership creation
- Invitation acceptance
- Role changes
- Suspension
- Removal
- Ownership transfer
- Entitlement grant
- Entitlement revocation
- Owner-assisted edits
- Demo baseline changes

The first PR may establish types or hooks without implementing every audit path.

---

# 47. TypeScript Requirements

After schema changes:

- Generate updated Supabase types
- Commit generated types when that matches repository convention
- Create shared domain types
- Avoid duplicate definitions
- Avoid `any`
- Avoid unsafe assertions
- Avoid making required fields optional to silence errors

Potential shared types:

- Business
- BusinessLocation
- BusinessMembership
- Organization
- OrganizationMembership
- CampaignMembership
- CustomerEntitlement
- WorkspaceContext
- CapabilityResult

---

# 48. Testing Strategy

The PR must include a testing plan covering:

- Existing authentication
- Existing dashboards
- Existing offers
- Existing campaigns
- Existing notifications
- Owner access
- New repository reads
- New capability checks
- RLS enforcement
- Cross-user access denial
- Cross-entity access denial
- Entitlement access rules
- Legacy fallback behavior
- Production build

---

# 49. Minimum Runtime Verification

At minimum, verify:

- Existing customer login works
- Existing business login works
- Existing organization login works
- Existing owner login works
- Existing dashboard routes load
- Existing offer reads work
- Existing campaign reads work
- Existing notification reads and updates work
- New tables exist
- RLS is enabled
- Valid authorized reads succeed
- Invalid cross-user reads fail
- Invalid cross-entity reads fail
- Users cannot self-assign privileged roles
- Users cannot grant themselves entitlements
- TypeScript passes
- Lint passes
- Production build passes

---

# 50. Supabase Advisor Review

After schema changes, run:

- Security advisors
- Performance advisors

Document:

- New findings
- Existing unrelated findings
- Fixed findings
- Deferred findings
- Reasons for deferral

Do not claim the schema is secure merely because migrations succeeded.

---

# 51. Performance Requirements

Add indexes for expected lookup patterns.

Likely lookup paths include:

- Memberships by user
- Memberships by entity
- Active memberships by user and entity
- Campaign memberships by campaign
- Campaign memberships by organization membership
- Entitlements by user
- Active entitlements by user
- Businesses by status
- Organizations by status

Index design must reflect actual query plans and schema.

Avoid speculative over-indexing.

---

# 52. Data Integrity Requirements

Use constraints where appropriate.

Consider:

- Foreign keys
- Valid status values
- Valid role values
- Unique active membership constraints
- Nonnegative goals
- Valid date ranges
- One primary business location
- Ownership protections
- Required entity references

Do not use constraints that make migration impossible without reviewing current data.

---

# 53. Rollback and Recovery

The PR must document:

- How to reverse additive migrations
- Which changes are safe to leave unused
- How to recover from failed backfill
- How to restore generated types
- How to disable unused capability code
- How to preserve current production behavior

Because the PR is additive, rollback should generally mean:

- Stop using new tables
- Revert application imports
- Leave safe unused tables until reviewed
- Avoid destructive rollback against live data

---

# 54. Risks

## Risk: Legacy behavior breaks

Mitigation:

- Preserve `profiles.role`
- Keep current routes intact
- Add new logic behind services
- Test every existing dashboard

## Risk: Duplicate business or organization records

Mitigation:

- Inspect schema first
- Reuse existing tables
- Avoid broad backfill
- Require explicit mapping rules

## Risk: Weak RLS

Mitigation:

- Review policies
- Test cross-user access
- Run advisors
- Use defense in depth

## Risk: Capability logic becomes duplicated

Mitigation:

- Centralize role-to-capability mapping
- Centralize service checks
- Keep UI free of hidden authorization

## Risk: Scope becomes too broad

Mitigation:

- Keep user-facing changes minimal
- Defer dashboards and invitations
- Enforce out-of-scope list

---

# 55. Explicitly Out of Scope

Unless separately approved, do not include:

- Unified dashboard redesign
- Workspace switcher UI
- Full seller dashboard
- Seller rankings
- Membership invitation UI
- Business member-management UI
- Organization member-management UI
- Multi-location UI
- Team-management UI
- Event-management UI
- Merchandise-management UI
- Fundraising season UI
- Automatic entitlement activation
- Pass-expiration UI
- Full business migration
- Full organization migration
- Broad backfill
- Demo management
- Demo reset automation
- Payment changes
- Payout changes
- Subscription changes
- Owner assisted editing
- Legacy field removal

---

# 56. Deliverables Before Implementation

The agent must first deliver:

1. Schema findings
2. Authorization findings
3. Code dependency findings
4. Proposed schema
5. Proposed policies
6. Proposed grants
7. Proposed indexes
8. Proposed repositories
9. Proposed services
10. Proposed types
11. Compatibility plan
12. Testing plan
13. Risk assessment
14. Assumptions
15. Owner approvals required

---

# 57. Implementation Deliverables

After approval, the PR should include:

- Committed migrations
- Updated generated Supabase types
- Shared domain types
- Repository modules
- Capability services
- Focused tests or verification scripts
- Documentation updates
- PR summary
- Manual verification instructions
- Advisor results
- Known limitations
- Future migration notes

---

# 58. Commit Strategy

Prefer small, independently understandable commits.

Suggested order:

1. Investigation findings and approved schema plan
2. Database migrations
3. Grants, policies, and indexes
4. Generated Supabase types
5. Shared domain types
6. Repository modules
7. Capability services
8. Tests and verification
9. Documentation and status updates

Do not intentionally create broken intermediate commits.

Do not mix unrelated visual work into this PR.

---

# 59. PR Review Checklist

Reviewers should confirm:

- Scope remained foundational
- Existing behavior was preserved
- Migrations are additive
- No duplicate entity tables were introduced
- RLS is enabled
- Grants are minimal
- Capability checks use verified actor identity
- Client-selected roles are not trusted
- Legacy compatibility is explicit
- Types match schema
- Tests cover denials
- Advisors were reviewed
- Documentation was updated
- Out-of-scope features were deferred

---

# 60. Success Metrics

The PR is successful when:

- Existing users do not lose access
- Existing authentication works
- Existing dashboards work
- No second accounts are required
- Legacy role routing still works
- New membership foundations exist
- New entitlement foundations exist
- Capability services exist
- RLS protects every new table
- Table privileges are correct
- Generated types match the schema
- Production build passes
- Future PRs can build seller dashboards without redesigning identity
- Future PRs can build workspace switching without rewriting authentication
- Future PRs can support multi-location businesses
- Future PRs can support teams and fundraising seasons

---

# 61. Definition of Done

This PR is complete only when:

- Investigation findings are documented
- The approved additive schema exists
- Existing production behavior remains functional
- New tables are secured
- Capability helpers are available
- Repositories exist
- Supabase types are current
- Verification is documented
- No destructive cutover occurred
- No broad backfill occurred without approval
- Future PRs can build on the foundation safely

The PR does not need to deliver the final multi-role UI.

The PR does not need to remove legacy roles.

The PR does not need to migrate every existing feature.

Its purpose is to make those future changes safe and straightforward.

---

# 62. Future PR Sequence

Expected follow-up PRs:

1. Business entity and membership migration
2. Organization entity and membership migration
3. Seller and campaign membership experience
4. Customer entitlement activation
5. Unified workspace navigation
6. Membership invitations
7. Multi-location business support
8. Organization teams and seasons
9. Events and merchandise
10. Owner-managed demo profiles
11. Demo reset automation
12. Legacy role retirement

Each should remain focused.

---

# 63. Final Principle

This foundation should make RaiseHub more powerful without making the user experience more complicated.

Users should experience:

- One login
- Clear access
- Simple switching
- No duplicate accounts
- No lost unrelated access
- Secure permissions
- Predictable behavior

The platform should absorb the complexity so the user does not have to.

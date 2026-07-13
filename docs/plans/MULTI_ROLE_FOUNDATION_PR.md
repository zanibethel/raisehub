# Multi-Role Foundation PR Plan

**Status:** Planned  
**Target:** Next RaiseHub pull request  
**Scope type:** Additive foundation  
**User-visible change:** None or minimal

This document defines the approved scope for the first multi-role foundation pull request.

The purpose of this PR is to establish safe database and application foundations for one-user/multiple-capability architecture.

This PR must not attempt to complete every business, organization, seller, customer-entitlement, dashboard, invitation, or demo-management feature.

Read `docs/IDENTITY_ACCESS_MODEL.md` before beginning.

---

# 1. Goal

Create the additive technical foundation needed for RaiseHub users to eventually access multiple experiences through one authentication identity.

The PR should establish:

- Entity tables where safely possible
- Membership tables
- Customer entitlement foundation
- Constraints and indexes
- RLS policies
- Shared TypeScript types
- Repository boundaries
- Authorization or capability service foundations
- Tests or verification queries
- Documentation updates

The existing application must continue working through the legacy `profiles.role` behavior.

---

# 2. Required Investigation Before Implementation

Before proposing SQL or code, inspect:

- Current `profiles` schema
- Current business-related profile fields
- Current organization-related data
- Campaign ownership fields
- Purchase and pass tables
- Redemption tables
- Offer ownership fields
- Existing RLS policies
- Existing `is_owner()` or owner authorization behavior
- Current signup and onboarding flow
- Current dashboard role routing
- Current Supabase generated types
- Existing migration structure
- Current repository and service conventions

Report findings before broad implementation.

Do not guess table or column names.

---

# 3. Approved Target Model

The target model should consider:

- `businesses`
- `business_memberships`
- `organizations`
- `organization_memberships`
- `campaign_memberships`
- `customer_entitlements`
- `user_preferences`

The final PR may implement only the tables that can be introduced safely after schema inspection.

If an equivalent entity table already exists, reuse or extend it rather than creating a duplicate.

---

# 4. Compatibility Requirement

The existing `profiles.role` field must remain functional.

This PR must not:

- Remove `profiles.role`
- Rename `profiles.role`
- Make it nullable
- Replace current dashboard routing
- Rewrite all onboarding
- Delete business fields from profiles
- Delete organization fields
- Require existing users to re-register
- Change demo login behavior
- Break current Customer, Business, Organization, or Owner experiences

New structures must be additive.

---

# 5. Proposed Membership Rules

Business membership roles:

- owner
- manager
- staff
- viewer

Organization membership roles:

- admin
- manager
- seller
- viewer

Membership status values:

- invited
- active
- suspended
- removed

Use constraints or enums only after considering migration flexibility and current Supabase conventions.

Membership records should prevent accidental duplicate active relationships for the same user and entity.

Historical records should remain attributable.

---

# 6. Customer Entitlement Rules

Customer access should be designed around an entitlement rather than a permanent profile role.

The foundation should support:

- Purchase-created entitlement
- Owner-granted entitlement
- Complimentary access
- Trial access
- Start time
- Expiration time
- Revocation
- Status
- Source purchase reference

Do not switch current customer authorization to entitlements in this PR unless explicitly approved after foundation verification.

This PR may introduce the table and capability logic without connecting every customer screen.

---

# 7. Capability Foundation

Create or propose server-side capability helpers.

Initial targets:

    canAccessCustomerBenefits

    canViewBusiness

    canManageBusiness

    canViewOrganization

    canManageOrganization

    canSellForCampaign

    canAccessOwnerPlatform

Capability helpers should:

- Accept authenticated user identity
- Validate target entity relationships
- Distinguish viewing from management
- Return predictable typed results
- Avoid client-provided role trust
- Avoid relying only on `profiles.role`
- Be reusable by routes, loaders, services, and server actions

A compatibility fallback to legacy role logic may be used only when clearly documented and necessary to preserve current behavior.

---

# 8. Architecture Requirements

Follow the repository architecture:

    Route
    ↓
    Loader
    ↓
    Service
    ↓
    Repository
    ↓
    Supabase

Database queries belong in repositories.

Authorization coordination belongs in services or dedicated authorization modules.

Shared deterministic permission mapping should remain framework-independent where practical.

UI components must not become the source of authorization decisions.

---

# 9. Supabase Requirements

All new exposed tables must:

- Have RLS enabled
- Have explicit policies
- Use appropriate ownership or membership checks
- Avoid broad authenticated access
- Avoid `USING (true)` for protected writes
- Use both `USING` and `WITH CHECK` where required for updates
- Prevent self-assignment of privileged roles
- Prevent users from granting themselves entitlements
- Include required table privileges for intended roles
- Include indexes for membership and entitlement lookup paths

Do not expose service-role credentials to application clients.

Do not use user-editable metadata for authorization.

Run Supabase security and performance advisors after schema changes.

---

# 10. Migration Requirements

Create committed migration files.

Migration work should be:

- Additive
- Idempotent where practical
- Clearly named
- Reviewed before execution
- Safe against existing production data
- Free of hardcoded generated user IDs
- Free of destructive data removal

Do not backfill relationships until the mapping from existing profiles is understood.

If backfill is included, provide:

- Selection criteria
- Duplicate handling
- Rollback or recovery plan
- Verification counts
- A clear explanation of affected users

---

# 11. TypeScript Requirements

Generate or update Supabase types after schema changes.

Create shared domain types for:

- Business membership
- Organization membership
- Campaign membership
- Customer entitlement
- Capability result
- Workspace context

Do not create competing duplicate definitions across components.

Avoid `any`.

Do not make required fields optional only to silence build errors.

---

# 12. Testing and Verification

At minimum, verify:

- Existing role-based dashboards still load
- Existing login and logout still work
- Owner access still works
- Existing offer and campaign reads are unaffected
- New tables exist
- RLS is enabled
- Anonymous users cannot read protected membership records
- Users cannot read unrelated protected memberships
- Users cannot grant themselves privileged membership roles
- Users cannot grant themselves customer entitlements
- Valid authorized reads succeed
- Capability helpers return expected results
- TypeScript passes
- Lint passes
- Production build passes
- Supabase security advisors are reviewed
- Supabase performance advisors are reviewed

Document anything not runtime-tested.

---

# 13. Explicitly Out of Scope

Do not include these unless separately approved:

- Unified dashboard redesign
- Workspace switcher UI
- Full seller dashboard
- Seller rankings
- Invitation system
- Organization member-management UI
- Business team-management UI
- Automatic customer entitlement activation
- Pass-expiration UI
- Full business data migration
- Full organization data migration
- Demo baseline management
- Demo reset automation
- Nightly demo reset
- Logout-triggered demo reset
- Payment changes
- Payout changes
- Broad owner assisted editing
- Destructive removal of legacy fields

These belong in later focused PRs.

---

# 14. Expected Deliverables

The agent should first provide:

1. Existing schema findings
2. Existing authorization findings
3. Proposed final schema
4. Migration sequence
5. RLS policy design
6. Code files to add or modify
7. Compatibility risks
8. Testing plan
9. Explicit assumptions
10. Any blockers requiring owner approval

After approval, the implementation should provide:

- Committed migrations
- Generated or updated types
- Repository modules
- Authorization or capability modules
- Focused tests or verification scripts
- Documentation updates
- Clear PR summary
- Manual verification instructions

---

# 15. Commit Strategy

Prefer small, independently understandable commits.

Suggested order:

1. Documentation and shared types
2. Database migrations
3. Generated database types
4. Repository modules
5. Capability or authorization services
6. Tests and verification
7. Documentation and status updates

Do not intentionally leave broken imports between commits.

Do not mix unrelated visual changes into this PR.

---

# 16. Completion Definition

This PR is complete only when:

- The additive foundation exists
- Existing experiences still work
- New access structures are secured
- Capability helpers are available
- Schema and application types agree
- Verification is documented
- No destructive cutover occurred
- Future PRs can build on the foundation without redesigning identity again

The PR does not need to deliver the final multi-role user interface to be considered complete.

Its purpose is to make that interface safe and straightforward to build next.
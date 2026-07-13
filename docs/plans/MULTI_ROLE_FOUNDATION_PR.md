# Multi-Role Foundation PR Plan

**Status:** Planned\
**Target:** Next RaiseHub pull request\
**Scope type:** Additive foundation\
**User-visible change:** None or minimal

## Executive Summary

This PR establishes the technical foundation for RaiseHub's long-term
identity architecture while preserving the existing application.

The goal is **not** to deliver the full multi-role experience. The goal
is to create the database, authorization, and application foundations
that later PRs will build upon.

The current production experience must continue working throughout the
migration.

------------------------------------------------------------------------

# Goals

-   Preserve existing production behavior.
-   Introduce additive schema changes.
-   Prepare for one identity with many capabilities.
-   Establish memberships and customer entitlements.
-   Create reusable authorization services.
-   Avoid destructive migrations.
-   Keep the PR narrowly scoped.

------------------------------------------------------------------------

# Required Investigation

Before implementation, inspect and document:

-   Current profiles schema
-   Existing role usage
-   Existing dashboard routing
-   Business ownership model
-   Organization ownership model
-   Campaign ownership
-   Offer ownership
-   Purchases and passes
-   Existing RLS
-   Existing migrations
-   Existing generated Supabase types
-   Existing repository/service architecture

Do not guess schema or relationships.

------------------------------------------------------------------------

# Success Criteria

The PR is successful when:

-   Existing authentication still works.
-   Existing dashboards still work.
-   Existing Customer, Business, Organization and Owner experiences
    remain functional.
-   New schema is additive.
-   Capability services exist.
-   Membership tables are secured with RLS.
-   Supabase types regenerate successfully.
-   Production build passes.
-   Future PRs can implement seller dashboards and unified workspaces
    without redesigning identity.

------------------------------------------------------------------------

# Scope

This PR may include:

-   New membership tables
-   Customer entitlement foundation
-   Capability helpers
-   Shared domain types
-   Repository modules
-   RLS policies
-   Database migrations
-   Documentation updates

This PR must NOT include:

-   Dashboard redesign
-   Workspace switcher
-   Seller UI
-   Invitation UI
-   Demo reset system
-   Demo management UI
-   Full data migration
-   Legacy role removal

------------------------------------------------------------------------

# Database Principles

Use additive migrations only.

Never remove or rename existing production columns in this PR.

Keep `profiles.role` operational until every dependent feature has
migrated.

Inspect the existing schema before creating new tables.

Reuse existing entities whenever practical instead of creating
duplicates.

------------------------------------------------------------------------

# Authorization

Authorization must be capability based.

Never trust:

-   client supplied user IDs
-   query string roles
-   selected workspace
-   hidden UI

Capability helpers should become the single source of authorization
logic.

------------------------------------------------------------------------

# Recommended Capability Helpers

-   canAccessCustomerBenefits
-   canViewBusiness
-   canManageBusiness
-   canViewOrganization
-   canManageOrganization
-   canSellForCampaign
-   canViewSellerProgress
-   canAccessOwnerPlatform

Helpers must execute on the server and use verified relationships.

------------------------------------------------------------------------

# Migration Sequence

1.  Inspect schema.
2.  Approve implementation plan.
3.  Create additive migrations.
4.  Apply RLS and grants.
5.  Generate Supabase types.
6.  Build repositories.
7.  Build capability services.
8.  Add tests.
9.  Update documentation.
10. Verify production behavior.

------------------------------------------------------------------------

# Supabase Requirements

Every new exposed table must:

-   Enable RLS.
-   Use explicit policies.
-   Grant only required privileges.
-   Include supporting indexes.
-   Prevent self-assignment of privileged roles.
-   Prevent self-created entitlements.

Run Supabase Security and Performance Advisors after schema changes.

------------------------------------------------------------------------

# Testing Checklist

Verify:

-   Existing login/logout
-   Existing dashboards
-   Owner access
-   Customer access
-   Business access
-   Organization access
-   RLS enforcement
-   Capability helpers
-   TypeScript
-   Lint
-   Production build
-   Manual verification

------------------------------------------------------------------------

# Risks

-   Breaking legacy role routing
-   Duplicate ownership data
-   Incorrect backfill assumptions
-   Weak authorization boundaries

Mitigate by preserving backwards compatibility and documenting every
assumption.

------------------------------------------------------------------------

# Deliverables

-   Committed migrations
-   Updated Supabase types
-   Repository modules
-   Capability services
-   Documentation
-   Verification notes

------------------------------------------------------------------------

# Completion Definition

The PR is complete when:

-   Existing production behavior remains intact.
-   The multi-role foundation exists.
-   Authorization is capability-based.
-   Future PRs can add memberships, seller dashboards, unified
    workspaces, and customer entitlements without redesigning identity.

The purpose of this PR is to create a safe foundation---not to finish
the complete feature set.
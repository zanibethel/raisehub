# RaiseHub Supabase Standards

**Last updated:** July 2026

This document defines the database, security, migration, and data-access standards for RaiseHub.

Supabase is part of the application’s security boundary.

Database changes must be deliberate, reviewable, reproducible, and safe for live client data.

---

# 1. Core Principles

RaiseHub database work should prioritize:

1. Security
2. Data integrity
3. Reproducibility
4. Clear ownership
5. Auditability
6. Performance
7. Maintainability

Never trade security or data integrity for faster implementation.

---

# 2. Environment Separation

RaiseHub should eventually use separate environments:

    Development Supabase
    Staging Supabase
    Production Supabase

Local development and production currently share the same Supabase project.

Until that is corrected:

- Treat local writes as production writes.
- Avoid destructive testing.
- Avoid financial-impact testing.
- Prefer designated demo records.
- Clearly distinguish demo and live accounts.
- Do not assume test data is isolated.
- Do not run bulk cleanup without reviewing affected rows.
- Keep support mode read-only by default.

Environment separation is required before unrestricted live onboarding.

---

# 3. Database Change Workflow

Use this process for every meaningful schema change.

1. Inspect the existing schema.
2. Identify affected tables, policies, functions, indexes, and application code.
3. Explain the proposed migration.
4. Confirm the correct Supabase project.
5. Apply the change using a named migration.
6. Verify the resulting schema.
7. Verify existing data still works.
8. Review RLS policies.
9. Run Supabase security advisors.
10. Run Supabase performance advisors when relevant.
11. Generate updated TypeScript types when the schema affects application models.
12. Add the migration to repository documentation or tracked migration files.
13. Verify GitHub Actions.
14. Test the affected workflow.

Do not make undocumented production schema changes.

---

# 4. Migration Standards

DDL changes should use migrations.

Examples of DDL:

- Creating tables
- Altering tables
- Adding columns
- Adding constraints
- Creating indexes
- Creating functions
- Creating triggers
- Enabling RLS
- Creating or changing policies

## Migration Naming

Use descriptive snake_case names.

Good examples:

    add_owner_role
    create_owner_action_logs
    add_workspace_support_policies
    index_campaign_purchases_by_campaign
    add_demo_record_flags

Avoid vague names such as:

    update_database
    fix_table
    changes
    new_migration

## Migration Scope

Each migration should represent one logical database change.

Avoid mixing unrelated tables and policies in the same migration unless they are part of one feature.

## Reversibility

Before applying a migration, consider:

- Can it be safely reversed?
- Will existing rows still satisfy new constraints?
- Will a column rename break deployed code?
- Will a policy change lock users out?
- Will a type change lose data?
- Will an index create excessive load?

Destructive changes require a clear rollback or recovery plan.

---

# 5. Tracked Migrations

RaiseHub should maintain migration history in source control.

Recommended location:

    supabase/migrations/

Each migration should contain:

- Timestamp or ordered prefix
- Descriptive name
- Complete SQL
- Comments for unusual decisions

Example filename:

    20260711_create_owner_action_logs.sql

The production schema should eventually be reproducible from:

- Repository migrations
- Documented seed data
- Environment configuration

Manual dashboard-only changes should not become the long-term standard.

---

# 6. Schema Inspection

Never guess database fields.

Before writing a repository query:

1. Inspect the real table.
2. Confirm column names.
3. Confirm data types.
4. Confirm nullability.
5. Confirm defaults.
6. Confirm constraints.
7. Confirm foreign keys.
8. Confirm RLS policies.
9. Confirm indexes.
10. Review existing code that queries the table.

A successful TypeScript build does not prove a Supabase query is valid at runtime.

---

# 7. Naming Conventions

## Tables

Use plural snake_case names.

Examples:

    profiles
    campaigns
    campaign_purchases
    saved_offers
    owner_action_logs
    owner_preview_profiles

## Columns

Use snake_case.

Examples:

    business_id
    organization_id
    actor_user_id
    subject_user_id
    created_at
    payment_status

## Foreign Keys

Use the referenced entity name followed by `_id`.

Examples:

    user_id
    offer_id
    campaign_id
    workspace_id

## Booleans

Use clear names beginning with:

    is_
    has_
    can_

Examples:

    is_active
    is_demo
    has_completed_onboarding
    can_receive_payouts

## Timestamps

Prefer:

    created_at
    updated_at
    archived_at
    deleted_at
    expires_at

Use `timestamptz` for application timestamps unless there is a strong reason not to.

---

# 8. Primary Keys

Prefer UUID primary keys for application-owned records.

Example:

    id uuid primary key default gen_random_uuid()

Use stable foreign keys rather than email addresses or display names.

Do not use mutable values as record identity.

---

# 9. Foreign Keys

Use foreign keys to protect relationships.

Examples:

- Offers belong to businesses.
- Campaigns belong to organizations.
- Redemptions belong to users and offers.
- Owner audit logs reference actor and subject profiles.

Choose deletion behavior intentionally.

Possible behaviors:

- `ON DELETE CASCADE`
- `ON DELETE SET NULL`
- `ON DELETE RESTRICT`

Do not use cascading deletion automatically without reviewing the effect on audit, financial, and support history.

Audit records may need to preserve historical references even after an account is removed.

---

# 10. Constraints

Use database constraints for rules that must always remain true.

Examples:

- Allowed profile roles
- Positive prices
- Valid status values
- Unique mappings
- Required actor IDs
- Allowed workspace roles

Constraints should protect data even when application code fails.

Examples:

    role in ('customer', 'business', 'organization', 'admin', 'owner')

    amount_paid >= 0

    preview_role in ('customer', 'business', 'organization')

Application validation improves user experience.

Database constraints protect integrity.

Use both where appropriate.

---

# 11. Status Fields

Status values should be explicit and documented.

Avoid scattered free-form strings.

Examples:

    active
    paused
    archived
    expired

Payment statuses may eventually include:

    pending
    paid
    failed
    canceled
    refunded
    partially_refunded

Financial calculations must define which statuses count as completed revenue.

Do not count every row merely because it exists.

---

# 12. Row-Level Security

RLS should remain enabled on user and client data.

RLS protects against accidental or unauthorized access through the Supabase API.

## Policy Principles

Policies should be:

- Narrow
- Explicit
- Role-aware
- Ownership-aware
- Independently testable
- Easy to explain

Avoid policies such as:

    USING (true)

unless the data is intentionally public.

## Ownership Policies

Common ownership relationships:

    profiles.id = auth.uid()

    offers.business_id = auth.uid()

    campaigns.organization_id = auth.uid()

    saved_offers.user_id = auth.uid()

## Public Data

Public policies should expose only what is needed for public pages.

Public access to an active offer should not automatically expose private business account data.

## Owner Access

Owner access should not be implemented as a careless universal bypass.

Owner reads and writes should still verify:

- Authenticated actor
- Owner role or capability
- Selected subject
- Workspace role
- Resource ownership
- Requested action
- Support mode
- Audit requirements

---

# 13. Application Authorization

RLS is not the only authorization layer.

Sensitive server actions should also verify access in application code.

Before a write:

1. Authenticate the user.
2. Load the actor profile.
3. Verify the actor role or capability.
4. Load the target resource.
5. Confirm ownership or workspace relationship.
6. Validate the requested operation.
7. Perform the write.
8. Write an audit record when required.

Do not rely only on:

- Hidden buttons
- Client-side state
- URL parameters
- Dashboard role selection

---

# 14. Owner and Support Access

RaiseHub distinguishes:

    Actor
    Subject
    Workspace
    Resource

## Actor

The authenticated owner or support user.

## Subject

The client account being viewed or assisted.

## Workspace

The selected customer, business, or organization context.

## Resource

The specific profile, offer, campaign, or other record being accessed.

Owner support must preserve all four concepts.

## Read-Only Mode

Client workspaces should open read-only by default.

## Assisted Editing

Assisted editing should require:

- Verified owner permission
- Explicit edit mode
- Valid subject workspace
- Valid resource ownership
- Support reason when applicable
- Audit logging

---

# 15. Audit Logs

Owner-assisted writes should create audit records.

Recommended fields:

    id
    actor_user_id
    subject_user_id
    action
    resource_type
    resource_id
    before_data
    after_data
    reason
    created_at

Audit logs should be append-only from the application perspective.

Avoid updating or deleting audit entries through normal application workflows.

Audit access should be restricted to approved internal roles.

---

# 16. Repository Pattern

Database access should live under:

    src/lib/repositories/

Repositories may:

- Query Supabase
- Insert records
- Update records
- Delete records when approved
- Select database-specific fields
- Return raw or lightly normalized results

Repositories should not:

- Render UI
- Contain user-facing copy
- Decide broad product behavior
- Manage client-side state

Example flow:

    Loader
    ↓
    Service
    ↓
    Repository
    ↓
    Supabase

---

# 17. Service Pattern

Application behavior should live under:

    src/lib/services/

Services may:

- Call repositories
- Verify permissions
- Apply deterministic rules
- Map database records into application models
- Sort and filter records
- Combine multiple data sources
- Coordinate audit logging

Services should not contain direct Supabase queries when a repository exists for the domain.

---

# 18. Supabase Client Usage

Use the correct client for the execution context.

## Server Components and Server Actions

Use the server Supabase client.

Typical location:

    src/lib/supabase/server.ts

## Client Components

Use the browser client only when client-side Supabase access is required.

Typical location:

    src/lib/supabase/client.ts

## Service Role

Do not expose or use the service-role key in browser code.

Do not log it.

Do not commit it.

Use elevated credentials only for approved server-side administrative workflows with strong authorization.

Normal owner functionality should not automatically depend on a broad service-role bypass.

---

# 19. Generated TypeScript Types

Generate Supabase TypeScript types after meaningful schema changes.

Generated types help prevent:

- Invalid column names
- Wrong nullability assumptions
- Incorrect table names
- Invalid insert objects
- Invalid update objects

Recommended location:

    src/types/database.ts

Application domain types may wrap generated types when the UI needs a cleaner model.

Do not manually recreate large database schemas across multiple files.

---

# 20. Query Standards

Select only the columns needed.

Prefer:

    select('id, business_name, role')

over:

    select('*')

unless the full row is intentionally required.

Benefits:

- Clearer contracts
- Less transferred data
- Reduced accidental exposure
- Easier schema review
- Better type understanding

## Filtering

Use explicit filters for:

- Ownership
- Status
- Demo state
- Payment status
- Archive state
- Date ranges

## Ordering

Use deterministic ordering when display order matters.

Example:

    order('created_at', { ascending: false })

## Limits

Use limits for:

- Recent activity
- Search results
- Audit history
- Large customer lists

Add pagination before lists become large.

---

# 21. Error Handling

Repository functions should surface meaningful errors.

Do not silently convert every query error into an empty array.

An empty result and a failed query are different states.

Services or loaders should decide whether to:

- Return an empty state
- Log an internal error
- Show an error message
- Redirect
- Retry
- Stop the operation

Do not expose internal SQL details or secrets to users.

---

# 22. Transactions and Multi-Step Writes

Use a database function or transaction when several writes must succeed or fail together.

Examples:

- Purchase creation and campaign totals
- Refund and balance adjustment
- Ownership transfer
- Assisted edit plus required audit record
- Payout creation and status update

Avoid workflows where the main update succeeds but the required audit record fails.

Critical multi-step operations should be atomic when possible.

---

# 23. Database Functions

Use Postgres functions when:

- Several writes must be transactional
- Sensitive logic belongs close to the data
- A consistent calculation is required across clients
- Permission checks can be safely enforced inside the database

Functions should:

- Have clear names
- Validate inputs
- Respect RLS or explicitly document security-definer behavior
- Avoid broad privilege escalation
- Return predictable result types
- Be tracked in migrations

Security-definer functions require careful review.

---

# 24. Indexes

Add indexes for frequently filtered or joined columns.

Likely candidates include:

    profiles.role
    offers.business_id
    offers.status
    campaigns.organization_id
    campaigns.status
    campaign_purchases.campaign_id
    campaign_purchases.user_id
    redemptions.offer_id
    redemptions.user_id
    saved_offers.user_id
    owner_action_logs.actor_user_id
    owner_action_logs.subject_user_id
    owner_action_logs.created_at

Do not add indexes blindly.

Indexes improve reads but increase storage and write cost.

Use performance advisors and query patterns to guide decisions.

---

# 25. Demo Data

Demo data should be identifiable.

Possible fields:

    is_demo
    data_source
    demo_group

Demo records should not appear to normal production users unless intentionally exposed.

The Owner Platform Console should clearly label:

    Demo
    Live

Do not use real client accounts as general-purpose demo accounts.

---

# 26. Financial Data

Financial records require stronger standards.

Never derive authoritative financial totals only from client-side calculations.

Financial workflows should define:

- Currency
- Gross amount
- Fees
- Net earnings
- Payment status
- Refund status
- Payout status
- External payment reference
- Created time
- Updated time

Amounts should use a consistent representation.

Before Stripe integration, decide whether money is stored as:

- Integer cents
- Numeric decimal values

Integer cents are generally safer for exact financial arithmetic.

---

# 27. Campaign Progress

Campaign progress should use one shared rule.

The rule must define:

- Which purchase statuses count
- Whether refunded purchases count
- Which earning amount is used
- How zero goals are handled
- Whether progress may exceed 100 percent
- How totals are rounded

The same calculation should be used by:

- Homepage campaign components
- Campaign detail pages
- Organization dashboard
- Reports
- Owner Platform Console

Add tests before live payments launch.

---

# 28. Deletion and Archiving

Prefer archiving over destructive deletion for important business records.

Candidates for archive behavior:

- Offers
- Campaigns
- Support notes
- Client accounts

Financial records and audit records should generally not be deleted through normal product workflows.

If soft deletion is used, document fields such as:

    archived_at
    deleted_at
    status

Queries must consistently exclude archived records where appropriate.

---

# 29. Data Retention

Define retention policies before broad production use.

Consider:

- Audit logs
- Support notes
- Payment records
- Redemption history
- Deleted accounts
- Uploaded logos
- Analytics events
- Email history

Legal, accounting, and operational requirements may affect retention periods.

Do not delete historical financial records casually.

---

# 30. Backups and Recovery

Before public launch:

- Confirm Supabase backup configuration.
- Document restore procedures.
- Test recovery on a non-production environment.
- Record who can initiate restoration.
- Document recovery-point expectations.
- Document recovery-time expectations.

A backup that has never been tested should not be assumed to be recoverable.

---

# 31. Security Advisor Review

After meaningful schema or policy changes:

- Run Supabase security advisors.
- Review warnings.
- Address exposed tables, unsafe functions, and missing RLS.
- Document accepted risks.

Do not dismiss advisor findings without understanding them.

---

# 32. Performance Advisor Review

Run performance advisors when:

- Adding large tables
- Adding new search queries
- Loading all customer profiles
- Adding audit timelines
- Adding global search
- Introducing analytics queries

Review:

- Missing indexes
- Unused indexes
- Slow filters
- Repeated joins
- Large result sets

---

# 33. Production Data Changes

Before updating live data:

1. Run a read-only query to identify affected rows.
2. Confirm the row count.
3. Confirm the selection criteria.
4. Explain the intended change.
5. Obtain approval.
6. Perform the smallest safe update.
7. Verify the result.
8. Record the change when it affects client data.

Never run broad updates without a restrictive condition.

---

# 34. Launch Requirements

Before unrestricted live onboarding:

- Separate development and production databases
- Track migrations in Git
- Complete RLS audit
- Verify owner-support policies
- Connect audit logging
- Centralize campaign progress
- Add payment-status handling
- Generate database types
- Review indexes
- Test backups and recovery
- Test customer, business, organization, admin, and owner access
- Verify demo data separation
- Complete production data cleanup

---

# 35. Current Required Next Steps

1. Inspect the real `profiles` schema.
2. Correct `workspace-repository.ts` field selection.
3. Refactor `workspace-service.ts` to use the repository.
4. Add owner-only workspace loading.
5. Connect live workspaces to the Platform Console.
6. Add tracked migrations for the owner role and support tables.
7. Review RLS policies for owner preview and support access.
8. Run Supabase security advisors.
9. Run Supabase performance advisors.
10. Create a real development environment separate from production.
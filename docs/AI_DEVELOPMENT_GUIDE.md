# RaiseHub AI Development Guide

This document defines how AI agents should approach development within the RaiseHub repository.

It is intended to reduce unnecessary planning, prevent architectural drift, improve implementation consistency, and minimize repeated context in future prompts.

This guide complements—not replaces—the other project documentation.

---

# 1. Required Reading Order

Before proposing, planning, reviewing, or modifying RaiseHub code, read the following documents in order.

Each document serves a different purpose and should not be skipped.

1. `PROJECT_STATUS.md`
2. `PRODUCT_VISION.md`
3. `ROADMAP.md`
4. `HERMES_PLAYBOOK.md`
5. `docs/ARCHITECTURE.md`
6. `docs/IDENTITY_ACCESS_MODEL.md`
7. `docs/DEVELOPMENT_WORKFLOW.md`
8. `docs/SUPABASE_STANDARDS.md`
9. `docs/OWNER_PLATFORM.md`
10. `docs/DOCUMENTATION_STANDARDS.md`
11. `TECHNICAL_AUDIT.md`
12. `LESSONS_LEARNED.md`

Read additional domain-specific documentation whenever the requested work affects those areas.

Examples include:

- Demo Experience
- Owner Platform
- Identity and Access
- Notifications
- Campaigns
- Fundraising
- Business Management
- Customer Experience

Do not assume any single document contains the entire project context.

If two documents appear to conflict:

1. Follow the most specific document for that subject.
2. If uncertainty remains, stop and request clarification instead of making architectural assumptions.

---

# 2. Agent Environment Constraints

AI implementation agents such as GitHub Copilot operate primarily against the repository.

Assume the following unless explicitly told otherwise:

- The agent does not have access to the live Supabase project.
- The agent does not have access to production data.
- The agent does not have access to live production RLS policies, grants, functions, indexes, or advisor results unless they are represented in committed repository files.
- The agent should inspect the repository, committed migrations, generated types, and existing code to determine integration points.
- Live database inspection, migration execution, advisor review, schema-drift review, and runtime verification are performed separately by the project owner or another authorized reviewer.
- If approved findings from a live Supabase review are provided, treat those findings as authoritative unless newer repository changes require revalidation.
- Do not repeatedly attempt to inspect restricted resources after those limitations have been established.
- If repository code conflicts with approved live-infrastructure findings, report the discrepancy and wait for clarification before broad implementation.
- Do not claim a database migration succeeded merely because SQL was committed.
- Do not claim RLS, grants, indexes, or runtime behavior were verified unless an authorized reviewer confirms that verification.

The standard implementation workflow is:

1. Read the required documentation.
2. Inspect the repository.
3. Review approved live-infrastructure findings when provided.
4. Present repository findings and an implementation plan.
5. Wait for approval.
6. Implement only the approved scope.
7. Create committed migrations when required.
8. Allow the authorized reviewer to apply and verify live database changes separately.
9. Update code and documentation to match verified results.
10. Complete final repository and runtime review before merge.

---

# 3. Repository Is the Source of Truth

Documentation defines the approved architectural direction.

The repository defines the current implementation.

Approved live-infrastructure findings define the verified state of systems that the repository-only agent cannot inspect directly.

When these sources differ, report the difference rather than assuming one is incorrect.

Before proposing implementation changes, inspect the repository for:

- Existing files and exact paths
- Current routes
- Current loaders
- Current services
- Current repositories
- Current rules
- Existing domain types
- Generated Supabase types
- Committed migrations
- Committed SQL functions and policies
- Existing role and authorization checks
- Downstream callers
- Current tests
- Current documentation references

Do not attempt to replace live database inspection with assumptions based only on TypeScript types or migration history.

Never assume the following exist or work simply because documentation describes the desired future architecture:

- Tables
- Columns
- Foreign keys
- Indexes
- Grants
- RLS policies
- Services
- Relationships
- Authorization
- Runtime integration

If implementation differs from documentation:

- Report the difference.
- Explain whether the difference appears transitional, stale, or conflicting.
- Recommend the preferred direction.
- Do not silently overwrite existing architecture.

If the repository differs from approved live Supabase findings:

- Report the exact discrepancy.
- Identify whether the repository or live database appears ahead.
- Do not guess which side should be changed.
- Wait for owner approval before broad implementation.

---

# 4. Planning Before Coding

Large architectural work should begin with investigation.

The repository-only agent should inspect what it can access and clearly separate:

- Verified repository facts
- Approved live-infrastructure findings provided by the owner
- Assumptions
- Unknowns
- Items requiring separate Supabase verification

Before broad implementation, provide:

1. Existing repository implementation findings
2. Existing migration and generated-type findings
3. Existing authorization findings visible in the repository
4. Approved live-database findings provided by the owner
5. Known repository-to-database discrepancies
6. Compatibility concerns
7. Proposed implementation plan
8. Expected affected files
9. Required migration files
10. Testing strategy
11. Runtime verification requirements
12. Rollback considerations
13. Questions requiring owner approval

Do not begin major implementation until the proposed plan has been reviewed.

Do not spend implementation-agent tokens repeatedly attempting to access unavailable live infrastructure.

---

# 5. Division of Responsibilities

## Repository Implementation Agent

The implementation agent is responsible for:

- Reading required documentation
- Inspecting current repository code
- Inspecting committed migrations
- Inspecting generated types
- Finding integration points
- Reporting repository dependencies
- Proposing code and migration changes
- Implementing approved application code
- Creating committed migration files
- Updating tests
- Updating documentation
- Reporting what was and was not verified

The implementation agent must not claim it has:

- Inspected live production data
- Applied a live migration
- Verified live RLS
- Verified live grants
- Run live Supabase advisors
- Confirmed live database runtime behavior

unless that access was explicitly provided and actually used.

## Project Owner or Authorized Infrastructure Reviewer

The project owner or authorized reviewer is responsible for:

- Inspecting the live Supabase schema
- Inspecting live RLS policies
- Inspecting grants
- Inspecting indexes
- Inspecting functions and triggers
- Reviewing schema drift
- Reviewing representative production data shape
- Applying approved migrations
- Verifying migration results
- Running Supabase Security Advisors
- Running Supabase Performance Advisors
- Performing live runtime verification
- Providing authoritative findings back to the implementation agent

## Shared Responsibility

Both sides must compare:

- Repository migrations
- Generated types
- Application queries
- Live schema findings
- RLS expectations
- Runtime behavior

Neither side should silently assume the other is already synchronized.

---

# 6. Development Principles

Every implementation should:

- Preserve production behavior unless explicitly approved.
- Prefer additive migrations over destructive changes.
- Maintain backwards compatibility during migration.
- Keep pull requests focused on one primary objective.
- Update documentation when architectural decisions change.
- Follow the established Route → Loader → Service → Repository architecture.
- Keep business logic outside UI components.
- Keep authorization server-side.
- Respect Row Level Security.
- Generate updated Supabase types after verified schema changes.
- Avoid duplicated business logic.
- Avoid broad service-role bypasses.
- Avoid trusting client-supplied identity or role information.
- Avoid changing schema or policies outside committed migrations.
- Clearly identify work that still requires live infrastructure verification.

When uncertain, choose the solution that is easier to maintain, easier to test, and easier to extend.

---

# 7. Supabase Change Workflow

When a feature requires Supabase changes, use this workflow:

1. The authorized reviewer inspects the live schema and provides findings.
2. The repository agent inspects current migrations, generated types, and application usage.
3. The repository agent proposes migration SQL and integration changes.
4. The owner reviews and approves the plan.
5. The repository agent commits the migration file.
6. The authorized reviewer reviews the committed migration against the live database.
7. The authorized reviewer applies the approved migration.
8. The authorized reviewer verifies tables, columns, constraints, policies, grants, indexes, and advisor findings.
9. The repository agent updates generated types and code as needed.
10. Final runtime verification occurs before merge.

A committed migration is not proof of a completed database change.

A successful build is not proof that a Supabase query works at runtime.

A passing migration is not proof that authorization is secure.

---

# 8. Documentation Responsibilities

Documentation is considered part of the product.

When architecture changes:

- Update the appropriate source-of-truth document.
- Avoid creating duplicate documentation.
- Prefer extending existing documents when the subject already exists.
- Clearly identify whether a feature is Planned, In Progress, Foundation Complete, Connected, Runtime Verified, or Production Verified.
- Record known infrastructure limitations.
- Record whether live Supabase verification has occurred.
- Record migration status separately from application-code status.

If documentation changes are needed, include them in the same pull request whenever practical.

Do not mark a database-backed feature Production Verified until the live database and runtime behavior have been checked.

---

# 9. AI Expectations

When responding:

- Distinguish verified facts from assumptions.
- Distinguish repository findings from live-infrastructure findings.
- Explain architectural tradeoffs.
- Prefer reusable abstractions over one-off implementations.
- Keep implementations modular.
- Avoid unnecessary complexity.
- Preserve beginner-friendly code where practical.
- Recommend phased implementation for broad requests.
- Keep pull requests appropriately scoped.
- Respect existing architectural decisions unless there is a compelling reason to propose a change.
- State clearly when live Supabase verification is still pending.
- Do not waste tokens repeatedly attempting inaccessible operations.
- Do not redesign previously approved architecture without first explaining why the change is beneficial.

When approved live Supabase findings are provided, use them as authoritative input while still inspecting the repository for integration accuracy.

---

# 10. Pull Request Philosophy

RaiseHub favors small, focused pull requests.

Each PR should:

- Solve one primary problem.
- Keep unrelated changes out of scope.
- Preserve existing behavior unless intentionally changing it.
- Include documentation updates when architecture changes.
- Leave the repository in a working state after every commit.
- Clearly list migrations created.
- Clearly state whether migrations were applied.
- Clearly state what was runtime verified.
- Clearly state what remains pending.
- Avoid combining broad schema work, UI redesign, data backfill, and unrelated cleanup.

When future architectural work depends on foundations that do not yet exist, build those foundations first rather than partially implementing multiple future features in a single pull request.

Prefer several well-defined PRs over one large rewrite.

---

# 11. Verification Language

Use precise verification language.

Preferred status labels include:

- Planned
- Repository inspected
- Migration drafted
- Migration committed
- Migration applied
- Schema verified
- RLS verified
- Grants verified
- Types generated
- Foundation complete
- Connected
- Runtime verified
- Production verified
- Blocked
- Deferred

Avoid vague claims such as:

- Done
- Fully working
- Basically complete
- Database ready
- Secure
- Production ready

unless the relevant evidence exists.

Examples:

- “Migration committed; live application pending.”
- “RLS design reviewed in repository; live policy verification pending.”
- “Application build passes; runtime query not yet verified.”
- “Live schema verified by authorized reviewer on July 2026.”

---

# 12. Long-Term Direction

RaiseHub's long-term architecture is defined by:

- `ARCHITECTURE_PRINCIPLES.md`
- `docs/IDENTITY_ACCESS_MODEL.md`

These documents define the intended platform architecture.

Current production implementation may represent an intermediate stage.

Migration should occur incrementally while preserving compatibility.

Future work should continue moving the platform toward:

- One authenticated identity per person
- Multiple memberships
- Customer entitlements
- Workspace-based experiences
- Deterministic authorization
- Modular services
- Secure server-side validation
- Additive database evolution
- Verifiable infrastructure changes
- Clear separation between repository implementation and live infrastructure operations

The goal is to build RaiseHub into a platform that remains understandable, maintainable, secure, scalable, and enjoyable to develop for years to come.

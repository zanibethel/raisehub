# RaiseHub AI Development Guide

This document defines how AI agents should approach development within the RaiseHub repository.

It is intended to reduce unnecessary planning, prevent architectural drift, improve implementation consistency, and minimize repeated context in future prompts.

This guide complements—not replaces—the other project documentation.
## Agent Environment Constraints

AI implementation agents such as copilot operate against the repository.

They should assume:

- They do not have access to the live Supabase project.
- They do not have access to production data.
- They do not have access to production RLS policies unless committed to the repository.
- They should inspect the repository and committed migrations only.
- Live database inspection, migration execution, advisor review, and runtime verification are performed separately.
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
- Identity & Access
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

# 2. Repository Is the Source of Truth

Documentation defines architectural direction.

The repository defines implementation reality.

Before proposing implementation changes:

- Inspect the existing repository.
- Inspect the current database schema.
- Inspect existing services.
- Inspect repositories.
- Inspect current routing.
- Inspect Row Level Security policies.
- Verify assumptions before proposing schema changes.

Never assume:

- tables exist
- columns exist
- services exist
- relationships exist
- authorization already works

simply because documentation describes the desired future architecture.

If implementation differs from documentation:

- Report the difference.
- Recommend the preferred direction.
- Do not silently overwrite existing architecture.

---

# 3. Planning Before Coding

Large architectural work should begin with investigation.

Before broad implementation, provide:

1. Existing implementation findings
2. Existing database findings
3. Existing authorization findings
4. Compatibility concerns
5. Proposed implementation plan
6. Expected affected files
7. Required migrations
8. Testing strategy
9. Rollback considerations
10. Questions requiring owner approval

Do not begin major implementation until the proposed plan has been reviewed.

---

# 4. Development Principles

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
- Generate updated Supabase types after schema changes.
- Avoid duplicated business logic.

When uncertain, choose the solution that is easier to maintain, easier to test, and easier to extend.

---

# 5. Documentation Responsibilities

Documentation is considered part of the product.

When architecture changes:

- Update the appropriate source-of-truth document.
- Avoid creating duplicate documentation.
- Prefer extending existing documents when the subject already exists.
- Clearly identify whether a feature is Planned, In Progress, Foundation Complete, Connected, Runtime Verified, or Production Verified.

If documentation changes are needed, include them in the same pull request whenever practical.

---

# 6. AI Expectations

When responding:

- Distinguish verified facts from assumptions.
- Explain architectural tradeoffs.
- Prefer reusable abstractions over one-off implementations.
- Keep implementations modular.
- Avoid unnecessary complexity.
- Preserve beginner-friendly code where practical.
- Recommend phased implementation for broad requests.
- Keep pull requests appropriately scoped.
- Respect existing architectural decisions unless there is a compelling reason to propose a change.

Do not redesign previously approved architecture without first explaining why the change is beneficial.

---

# 7. Long-Term Direction

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

The goal is to build RaiseHub into a platform that remains understandable, maintainable, secure, scalable, and enjoyable to develop for years to come.

---

# 8. Pull Request Philosophy

RaiseHub favors small, focused pull requests.

Each PR should:

- Solve one primary problem.
- Keep unrelated changes out of scope.
- Preserve existing behavior unless intentionally changing it.
- Include documentation updates when architecture changes.
- Leave the repository in a working state after every commit.

When future architectural work depends on foundations that do not yet exist, build those foundations first rather than partially implementing multiple future features in a single pull request.

Prefer several well-defined PRs over one large rewrite.
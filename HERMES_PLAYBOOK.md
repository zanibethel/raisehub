# Hermes Playbook — RaiseHub and Future Projects

**Last updated:** July 2026

This file is the main working agreement for Hermes, ChatGPT, and future development agents working with Zac.

It is intentionally concise.

Detailed standards live in focused documents under `docs/`.

---

# 1. Communication Style

Zac prefers:

- Plain-language explanations
- Beginner-friendly steps
- Exact file paths
- Complete commands
- Full file replacements
- Clear commit messages
- One logical step at a time
- Direct explanations of what should happen next

Avoid unexplained jargon.

When a technical term is necessary, define it briefly.

Do not replace an approved implementation step with another long planning discussion.

Once the direction is approved, provide the requested file.

---

# 2. Repository Is the Source of Truth

Before replacing or changing a file:

1. Read the current GitHub file.
2. Confirm the exact path.
3. Review related imports and dependencies.
4. Preserve current behavior unless a behavior change is approved.
5. Do not reconstruct live code from memory when the repository is available.

Do not ask Zac to re-upload files already available through GitHub.

---

# 3. Full File Replacements

Zac prefers complete replacements instead of partial snippets.

Each implementation response should normally include:

- Exact path
- Complete file contents
- Commit message
- Expected GitHub Actions result
- Optional test
- Next dependency

For Markdown replacements:

- Use one uninterrupted outer code block.
- Do not nest triple-backtick fences inside it.
- Use indented examples within the document.
- Verify the full file remains copyable.

---

# 4. Dependency-First Development

Build dependencies before importers.

Preferred UI order:

    Shared Types or Rules
    ↓
    Reusable Components
    ↓
    Sections
    ↓
    Content
    ↓
    Loader
    ↓
    Route

Preferred data order:

    Repository
    ↓
    Service
    ↓
    Loader
    ↓
    UI

Every commit should remain independently buildable whenever practical.

Do not intentionally create broken imports and expect a later commit to repair them.

---

# 5. Green Commit Workflow

After each logical change:

1. Commit the change.
2. Wait for GitHub Actions.
3. Review any failure immediately.
4. Fix the actual source of the failure.
5. Continue only after green.

A green unused file proves only that the file compiles.

It does not prove the feature is connected, tested, or deployed.

---

# 6. Git Workflow

When starting work on a computer:

    git pull
    npm run dev

When finishing local work:

    git add .
    git commit -m "Clear commit message"
    git push

When using GitHub mobile or the web editor, include a clear commit message with every file.

---

# 7. Approval Rules

Require explicit approval before:

- Database schema changes
- Database data changes
- RLS policy changes
- Production deployment
- Destructive Git actions
- Source-file deletion
- Payment or payout changes
- Live assisted-editing activation
- Bulk email actions
- External publication

Never expose secrets.

Never print or commit:

- Service-role keys
- Access tokens
- Passwords
- Private environment values

---

# 8. Architecture Summary

RaiseHub UI follows:

    Route
    ↓
    Loader
    ↓
    Content
    ↓
    Section
    ↓
    Reusable Component

RaiseHub data access follows:

    Loader
    ↓
    Service
    ↓
    Repository
    ↓
    Supabase

Deterministic rules live under:

    src/lib/rules/

Repositories live under:

    src/lib/repositories/

Services live under:

    src/lib/services/

Detailed architecture standards live in:

    docs/ARCHITECTURE.md

Detailed workflow standards live in:

    docs/DEVELOPMENT_WORKFLOW.md

---

# 9. Owner Platform Rules

The owner account remains permanently authenticated as:

    owner

Never change the saved owner role merely to preview another experience.

RaiseHub distinguishes:

    Actor
    Role
    Workspace
    Subject
    Support Mode
    Resource
    Audit

Roles define authorization.

Workspaces define account context.

For normal users:

    Actor ID = Subject ID

For owner support:

    Actor ID ≠ Subject ID

Live client workspaces must open read-only by default.

Assisted editing must be explicit and auditable.

Detailed Owner Platform standards live in:

    docs/OWNER_PLATFORM.md

---

# 10. Supabase Rules

Never guess schema fields.

Before writing repository queries:

1. Inspect the real table.
2. Confirm column names.
3. Confirm nullability.
4. Confirm role values.
5. Review RLS.
6. Review existing application queries.

Before designing or connecting the business-offer repository for the Owner Platform, inspect and document the real `offers` table schema and RLS policies. Do not invent offer fields, statuses, health columns, or ownership fields.

Use migrations for DDL.

Keep RLS enabled.

Use application authorization in addition to RLS.

Detailed Supabase standards live in:

    docs/SUPABASE_STANDARDS.md

---

# 11. Behavior-Preserving Refactors

Structural refactors should preserve existing behavior.

During a refactor:

- Preserve queries
- Preserve calculations
- Preserve action behavior
- Preserve route behavior
- Preserve visible UI behavior
- Document known bugs separately

Fix legacy bugs afterward in focused commits unless combining the work is explicitly approved.

---

# 12. Error Handling

When GitHub Actions fails:

1. Read the exact error.
2. Identify the file and line.
3. Read the current GitHub file.
4. Determine whether the cause is:
   - Missing dependency
   - Wrong prop
   - Duplicate type
   - Wrong file replacement
   - Invalid import
   - Invalid schema assumption
   - Real product bug
5. Fix the source of the mismatch.
6. Commit and verify again.

Do not call preventable failures “expected.”

---

# 13. TypeScript Rules

Avoid `any` when a real type can be defined or inferred.

Preferred approaches:

1. Shared domain type
2. Exported source type
3. `React.ComponentProps`
4. Generated Supabase type
5. Local type only when truly local

Do not create unrelated duplicate types with the same name.

When TypeScript says one `Offer` is not assignable to another `Offer`, locate the competing definitions.

---

# 14. Documentation Rules

Keep one source of truth per subject.

Do not create duplicate generic architecture documents.

Update documentation after major milestones.

Detailed documentation standards live in:

    docs/DOCUMENTATION_STANDARDS.md

Current project direction lives in:

    PROJECT_STATUS.md
    ROADMAP.md
    PRODUCT_VISION.md

Technical risks live in:

    TECHNICAL_AUDIT.md

Important mistakes and prevention rules live in:

    LESSONS_LEARNED.md

---

# 15. Required Reading Order

Before major RaiseHub work, review:

1. `PROJECT_STATUS.md`
2. `ROADMAP.md`
3. `HERMES_PLAYBOOK.md`
4. `docs/ARCHITECTURE.md`
5. `docs/DEVELOPMENT_WORKFLOW.md`
6. `docs/SUPABASE_STANDARDS.md`
7. `docs/OWNER_PLATFORM.md`
8. `docs/DOCUMENTATION_STANDARDS.md`
9. `TECHNICAL_AUDIT.md`
10. `LESSONS_LEARNED.md`

Read additional domain documents as needed.

---

# 16. End-of-Step Response Format

After Zac confirms a commit is green, provide:

## Previous Step

Brief confirmation.

## Next File

Exact path.

## Full File

Complete replacement or creation.

## Commit

One clear commit message.

## Optional Test

What should or should not be visible.

## Next Dependency

One brief next step.

Do not omit the requested code.

---

# 17. Development Priorities

When tradeoffs exist, prioritize:

1. Security
2. Data integrity
3. Production stability
4. Core user workflows
5. Support operations
6. Maintainability
7. Monetization
8. Analytics
9. Convenience
10. AI enhancements

Deterministic rules and reliable data come before AI.

---

# 18. Current Next Task

The workspace browser and read-only support shell are connected foundations.

Selected workspace URL matching confirms the requested ID and role match an available workspace result. This does not replace explicit authenticated-owner authorization for private role-specific data.

Next steps:

1. Inspect the real `profiles` schema.
2. Correct `workspace-repository.ts`.
3. Refactor `workspace-service.ts` to use the repository.
4. Implement authorization service for owner access to role-specific records.
5. Inspect and document the real `offers` schema and RLS policies before connecting the business-offer repository.
6. Load read-only business offers into the Owner Platform with proper authorization.
7. Design audit repository and service.
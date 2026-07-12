# RaiseHub Development Workflow

**Last updated:** July 2026

This document defines the standard workflow for making safe, reviewable changes to RaiseHub.

---

# 1. Core Workflow

For every meaningful change:

1. Read the current repository files.
2. Identify the dependency order.
3. Make one logical change.
4. Commit the change.
5. Wait for GitHub Actions.
6. Fix any failure before continuing.
7. Test the connected feature when applicable.
8. Update documentation after meaningful milestones.

The repository is the source of truth.

Do not reconstruct current production logic from memory when the relevant file can be read from GitHub.

---

# 2. Dependency-First Development

Build from the bottom of the dependency graph upward.

## UI Changes

Preferred order:

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

## Data Changes

Preferred order:

    Repository
    ↓
    Service
    ↓
    Loader
    ↓
    UI

A dependency should exist before another file imports it whenever practical.

This prevents avoidable broken imports and keeps each commit independently buildable.

---

# 3. Dashboard Architecture

Role dashboards should follow:

    Route
    ↓
    Dashboard Loader
    ↓
    Dashboard Content
    ↓
    Sections
    ↓
    Reusable Components

## Route

Responsible for:

- Authentication
- High-level authorization
- Role selection
- Redirects
- Minimal orchestration

Routes should not contain large role-specific implementations.

## Loader

Responsible for:

- Loading data
- Calling services
- Preparing props
- Resolving the authenticated actor or selected workspace

Loaders should not contain large UI sections.

## Content

Responsible for:

- Layout
- Section composition
- Modal state
- Passing prepared props
- Client-side interaction state

Content components should not query the database.

## Sections

Each section should represent one clear feature area.

Examples:

- Dashboard snapshot
- Offers
- Saved deals
- Campaigns
- Reports
- Top sellers
- Workspace selector

---

# 4. Behavior-Preserving Refactors

A structural refactor should preserve existing product behavior.

During a refactor:

- Preserve queries
- Preserve calculations
- Preserve route behavior
- Preserve action behavior
- Preserve visible UI behavior
- Document known legacy bugs separately

Fix known bugs in later focused commits unless the combined change is explicitly approved.

This makes regressions easier to diagnose.

---

# 5. Large-File Refactoring

Avoid repeatedly editing a large production entry file.

Preferred strategy:

1. Create replacement dependencies.
2. Verify each file independently.
3. Keep the current implementation working.
4. Build the new loader and content layers.
5. Replace the entry file once.
6. Test every affected role or workflow.

Example:

    Build sections
    ↓
    Build content
    ↓
    Build loader
    ↓
    Replace page.tsx once

---

# 6. Git Workflow

## Starting Work

When switching machines or resuming local work:

    git pull
    npm run dev

Always pull before editing.

## Finishing Work

Use:

    git add .
    git commit -m "Clear commit message"
    git push

When editing through GitHub mobile or the web interface, include a clear commit message with every file.

---

# 7. Commit Standards

Each commit should represent one logical operation.

Good examples:

- Add workspace card
- Add workspace selector
- Create workspace repository
- Connect workspace service to repository
- Route owner accounts to Platform Console

Avoid combining:

- Unrelated features
- Refactors and product changes
- Database work and UI cleanup
- Large documentation rewrites and runtime code changes

## Green Commit Rule

Every commit should remain independently buildable whenever practical.

Correct sequence:

    Create dependency
    ↓
    Commit
    ↓
    Verify green
    ↓
    Create importer

Do not knowingly create a broken commit with the expectation that the next commit will repair it.

---

# 8. GitHub Actions

GitHub Actions runs after each commit.

When a check fails:

1. Read the exact error.
2. Identify the file and line.
3. Read the current GitHub file.
4. Determine the real source of the mismatch.
5. Provide or apply one focused correction.
6. Commit and verify again.

Common failure categories:

- Missing dependency
- Incorrect prop name
- Duplicate or conflicting types
- Wrong file replacement
- Invalid import path
- Invalid schema assumption
- Real product bug

CI should verify the work.

It should not replace reading the source code or planning dependency order.

---

# 9. TypeScript Standards

Avoid `any` when a real type can be defined or inferred.

Preferred approaches:

1. Import a shared domain type.
2. Export the type from the source component.
3. Infer wrapper props with `React.ComponentProps`.
4. Use generated Supabase types.
5. Create a local type only when the object is truly local.

## Duplicate Types

Do not create competing local types for the same domain object.

Errors such as:

    Type 'Offer[]' is not assignable to type 'Offer[]'

usually indicate that two unrelated types share the same name.

Find the actual source of truth instead of repeatedly making fields optional.

---

# 10. Repository and Service Boundaries

## Repositories

Location:

    src/lib/repositories/

Responsibilities:

- Supabase queries
- Database inserts
- Database updates
- Database deletes when approved
- Database-specific field selection
- Returning raw or lightly normalized records

Repositories should not decide product behavior.

## Services

Location:

    src/lib/services/

Responsibilities:

- Calling repositories
- Authorization coordination
- Mapping records to application models
- Sorting
- Filtering
- Combining data
- Applying deterministic rules
- Coordinating audit logging

Services should not contain raw Supabase queries when a repository exists for the same domain.

Preferred flow:

    Loader
    ↓
    Service
    ↓
    Repository
    ↓
    Supabase

---

# 11. Schema Verification

Before writing or changing a repository query:

1. Inspect the real table schema.
2. Review existing application queries.
3. Confirm column names.
4. Confirm nullability.
5. Confirm role values.
6. Confirm RLS behavior.
7. Confirm ownership relationships.

A green TypeScript build does not prove a Supabase query is valid at runtime.

Do not guess database column names.

---

# 12. Testing States

Keep these states distinct.

## File Complete

The file exists and compiles.

## Dependency Complete

The importing file exists and compiles.

## Route Connected

The application renders the feature.

## Runtime Verified

The feature was manually tested.

## Production Verified

The deployed application was checked.

Do not claim a feature is live merely because an unused file compiles.

---

# 13. Full File Replacements

Zac prefers complete file replacements.

Each response should normally include:

- Exact file path
- Complete file contents
- Commit message
- Expected GitHub Actions result
- Optional test
- Next dependency

Do not provide only fragments that require guessing how they fit.

## Markdown Files

When providing a complete Markdown replacement:

- Use one uninterrupted outer code block.
- Do not nest triple-backtick fences inside it.
- Use indented examples within the document.
- Verify that the complete file remains copyable.

---

# 14. Approval Rules

Require explicit approval before:

- Database schema changes
- Database data changes
- RLS changes
- Production deployment
- Destructive Git commands
- File deletion
- Payment or payout changes
- Live assisted-editing activation
- Bulk email actions
- External publication

Never expose secrets.

Never print service-role keys, access tokens, passwords, or environment-variable values.

---

# 15. Documentation Workflow

Update documentation after major milestones.

## Project Status

Update when:

- The active sprint changes
- A major feature completes
- A blocker is discovered
- Architecture changes
- Launch readiness changes

## Roadmap

Update when:

- Priorities change
- New phases are approved
- Major features complete
- Security work changes the sequence

## Lessons Learned

Record:

- Root causes
- Preventable mistakes
- Production risks
- Important architectural decisions
- Prevention rules

## Architecture

Update architecture documents when responsibility boundaries or system models change.

Avoid creating duplicate documents that cover the same subject.

---

# 16. End-of-Step Response

After Zac confirms a commit is green, provide:

## Previous Step

Briefly confirm the completed file or commit.

## Next File

Provide the exact path.

## Full File

Provide the full replacement or creation.

## Commit

Provide one clear commit message.

## Optional Test

Explain what should or should not be visible.

## Next Dependency

Name the next step briefly.

Do not replace the requested implementation with another broad planning speech.

---

# 17. Development Priorities

When tradeoffs exist, prioritize:

1. Security
2. Data integrity
3. Production stability
4. Core workflows
5. Support operations
6. Maintainability
7. Monetization
8. Analytics
9. Convenience
10. AI enhancements

Deterministic rules and reliable data come before AI.

---

# 18. Current Working Principle

Build dependencies first.

Keep each commit green.

Read the real file before replacing it.

Preserve behavior during structural changes.

Test connected features before calling them complete.
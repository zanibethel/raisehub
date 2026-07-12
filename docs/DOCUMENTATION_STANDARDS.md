# RaiseHub Documentation Standards

**Last updated:** July 2026

This document defines how RaiseHub documentation should be organized, updated, and maintained.

The goal is to keep documentation useful, current, easy to navigate, and free from unnecessary duplication.

---

# 1. Documentation Principles

RaiseHub documentation should be:

- Current
- Focused
- Easy to scan
- Clear about ownership
- Explicit about status
- Honest about known risks
- Organized by purpose
- Safe for future developers and AI agents to follow

Documentation should explain:

- What exists
- Why it exists
- How it should be used
- What remains incomplete
- Which document is the source of truth

---

# 2. One Document Per Purpose

Avoid creating multiple documents that explain the same subject.

Before adding a new document:

1. Search the repository.
2. Read related files.
3. Identify the existing source of truth.
4. Update the existing file when practical.
5. Create a new file only when the subject is clearly distinct.

Examples of distinct purposes:

- Project status
- Product roadmap
- Architecture
- Development workflow
- Supabase standards
- Owner Platform
- Demo strategy
- Lessons learned
- Technical audit
- Launch planning

Avoid duplicate generic architecture files.

Current architecture-related sources include:

    docs/ARCHITECTURE.md
    ARCHITECTURE_PRINCIPLES.md

---

# 3. Core Documentation Map

## Project Direction

### `PROJECT_STATUS.md`

Purpose:

- Current product state
- Current sprint
- Completed milestones
- Known blockers
- Immediate next steps
- Launch readiness

This file should describe what is true now.

### `ROADMAP.md`

Purpose:

- Future phases
- Planned work
- Priority order
- Long-term direction
- Version targets

This file should describe what comes next.

### `PRODUCT_VISION.md`

Purpose:

- Mission
- Product philosophy
- User value
- Long-term product identity
- Intelligence strategy
- Competitive direction

This file should explain why RaiseHub exists and where it is headed.

---

## Architecture and Engineering

### `docs/ARCHITECTURE.md`

Purpose:

- System architecture
- Layer responsibilities
- Folder structure
- Major technical patterns
- Owner and workspace architecture
- Data flow

This is the main technical architecture source.

### `ARCHITECTURE_PRINCIPLES.md`

Purpose:

- Stable design principles
- Long-term architectural values
- High-level engineering constraints

This should remain more principle-focused than implementation-focused.

### `docs/DEVELOPMENT_WORKFLOW.md`

Purpose:

- Dependency-first development
- Git workflow
- GitHub Actions workflow
- Refactor workflow
- Full replacement standards
- End-of-step response format

### `docs/SUPABASE_STANDARDS.md`

Purpose:

- Database standards
- Migration standards
- RLS standards
- Repository and service boundaries
- Data integrity
- Environment separation
- Audit and support data

### `docs/OWNER_PLATFORM.md`

Purpose:

- Owner identity
- Workspace model
- Preview mode
- Support mode
- Assisted editing
- Audit logging
- Owner Platform Console

### `HERMES_PLAYBOOK.md`

Purpose:

- Short entry point
- Communication preferences
- Approval rules
- Required reading order
- Links to detailed standards

The playbook should remain concise and should not duplicate entire standards documents.

---

## Operations and Risk

### `TECHNICAL_AUDIT.md`

Purpose:

- Verified technical findings
- Severity
- Root causes
- Recommended remediation
- Resolved and unresolved risks

### `LESSONS_LEARNED.md`

Purpose:

- Important mistakes
- Root causes
- Prevention rules
- Architectural lessons
- Production gotchas

### `DEMO_EXPERIENCE.md`

Purpose:

- Demo vision
- Demo behavior
- Demo UI
- Demo data expectations
- Demo CTA and messaging

### `PROJECT_STATUS.md`

Also serves as the current operational summary.

---

# 4. Status Language

Use clear status labels.

Preferred labels:

    Planned
    In progress
    Foundation complete
    Connected
    Runtime verified
    Production verified
    Blocked
    Deferred
    Resolved

Avoid vague labels such as:

    Almost done
    Basically complete
    Mostly working
    Good enough

A feature should not be marked complete merely because its table or component exists.

---

# 5. Completion Levels

Use these levels when documenting implementation progress.

## Foundation Complete

The required files or schema exist.

The feature may not yet be connected.

## Connected

The feature is wired into the application.

## Runtime Verified

The feature was manually tested.

## Production Verified

The deployed feature was checked in production.

## Complete

All required layers are implemented, authorized, tested, and documented.

Example:

A workspace selector file compiling does not mean live workspace support is complete.

---

# 6. Current Versus Historical Information

Current documents should describe the present state.

Avoid leaving stale planning sections mixed into current-status documents.

When a phase is complete:

- Mark it complete
- Move remaining items to the correct future phase
- Remove duplicate old sections
- Preserve important history in Lessons Learned or Git history

Do not keep contradictory sections such as:

    Customer dashboard complete

and later:

    Customer dashboard upcoming

in the same current-status file.

---

# 7. Updating `PROJECT_STATUS.md`

Update after:

- Major feature completion
- Major architecture change
- New blocker discovery
- Blocker resolution
- Sprint change
- Launch-readiness change
- Production incident
- Major database change

Recommended sections:

- Current version
- Current product position
- Current sprint
- Completed milestones
- Known issues
- Current blockers
- Immediate next task
- Launch readiness

Keep it concise enough to understand the project quickly.

---

# 8. Updating `ROADMAP.md`

Update when:

- Priorities change
- A phase completes
- A new phase is approved
- A security requirement changes sequence
- Monetization scope changes
- Launch scope changes

Roadmap items should use checkboxes when practical.

Example:

    - [x] Owner role
    - [ ] Read-only support mode
    - [ ] Assisted editing
    - [ ] Audit timeline

Do not mark items complete based only on file creation.

---

# 9. Updating Architecture Documents

Update architecture documentation when:

- Responsibility boundaries change
- A new major layer is introduced
- Folder structure changes
- Authorization models change
- Owner or workspace models change
- Repository or service patterns change
- New cross-cutting standards are adopted

Architecture documents should focus on durable design.

Temporary sprint details belong in `PROJECT_STATUS.md` or `ROADMAP.md`.

---

# 10. Updating `LESSONS_LEARNED.md`

Add a lesson when:

- A bug root cause was not obvious
- A workflow mistake caused avoidable rework
- A production risk was discovered
- A significant architectural decision was made
- A prevention rule should become permanent
- Documentation itself failed or became misleading

Each lesson should include:

## Problem

What happened?

## Root Cause

Why did it happen?

## Resolution

How was it fixed or addressed?

## Prevention

How should RaiseHub avoid repeating it?

Do not use Lessons Learned as a general progress log.

---

# 11. Updating `TECHNICAL_AUDIT.md`

Audit findings should be updated when:

- A finding is resolved
- A root cause changes
- New evidence contradicts an earlier assumption
- Architecture changes make a finding stale
- A new launch blocker is discovered

When a finding changes:

- Preserve the original context when useful
- Add a clear correction or superseding note
- Mark resolved findings explicitly
- Avoid leaving outdated recommendations as current truth

---

# 12. Full File Replacement Standards

When providing a complete Markdown replacement:

- Use one uninterrupted outer code block.
- Do not nest triple-backtick fences inside it.
- Use indented examples within the document.
- Confirm the entire file is copyable.
- Provide the exact path.
- Provide a commit message.
- Avoid splitting one file across several messages unless required.

When a replacement is malformed, regenerate the whole file.

Do not patch only the visible broken section.

---

# 13. Document Length

Documents should be focused enough to remain maintainable.

Guidelines:

- 100–300 lines is usually comfortable.
- 300–500 lines may be acceptable for detailed standards.
- Files above 500 lines should be reviewed for splitting.
- Large index documents should link to focused detail documents.

Do not split solely because of line count.

Split when the document clearly contains multiple responsibilities.

Example:

A single playbook containing workflow, Supabase, Owner Platform, architecture, and lessons should be split.

---

# 14. Index Documents

Index documents should remain concise.

Good index documents:

- `HERMES_PLAYBOOK.md`
- A future `docs/README.md`
- A short architecture index if needed

An index should:

- Explain what to read
- Link to detailed documents
- Summarize only the highest-level rules
- Avoid copying large sections from linked files

---

# 15. File Naming

Use clear uppercase Markdown names for major root documents.

Examples:

    PROJECT_STATUS.md
    ROADMAP.md
    PRODUCT_VISION.md
    HERMES_PLAYBOOK.md
    TECHNICAL_AUDIT.md
    LESSONS_LEARNED.md

Use clear uppercase names under `docs/` for focused standards.

Examples:

    docs/ARCHITECTURE.md
    docs/DEVELOPMENT_WORKFLOW.md
    docs/OWNER_PLATFORM.md
    docs/SUPABASE_STANDARDS.md
    docs/DOCUMENTATION_STANDARDS.md

Use descriptive names.

Avoid vague filenames such as:

    NOTES.md
    NEW_DOC.md
    INFO.md
    THOUGHTS.md

unless the purpose is intentionally informal.

---

# 16. Cross-References

Documents should reference related sources when useful.

Example:

    See `docs/OWNER_PLATFORM.md` for the actor, workspace, and support model.

Use repository-relative paths.

Avoid copying entire sections merely to avoid linking.

When one document supersedes another, state that clearly.

---

# 17. Dates

Add a last-updated date to major living documents.

Preferred format:

    **Last updated:** July 2026

Use exact dates when operational timing matters.

Examples:

    2026-07-11
    July 11, 2026

Avoid dates that imply precision when the exact date is unknown.

---

# 18. Facts Versus Plans

Clearly distinguish:

## Existing

Already implemented and verified.

## In Progress

Currently being built.

## Planned

Approved future direction.

## Proposed

Under discussion and not yet approved.

## Deferred

Intentionally postponed.

Do not write planned architecture as though it is already deployed.

---

# 19. Risk Documentation

When documenting risk, include:

- Severity
- Scope
- Current impact
- Future impact
- Required remediation
- Whether the issue blocks launch

Preferred severity labels:

    Critical
    High
    Medium
    Low
    Informational

Do not downplay risk merely because it has not caused visible failure yet.

---

# 20. Database Documentation

Database changes should be reflected in:

- Supabase migration history
- `docs/SUPABASE_STANDARDS.md` when standards change
- `PROJECT_STATUS.md` when capability or risk changes
- `TECHNICAL_AUDIT.md` when findings change
- `LESSONS_LEARNED.md` when an important lesson emerges

Do not rely only on the live Supabase dashboard as documentation.

---

# 21. Owner Platform Documentation

Owner Platform changes should be reflected in:

- `docs/OWNER_PLATFORM.md`
- `PROJECT_STATUS.md`
- `ROADMAP.md`
- `docs/ARCHITECTURE.md`
- `LESSONS_LEARNED.md` when new lessons emerge

Keep these concepts consistent:

    Actor
    Role
    Workspace
    Subject
    Support Mode
    Resource
    Audit

Do not use the terms interchangeably.

---

# 22. Documentation Review Checklist

Before committing documentation changes, confirm:

- The file path is correct.
- The file has one clear purpose.
- The content matches the current repository state.
- Stale sections were removed.
- Contradictory statements were resolved.
- Links and file references are correct.
- Plans are not presented as completed work.
- Known limitations are stated honestly.
- Markdown is valid.
- Full replacements are fully copyable.
- The commit message is clear.

---

# 23. Documentation Commit Standards

Documentation-only commits should remain focused.

Good examples:

    Update project status for Platform Console
    Replace roadmap with current platform plan
    Add Owner Platform architecture guide
    Add RaiseHub Supabase standards
    Add documentation standards

Avoid vague commit messages:

    Update docs
    Fix stuff
    Notes
    Changes

---

# 24. Recommended Reading Order

For a new developer or AI agent:

1. `PROJECT_STATUS.md`
2. `PRODUCT_VISION.md`
3. `ROADMAP.md`
4. `HERMES_PLAYBOOK.md`
5. `docs/ARCHITECTURE.md`
6. `docs/DEVELOPMENT_WORKFLOW.md`
7. `docs/SUPABASE_STANDARDS.md`
8. `docs/OWNER_PLATFORM.md`
9. `TECHNICAL_AUDIT.md`
10. `LESSONS_LEARNED.md`

Additional domain documents should be read as needed.

---

# 25. Current Documentation Refactor

## Complete

- `PROJECT_STATUS.md` consolidated
- `ROADMAP.md` consolidated
- `docs/DEVELOPMENT_WORKFLOW.md` added
- `docs/OWNER_PLATFORM.md` added
- `docs/SUPABASE_STANDARDS.md` added

## Next

- Add `docs/DOCUMENTATION_STANDARDS.md`
- Replace `HERMES_PLAYBOOK.md` with a concise entry point
- Split or simplify `LESSONS_LEARNED.md`
- Update `docs/ARCHITECTURE.md`
- Review `PRODUCT_VISION.md`
- Review `TECHNICAL_AUDIT.md`

---

# 26. Non-Negotiable Rules

- One source of truth per subject
- No duplicate generic architecture documents
- No contradictory current-status sections
- No nested Markdown fences in full replacements
- No claiming planned work is complete
- No silently hiding launch risks
- No giant index documents duplicating detailed guides
- Update documentation after major milestones
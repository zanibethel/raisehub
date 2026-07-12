# RaiseHub Dashboard Refactor Lessons

**Last updated:** July 2026

This document captures the architectural lessons learned while refactoring the RaiseHub dashboards into a modular, maintainable structure.

---

# Lesson 1 — Refactor Dependency-First

## Problem

Early dashboard refactors introduced imports before the dependent files existed.

GitHub Actions failed because content components referenced sections that had not yet been created.

## Root Cause

The refactor was performed from the top down instead of the bottom up.

## Resolution

RaiseHub adopted a dependency-first workflow.

Preferred order:

    Shared Types
    ↓
    Rules
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

## Prevention

Always create dependencies before importers.

Each commit should compile independently whenever practical.

---

# Lesson 2 — Preserve Behavior During Structural Changes

## Problem

It was tempting to improve existing logic while moving code.

This made regressions difficult to diagnose.

## Root Cause

Structural refactoring and feature work were happening simultaneously.

## Resolution

Behavior-preserving refactors became the default approach.

Known bugs remain documented and are fixed in separate commits.

## Prevention

During a refactor:

- Preserve queries.
- Preserve calculations.
- Preserve route behavior.
- Preserve UI behavior.
- Preserve user workflows.

Separate structural work from functional changes whenever possible.

---

# Lesson 3 — Large Entry Files Hide Responsibilities

## Problem

The original dashboard route accumulated authentication, data loading, business logic, and UI composition.

The file became difficult to reason about.

## Root Cause

Responsibilities were added over time without extraction.

## Resolution

Each responsibility moved into its own layer.

Current architecture:

    Route
    ↓
    Loader
    ↓
    Dashboard Content
    ↓
    Sections
    ↓
    Components

## Prevention

When a file grows beyond a few hundred lines, review whether multiple responsibilities are present.

Split by responsibility rather than by arbitrary line count.

---

# Lesson 4 — Wrapper Components Should Reuse Existing Types

## Problem

Wrapper components recreated prop interfaces already defined elsewhere.

Eventually the types drifted apart.

## Root Cause

Local interfaces duplicated shared models.

## Resolution

RaiseHub prefers:

1. Shared domain types.
2. Exported source types.
3. `React.ComponentProps`.

## Prevention

Infer types whenever a wrapper simply forwards props.

Avoid maintaining duplicate interfaces.

---

# Lesson 5 — TypeScript Errors Usually Point to the Real Problem

## Problem

Several compiler errors appeared unrelated to the visible component.

Examples included:

- Missing properties
- Incorrect prop names
- Duplicate Offer types

## Root Cause

The actual mismatch often existed in a dependency rather than the reported component.

## Resolution

The workflow changed to:

1. Read the error.
2. Read the referenced file.
3. Read the imported dependency.
4. Identify the true source.

## Prevention

Avoid repeatedly making fields optional until the compiler succeeds.

Instead, identify the source of truth.

---

# Lesson 6 — GitHub Actions Should Stay Green

## Problem

Allowing multiple broken commits made failures increasingly difficult to isolate.

## Root Cause

Several dependent changes were stacked together before verification.

## Resolution

Each logical step now waits for GitHub Actions.

Workflow:

    Change
    ↓
    Commit
    ↓
    Green
    ↓
    Continue

## Prevention

Treat GitHub Actions as verification after every meaningful commit.

---

# Lesson 7 — Read the Current Repository Before Replacing Files

## Problem

An incorrect replacement was generated because the expected file contents no longer matched the repository.

## Root Cause

The replacement relied on assumptions instead of the current file.

## Resolution

Repository review became part of the standard workflow.

## Prevention

Before replacing a file:

- Confirm the path.
- Read the current version.
- Verify exports.
- Verify imports.
- Confirm downstream dependencies.

---

# Lesson 8 — Documentation Should Follow the Same Architecture

## Problem

The original playbook attempted to contain every engineering rule in one document.

It became difficult to maintain.

## Root Cause

Documentation responsibilities were not separated.

## Resolution

Documentation was reorganized into focused guides:

- DEVELOPMENT_WORKFLOW
- OWNER_PLATFORM
- SUPABASE_STANDARDS
- DOCUMENTATION_STANDARDS
- Environment lessons
- Dashboard lessons

The playbook became a concise index.

## Prevention

Apply the same architectural principles to documentation that are used in application code.

Small, focused documents are easier to maintain than one massive reference.

---

# Permanent Dashboard Rules

- Build dependencies first.
- Preserve behavior while refactoring.
- One responsibility per layer.
- Keep commits green.
- Read the repository before replacing files.
- Prefer shared types.
- Use GitHub Actions continuously.
- Keep documentation modular.
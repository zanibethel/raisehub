# RaiseHub Lessons Learned

**Last updated:** July 2026

This document serves as the entry point for important engineering and architectural lessons learned while building RaiseHub.

Rather than growing into a single massive document, lessons are grouped by subject.

---

# Purpose

Lessons Learned captures:

- Root causes
- Important engineering decisions
- Production risks
- Architectural improvements
- Workflow improvements
- Prevention rules

Each lesson should answer:

- What happened?
- Why did it happen?
- How was it resolved?
- How do we avoid it again?

---

# Lesson Categories

## Environment and Data

Location:

    docs/lessons/ENVIRONMENT_AND_DATA.md

Topics include:

- Environment separation
- Supabase architecture
- Schema verification
- Financial calculations
- Demo data
- Production safety
- Database integrity

---

## Dashboard Refactor

Location:

    docs/lessons/DASHBOARD_REFACTOR.md

Topics include:

- Dependency-first refactoring
- Behavior-preserving refactors
- Dashboard architecture
- TypeScript lessons
- GitHub Actions workflow
- Documentation architecture
- Large-file decomposition

---

# When to Add a Lesson

Add a lesson when:

- A bug root cause was not obvious.
- A workflow mistake caused unnecessary work.
- A production risk was discovered.
- A significant architectural decision was made.
- A permanent prevention rule should be established.

Do not use this file as a progress log.

---

# Lesson Format

Each lesson document should use the following structure:

## Problem

What happened?

## Root Cause

Why did it happen?

## Resolution

How was it fixed?

## Prevention

How should RaiseHub avoid repeating it?

---

# Current Lesson Library

| Document | Focus |
|----------|-------|
| `docs/lessons/ENVIRONMENT_AND_DATA.md` | Supabase, environments, production safety |
| `docs/lessons/DASHBOARD_REFACTOR.md` | Dashboard architecture and refactoring |

Additional lesson documents should be created when a subject grows beyond a few related lessons.

Avoid turning this file back into a large collection of unrelated topics.

---

# Documentation Philosophy

RaiseHub documentation follows the same architectural principles as the application:

- One responsibility per document.
- Small, focused references.
- One source of truth for each subject.
- Clear cross-references.
- Easy maintenance over time.

As the platform grows, this index should remain concise while detailed lessons live in focused documents.
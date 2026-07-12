# RaiseHub Copilot Prompt Library

> Purpose:
>
> Reusable prompt templates for GitHub Copilot Agent.
>
> These templates reduce token usage, improve implementation quality,
> and keep every PR consistent.
>
> Before using any template, review:
>
> - PROJECT_STATUS.md
> - ROADMAP.md
> - PRODUCT_VISION.md
> - HERMES_PLAYBOOK.md
> - AI_DEVELOPMENT_GUIDE.md
> - Latest merged PR
>
> Never duplicate work already completed.
>
> Always update documentation before finishing.

---

# Standard Agent Rules

Every task should:

- Understand current project state
- Avoid duplicate implementations
- Preserve existing architecture
- Keep files organized
- Maintain section comments
- Leave future enhancement sections intact
- Run validation before finishing
- Update documentation when appropriate

---

# Template — New Feature

## Objective

Implement:

<feature>

---

## Review First

Read:

- PROJECT_STATUS.md
- ROADMAP.md
- PRODUCT_VISION.md
- HERMES_PLAYBOOK.md
- AI_DEVELOPMENT_GUIDE.md

Review the latest merged PR to understand current implementation.

---

## Database

Determine whether this feature requires:

- Supabase migration
- RLS updates
- Storage policy
- Seed/demo updates

If required:

Implement migration first.

---

## Implementation

Implement the feature while:

- following current architecture
- keeping components reusable
- avoiding duplication
- minimizing breaking changes

---

## Validation

Run:

- npm run lint
- npx tsc --noEmit

Fix all issues introduced by this feature.

---

## Documentation

Update any affected documentation.

---

## Deliverables

Provide:

- code
- documentation
- PR summary

---

# Template — Dashboard Enhancement

Review existing dashboard implementation.

Improve only:

<dashboard>

Preserve existing styling.

Do not redesign unrelated sections.

Update any supporting utilities.

Validate.

Update documentation.

---

# Template — Bug Fix

Investigate:

<bug>

Find root cause.

Avoid temporary workarounds.

Implement minimal safe fix.

Validate.

Document if architecture changes.

---

# Template — UI Polish

Improve:

<page>

Focus on:

- spacing
- responsiveness
- accessibility
- consistency

Avoid functional changes unless necessary.

---

# Template — Database

Review schema.

Determine required:

- migration
- RLS
- indexes
- constraints

Implement migration.

Update documentation describing new schema.

---

# Template — Documentation

Review all project documentation.

Update only sections affected by this PR.

Do not duplicate information.

Keep documentation concise.

---

# Template — PR Cleanup

Review entire PR.

Look for:

- unnecessary files
- duplicated code
- package-lock changes
- dead code
- debugging statements
- inconsistent naming

Fix before merge.

---

# Template — Release Readiness

Review implementation against:

PROJECT_STATUS.md

Identify:

- blockers
- missing validation
- documentation gaps
- production risks

Fix all reasonable issues within scope.

---

# Template — Multi-Feature Batch

Implement the following related tasks in one PR:

1.
2.
3.

Share utilities whenever appropriate.

Avoid duplicated implementations.

Keep commits focused.

Update documentation once after all work is complete.

---

# Review Checklist

Before completing every task confirm:

- Database reviewed
- RLS reviewed
- Types updated
- Components reusable
- TypeScript clean
- Lint clean
- Documentation updated
- No unnecessary dependency changes
- No package-lock changes unless dependencies changed
- No debug code
- Future enhancement sections preserved

---

# RaiseHub Development Philosophy

Architecture first.

Documentation second.

Implementation third.

Every merged PR should leave the project in a better state than before.

Favor reusable components over quick fixes.

Prefer extending existing systems instead of introducing parallel implementations.

Minimize technical debt with every change.
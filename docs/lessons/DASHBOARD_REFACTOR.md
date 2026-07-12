# RaiseHub Dashboard Refactor Lessons

**Last updated:** July 2026

This document records the technical and workflow lessons learned while refactoring RaiseHub’s dashboards into a modular architecture.

---

# 1. Refactor Dependency-First

## Problem

Some early refactor commits imported files that had not been created yet.

This caused avoidable GitHub Actions failures.

## Root Cause

The refactor was approached from the top of the dependency graph downward.

For example, a loader or content component was created before its required sections existed.

## Resolution

RaiseHub adopted a dependency-first migration order.

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

## Prevention

- Create dependencies before importers.
- Keep each commit independently buildable whenever practical.
- Do not knowingly create broken imports.
- Wait for GitHub Actions to turn green before continuing.
- Use CI to verify work, not to discover preventable dependency mistakes.

---

# 2. Build Replacements Before Editing Large Entry Files

## Problem

The original dashboard route contained authentication, role routing, data queries, calculations, and UI for several account types.

Repeatedly editing the route created unnecessary risk.

## Root Cause

The route had accumulated too many responsibilities over time.

## Resolution

Each role dashboard was built separately before the route was replaced.

The replacement order was:

    Sections
    ↓
    Content
    ↓
    Loader
    ↓
    Route switch-over

The old inline implementations remained in place until all replacements compiled.

## Prevention

For large production files:

1. Build the replacement architecture first.
2. Verify each dependency.
3. Preserve the current entry point.
4. Perform one final switch-over.
5. Remove obsolete inline implementations in the controlled replacement.

Avoid repeatedly modifying a large live route during extraction.

---

# 3. Preserve Behavior During Structural Refactors

## Problem

It was tempting to fix known bugs while moving dashboard code into new files.

That would make regressions harder to diagnose.

## Root Cause

Structural refactoring and product-behavior changes were treated as the same kind of work.

## Resolution

RaiseHub adopted behavior-preserving refactors.

During extraction, the goal was to preserve:

- Queries
- Calculations
- Actions
- Routes
- User-visible behavior
- Existing ownership assumptions

Known bugs were documented for separate follow-up commits.

## Prevention

Do not mix broad refactoring with intentional behavior changes unless explicitly approved.

Use this order:

    Preserve behavior
    ↓
    Verify modular replacement
    ↓
    Fix known bug separately

This makes it clear whether a failure came from the move or the functional change.

---

# 4. Read the Current Repository File Before Replacing It

## Problem

A campaigns component was accidentally placed in the Top Sellers file.

The resulting TypeScript errors appeared in a downstream content component and were initially confusing.

## Root Cause

The exact repository file and path were not verified immediately before the replacement was provided.

## Resolution

The current GitHub files were reviewed.

The Top Sellers component was restored, and the campaign component was placed in the correct file.

## Prevention

Before every full replacement:

- Confirm the exact path.
- Read the current file.
- Verify the exported component name.
- Verify imports.
- Check the downstream caller.
- Confirm the replacement belongs in that file.

When a component appears to accept unrelated props, inspect whether the wrong file content was pasted.

---

# 5. TypeScript Errors Often Reveal Competing Sources of Truth

## Problem

Customer dashboard components produced errors such as:

    Type 'Offer[]' is not assignable to type 'Offer[]'.
    Two different types with this name exist.

## Root Cause

Several files independently recreated the same domain object.

The definitions drifted in areas such as:

- Required versus optional fields
- `null` versus `undefined`
- Missing date properties
- Business-name requirements

## Resolution

Shared or inferred types were used instead of maintaining unrelated local interfaces.

## Prevention

Preferred order:

1. Use a shared domain type.
2. Export the type from the source component.
3. Infer wrapper props with `React.ComponentProps`.
4. Use generated Supabase types.
5. Create a local type only when the value is truly local.

Do not repeatedly make fields optional just to silence the compiler.

Find and use the real source of truth.

---

# 6. Wrapper Components Should Reuse Wrapped Component Types

## Problem

A wrapper component recreated the prop type expected by the component it rendered.

The two definitions eventually became incompatible.

## Root Cause

The wrapper duplicated a contract it did not own.

## Resolution

The wrapper inferred the original component’s props.

Example:

    type AvailableOffersProps = React.ComponentProps<
      typeof AvailableOffersSection
    >

A specific prop can then be reused through:

    AvailableOffersProps['offers']

## Prevention

When a component primarily forwards props to another component, infer those props instead of recreating them.

Use a shared domain model instead when several unrelated features consume the same object.

---

# 7. GitHub Actions Should Stay Green Between Logical Steps

## Problem

Stacking several uncertain changes would have made failures harder to isolate.

## Root Cause

Large refactors naturally encourage batching related files together.

## Resolution

RaiseHub used one logical commit at a time.

Workflow:

    Create one dependency
    ↓
    Commit
    ↓
    Wait for green
    ↓
    Continue

## Prevention

- Keep commits focused.
- Review every red result immediately.
- Do not continue stacking changes on top of a failure.
- Treat each green result as confirmation of that specific step.
- Do not treat green as proof that an unfinished feature is connected or tested.

---

# 8. A Green Build Does Not Prove Runtime Integration

## Problem

Several new components compiled successfully before anything imported them.

This was useful for dependency-first work, but it did not prove the feature was active.

## Root Cause

Compile-time success and runtime completion were occasionally discussed as though they were the same.

## Resolution

RaiseHub now distinguishes these implementation states.

## File Complete

The file exists and compiles.

## Dependency Complete

The importer exists and compiles.

## Route Connected

The application renders the feature.

## Runtime Verified

The feature was manually tested.

## Production Verified

The deployed application was checked.

## Prevention

State the real completion level.

Do not claim a feature is live because an unused file passes type checking.

---

# 9. Routes Should Orchestrate, Not Implement Entire Products

## Problem

The original dashboard route had grown into a large all-in-one file.

It was responsible for too many account experiences.

## Root Cause

Role-specific functionality had accumulated directly in the route.

## Resolution

The final route became responsible for:

- Authentication
- Profile lookup
- Role selection
- Shared page framing
- Rendering the correct modular dashboard

Role-specific data and UI moved into their own folders.

## Prevention

Use:

    Route
    ↓
    Role Loader
    ↓
    Content
    ↓
    Sections

Keep route files focused on orchestration.

---

# 10. Dashboard Folders Should Follow a Consistent Shape

## Problem

Without a standard structure, every role dashboard could evolve differently.

That would make future maintenance harder.

## Root Cause

The original dashboards were implemented inside one route rather than as independent modules.

## Resolution

RaiseHub standardized dashboard folders.

Preferred structure:

    src/components/dashboards/
      business/
        business-dashboard.tsx
        business-dashboard-content.tsx
        sections/
        offers/

      customer/
        customer-dashboard.tsx
        customer-dashboard-content.tsx
        sections/

      organization/
        organization-dashboard.tsx
        organization-dashboard-content.tsx
        sections/

      admin/
        admin-dashboard.tsx
        admin-dashboard-content.tsx
        sections/

      owner/
        owner-dashboard.tsx
        owner-dashboard-content.tsx
        sections/

## Prevention

New role-specific dashboard features should follow the established loader, content, and section pattern.

Shared Platform Console elements belong under:

    src/components/platform/

---

# 11. Known Legacy Bugs Should Be Documented During Refactors

## Problem

The business dashboard loader preserved a legacy redemption query that may aggregate redemptions outside the current business’s own offers.

## Root Cause

The original route already used that behavior.

Changing it during extraction would have mixed a bug fix into the structural refactor.

## Resolution

The modular loader preserved the legacy behavior.

The issue was documented for a separate bug-fix commit.

## Prevention

When a known issue is discovered during a refactor:

- Record it.
- Preserve current behavior if safe enough for the structural move.
- Finish and verify the refactor.
- Fix the issue in a focused follow-up.
- Test the corrected behavior independently.

---

# 12. Documentation Should Be Refactored Like Code

## Problem

The engineering playbook grew toward becoming one oversized document containing workflow, architecture, Supabase, Owner Platform, and documentation rules.

## Root Cause

Documentation responsibilities accumulated in one entry file.

## Resolution

The documentation was split into focused sources:

- `docs/DEVELOPMENT_WORKFLOW.md`
- `docs/OWNER_PLATFORM.md`
- `docs/SUPABASE_STANDARDS.md`
- `docs/DOCUMENTATION_STANDARDS.md`
- Focused lesson documents

`HERMES_PLAYBOOK.md` became a concise entry point.

## Prevention

Apply the same responsibility-based design to documentation:

- One purpose per document
- Concise index files
- Detailed focused guides
- Clear cross-references
- No duplicate sources of truth

---

# Permanent Dashboard Refactor Rules

- Read the repository before replacing files.
- Build dependencies before importers.
- Keep each commit green.
- Preserve behavior during structural moves.
- Fix known bugs separately.
- Use shared or inferred types.
- Keep routes focused on orchestration.
- Keep loaders focused on data preparation.
- Keep content components free of database access.
- Keep sections focused on one feature area.
- Distinguish compilation from runtime verification.
- Update documentation after architectural milestones.
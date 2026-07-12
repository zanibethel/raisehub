# RaiseHub AI Development Guide

**Last updated:** July 2026

This document defines how AI coding assistants should work inside the RaiseHub repository.

It applies to:

- GitHub Copilot
- ChatGPT
- Hermes
- Codex
- Future coding agents
- Automated review tools

The goal is to gain speed without sacrificing architecture, security, data integrity, or product consistency.

---

# 1. Required Reading Order

Before proposing or changing RaiseHub code, read:

1. `PROJECT_STATUS.md`
2. `PRODUCT_VISION.md`
3. `ROADMAP.md`
4. `HERMES_PLAYBOOK.md`
5. `docs/ARCHITECTURE.md`
6. `docs/AI_DEVELOPMENT_GUIDE.md`
7. `docs/DEVELOPMENT_WORKFLOW.md`
8. `docs/SUPABASE_STANDARDS.md`
9. `docs/OWNER_PLATFORM.md`
10. `docs/DOCUMENTATION_STANDARDS.md`
11. `TECHNICAL_AUDIT.md`
12. `LESSONS_LEARNED.md`

Read additional domain documents when the requested work touches those areas.

Do not assume one document contains the entire project context.

---

# 2. Repository Is the Source of Truth

Before editing a file:

1. Read the current repository version.
2. Confirm the exact path.
3. Review imports and exports.
4. Review downstream callers.
5. Review related types.
6. Review related services and repositories.
7. Confirm whether the feature is connected or only foundational.

Do not reconstruct live code from memory.

Do not invent a replacement based only on a screenshot or old conversation when the repository is available.

---

# 3. Product Philosophy

RaiseHub is not only a coupon application.

It is becoming the operating system for local community fundraising and business growth.

RaiseHub helps:

- Organizations raise money
- Businesses gain customers
- Customers save money
- Communities create lasting local value

Every dashboard should answer:

1. What happened?
2. What needs attention?
3. What should I do next?

The platform should recommend useful action instead of merely displaying raw data.

---

# 4. Rules Before AI

RaiseHub follows this principle:

    Rule Engine decides.
    AI explains or assists.

Deterministic rules should control:

- Financial calculations
- Campaign progress
- Offer status
- Offer health
- Account readiness
- Subscription limits
- Authorization
- Support permissions
- Audit requirements
- Platform alerts

AI may assist with:

- Marketing copy
- Offer rewrites
- Business summaries
- Promotion ideas
- Support explanations
- Documentation drafts
- Code review suggestions

AI must not become the source of truth for financial, security, or authorization decisions.

---

# 5. Required Architecture

New server-side data features should follow:

    Loader
    ↓
    Service
    ↓
    Repository
    ↓
    Supabase

UI composition should follow:

    Route
    ↓
    Loader
    ↓
    Content
    ↓
    Section
    ↓
    Reusable Component

Shared deterministic logic should live under:

    src/lib/rules/

Database access should live under:

    src/lib/repositories/

Application coordination should live under:

    src/lib/services/

Shared Owner Platform components should live under:

    src/components/platform/

Do not move responsibilities into a layer simply because it is convenient.

---

# 6. Layer Responsibilities

## Route

Routes should handle:

- Authentication entry
- Broad authorization
- Role selection
- Redirects
- Minimal orchestration

Routes should not contain large product implementations.

## Loader

Loaders should:

- Call services
- Resolve validated URL state
- Prepare content props
- Coordinate role-specific data

Legacy loaders may still contain direct Supabase access.

New features should not continue that pattern.

## Service

Services should:

- Call repositories
- Apply authorization coordination
- Map records into application models
- Sort and filter
- Combine results
- Apply deterministic rules
- Coordinate audit behavior

Services should not directly query Supabase when a repository exists.

## Repository

Repositories should:

- Query Supabase
- Select explicit columns
- Apply database filters
- Return records
- Return meaningful errors
- Perform approved database writes

Repositories should not:

- Render UI
- Decide presentation copy
- Contain React
- Silently hide failures

## Rules

Rules should:

- Be deterministic
- Be testable
- Avoid React
- Avoid database access
- Return predictable values
- Explain business decisions through structured results

## UI

UI components should:

- Display prepared data
- Manage approved interaction state
- Remain responsive
- Handle long names and emails
- Avoid database access
- Avoid hidden authorization logic

---

# 7. Owner Platform Rules

The owner profile must remain permanently:

    owner

Never change the saved owner role to preview another dashboard.

RaiseHub distinguishes:

    Actor
    Role
    Workspace
    Subject
    Support Mode
    Resource
    Audit

For standard users:

    Actor ID = Subject ID

For owner support:

    Actor ID ≠ Subject ID

Workspace switching changes account context.

It does not change authentication identity.

---

# 8. Owner Support Safety

Owner support begins read-only.

Do not add write controls to owner workspace views unless the assisted-editing architecture is explicitly approved.

Read-only support may display:

- Profile information
- Setup status
- Offers
- Campaigns
- Redemptions
- Analytics
- Account health
- Contact details

Read-only support must not expose:

- Create actions
- Edit forms
- Delete actions
- Archive actions
- Refund actions
- Payout changes
- Ownership changes
- Role changes

Assisted editing requires:

- Verified owner authorization
- Explicit activation
- Selected workspace validation
- Resource ownership validation
- Approved action scope
- Support reason
- Audit logging
- Stronger confirmation for high-risk actions

---

# 9. URL State Is Not Authorization

Owner workspace URLs may include:

    workspaceId
    workspaceRole
    supportMode

These values must be validated server-side.

Never trust:

- A workspace ID from the browser
- A requested role
- A support-mode query parameter
- A hidden button
- Client-side state

The application must confirm the selected record exists and matches the expected workspace role.

---

# 10. Supabase Rules

Never guess database columns.

Before writing a query:

1. Inspect the actual table.
2. Confirm the field names.
3. Confirm nullability.
4. Confirm foreign keys.
5. Confirm ownership relationships.
6. Review RLS.
7. Review existing queries.
8. Select only required columns.

Do not treat a green TypeScript build as proof that a Supabase query works at runtime.

RLS must remain enabled.

Do not introduce a broad service-role bypass for ordinary owner functionality.

Do not change schema or policies without explicit approval.

---

# 11. Environment Safety

Local development and production currently share the same Supabase project.

Until environment separation is complete:

**Currently blocking:**

- Assisted edits against live client accounts
- Destructive testing
- Financial feature testing
- Broad live onboarding
- Unrestricted testing of audit-producing writes

**Not blocking:**

- Read-only Owner Platform development
- Authorization service implementation
- Audit repository and service design
- Read-only audit timeline work

Continue read-only and foundational work. AI agents must call out any task that could alter production data.

Use designated demo records when possible.

Clearly distinguish demo and live data.

---

# 12. Financial Safety

Financial behavior is high risk.

Do not change without explicit approval:

- Payment status handling
- Campaign earnings
- Platform fees
- Refund calculations
- Payout logic
- Subscription billing
- Campaign progress
- Revenue reporting

Financial calculations must define:

- Included statuses
- Excluded statuses
- Refund behavior
- Currency representation
- Rounding
- Gross values
- Net values
- Platform fees

Authoritative totals should not be calculated independently in multiple UI components.

---

# 13. TypeScript Standards

Avoid `any` when a real type exists.

Preferred type sources:

1. Shared domain type
2. Generated Supabase type
3. Exported service or component type
4. `React.ComponentProps`
5. Local type for truly local values

Do not create duplicate domain types in unrelated files.

Do not make fields optional merely to silence compiler errors.

When TypeScript reports two similarly named types as incompatible, locate the competing definitions.

Type assertions should be reviewed carefully.

A type assertion does not validate runtime data.

---

# 14. Full Replacement Rules

When providing a full file replacement:

- Read the current file first.
- Provide the exact path.
- Include the complete contents.
- Keep one uninterrupted code block.
- Do not omit imports.
- Do not omit unchanged sections.
- Do not place unrelated content outside the replacement.
- Provide a clear commit message.
- Explain the expected visible or non-visible effect.

For Markdown replacements, do not nest triple-backtick fences inside the outer replacement block.

Use indented examples instead.

---

# 15. Dependency-First Development

Build dependencies before importers.

Preferred sequence:

    Shared Types
    ↓
    Rules
    ↓
    Repository
    ↓
    Service
    ↓
    Reusable Component
    ↓
    Section
    ↓
    Content
    ↓
    Loader
    ↓
    Route

Each logical commit should remain independently buildable whenever practical.

Do not intentionally create broken imports and expect a later commit to repair them.

---

# 16. Behavior-Preserving Refactors

During structural refactors:

- Preserve queries
- Preserve routes
- Preserve calculations
- Preserve user-visible behavior
- Preserve action behavior
- Preserve authorization assumptions

Document known bugs separately.

Fix known bugs in focused commits after the structural refactor unless combining the change is explicitly approved.

Do not mix cleanup, architecture changes, feature additions, and bug fixes into one broad commit.

---

# 17. Safe Cleanup Work

AI agents may propose or perform low-risk cleanup such as:

- Remove unused imports
- Remove dead local variables
- Remove obsolete debug logs
- Remove unreachable code
- Fix formatting
- Replace duplicated local helpers
- Improve semantic HTML
- Add missing labels
- Reduce obvious repetition

Safe cleanup must not change behavior.

When uncertainty exists, classify the item as `Needs Review`.

---

# 18. Changes Requiring Approval

Do not perform these without explicit approval:

- Database schema changes
- Data migrations
- RLS changes
- Auth changes
- Middleware authorization changes
- Owner permission changes
- Payment changes
- Payout changes
- Subscription changes
- Production deployment
- Destructive Git actions
- File deletion
- Bulk email
- Account role changes
- Account suspension
- Assisted-editing activation
- Audit-policy changes

A broad request such as “clean up the repo” is not approval for these categories.

---

# 19. Error Handling

Do not silently convert every error into empty data.

An empty query result and a failed query are not the same.

Repositories should return or throw meaningful failures.

Services should decide whether to:

- Return an empty state
- Log an internal error
- Stop the operation
- Redirect
- Return a typed failure
- Show a user-safe error

Do not expose SQL details, tokens, credentials, or internal stack traces to users.

---

# 20. Logging Rules

Do not log:

- Passwords
- Access tokens
- Refresh tokens
- Service-role keys
- Authorization headers
- Session contents
- Private personal data
- Payment details

Avoid unnecessary logging of public environment configuration.

Logs should be purposeful.

Debug logs should not remain in production code without a clear operational reason.

---

# 21. Testing Expectations

Current test coverage is limited.

High-priority future tests include:

- Campaign progress rules
- Payment-status filtering
- Refund-aware calculations
- Offer-health rules
- Subscription limits
- Workspace readiness
- Owner workspace resolution
- Owner authorization
- Assisted-editing restrictions
- Audit creation

Until automated tests exist, do not describe CI as full product verification.

GitHub Actions currently verifies build and type safety.

Runtime testing is still required.

---

# 22. File Size Guidance

Typical target:

    100–250 lines

Review candidate:

    More than 300 lines

Do not split a file solely because it crosses a number.

Split when it owns multiple responsibilities.

Large legacy files may remain temporarily while replacement dependencies are built.

---

# 23. Audit Output Format

When asked to audit RaiseHub, group findings into:

## Safe Now

Low-risk cleanup that should not change behavior.

Include:

- File path
- Exact issue
- Recommended change
- Risk level
- How to test

## Needs Review

Potential improvements that may affect behavior or require product decisions.

Include:

- File path
- Current behavior
- Proposed change
- Risks
- Dependencies
- Approval required

## Architectural Suggestions

Longer-term recommendations that should not be automatically implemented.

Include:

- Problem
- Proposed direction
- Benefits
- Tradeoffs
- Migration sequence

Do not combine all findings into one automated pull request.

---

# 24. Copilot Task Guidance

Good Copilot tasks:

- Remove unused imports
- Remove obsolete debug logs
- Identify duplicate helpers
- Identify large files
- Identify repeated Supabase query patterns
- Produce code-health reports
- Add documentation cross-references
- Improve accessibility
- Add tests for already-defined rules
- Review a focused pull request
- Suggest safe extractions

Poorly scoped Copilot tasks:

- Refactor the entire architecture
- Fix all security
- Add owner support
- Add Stripe
- Rewrite authentication
- Improve the database
- Clean up everything and commit it

Broad audits should produce a report before making changes.

---

# 25. Pull Request Expectations

AI-created pull requests should:

- Solve one logical problem
- Avoid unrelated formatting churn
- Explain what changed
- Explain what did not change
- Identify risks
- Include test instructions
- Keep CI green
- Avoid schema or policy changes unless approved
- Update documentation when architecture changes

Large automated PRs should be split before merging.

---

# 26. Documentation Updates

Update documentation when:

- Architecture changes
- Build order changes
- A milestone becomes connected
- Runtime verification is completed
- A new risk is discovered
- A risk is resolved
- A permanent lesson is learned
- A new AI-development rule is adopted

Do not mark a feature complete merely because files exist.

Use these states:

    Foundation complete
    Connected
    Runtime verified
    Production verified
    Complete

---

# 27. Current Development Direction

The current priority is the Owner Platform workspace system.

Current foundation includes:

- Permanent owner identity
- Live workspace discovery
- Workspace search and role filtering
- Account-health cards
- Setup progress
- Contact information
- Selected workspace URL state
- Workspace preview
- Read-only support view

**Workspace browser and read-only support shell status: Connected with owner-authorized business offers and organization campaigns.**

The workspace browser loads live workspace results. A workspace can be selected and its URL state is set. The read-only support shell renders the selected workspace context.

**URL handling:**

Selected workspace URL matching confirms the requested ID and role match an available workspace result. This does not replace explicit authenticated-owner authorization for private role-specific data.

Owner-authorized business-offer support is now complete:

- Owner workspace read authorization service is complete.
- Business-offer repository is complete and filtered by `business_id`.
- Owner business-offer service is complete.
- Read-only business-offer viewing is connected in Owner Platform support mode.

Owner-authorized organization-campaign support is now complete:

- Organization-campaign repository is complete and filtered by `organization_id`.
- Owner organization-campaign service is complete.
- Read-only organization-campaign viewing is connected in Owner Platform support mode.

The owner-only campaign SELECT policy (`allow_owner_read_all_campaigns`) was added and verified as a database prerequisite before this application PR. This PR introduces no additional schema or RLS changes.

Current next direction:

1. Add owner-authorized read-only customer pass and redemption data.
2. Design audit repository and service.
3. Design assisted editing.
4. Add support notes.
5. Separate development and production environments.

Do not skip directly to unrestricted assisted editing.

---

# 28. Non-Negotiable Rules

- Read the repository before editing.
- Follow current documentation.
- Preserve owner identity.
- Validate workspace context server-side.
- Repositories own direct database access.
- Services own application coordination.
- Rules own deterministic shared calculations.
- UI displays prepared data.
- Support begins read-only.
- Assisted editing requires audit.
- RLS remains enabled.
- Do not guess schema fields.
- Do not change financial logic casually.
- Do not change behavior during cleanup.
- Keep commits focused.
- Keep GitHub Actions green.
- State uncertainty honestly.
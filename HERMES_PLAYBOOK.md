# Hermes Playbook — RaiseHub & Future Projects

This file defines how Hermes should work with Zac across RaiseHub and future projects. It is a standing reference, not a one-time task list — read it before starting work in this repo.

---

## Communication Style

- Zac prefers **beginner-friendly explanations**. Avoid unexplained jargon; when a technical term is necessary, briefly define it in plain language.
- Zac prefers **complete file replacements over vague snippets**. When proposing or making a change, show the full resulting file (or the full relevant block), not a fragment that requires guessing how it fits.
- **Always explain why a change is being made** — not just what changed. Every proposal or diff should be paired with the reasoning behind it (what problem it solves, what tradeoff it makes).

---

## Default Workflow

Follow this sequence for any non-trivial change:

1. **Investigate** — read the relevant code/config/docs first; don't assume.
2. **Plan** — propose the approach, options, and tradeoffs before touching anything.
3. **Get approval** — wait for Zac's go-ahead before implementing.
4. **Implement** — make the smallest safe change that satisfies the plan.
5. **Lint/build** — run lint and build to verify the change is clean.
6. **Show diff** — present the exact diff of what changed.
7. **Wait for commit approval** — do not commit until Zac explicitly says so.

---

## Hard Rules (Never Without Explicit Approval)

- **Never commit** without approval.
- **Never push** without approval.
- **Never deploy** without approval.
- **Never expose secrets** — no printing/logging of API keys, tokens, or `.env` values, ever.
- **Never edit `.env` files** without explicit permission.
- **Never make Supabase schema or data changes** without approval — this includes RLS policies, migrations, table structure, and direct data edits.

---

# Platform Architecture

RaiseHub now follows three architectural layers.

## UI

Routes

↓

Dashboards

↓

Content

↓

Sections

↓

Components

## Logic

Services

Business rules only.

No SQL.

## Data

Repositories

Database access only.

No business logic.

Repositories may be replaced in the future by caching or search providers without changing UI components.

---

Owner Console

The Owner Console is NOT considered a dashboard.

It is RaiseHub's platform operating system.

All owner functionality should build upon:

Platform

↓

Workspace

↓

Support

↓

Audit

Never by changing the authenticated user's role.

## Supabase Safety Rules

- **Hermes never uses the service role key.** Investigative/read access to Supabase must use a dedicated, low-privilege credential — never the service role key, which bypasses RLS and grants full read/write/admin access.
- **Read-only access uses a dedicated Postgres role** (e.g. `hermes_readonly`), granted `SELECT` only on the `public` schema, with no access to the `auth` schema and no `bypassrls` attribute. This role is created explicitly for Hermes's use, separate from the app's own keys, and is independently revocable.
- **No inserts, updates, deletes, or schema changes — ever — without explicit per-action approval.** Read access does not imply write access. Even with read-only credentials configured, any request that would insert, update, delete, or alter data or schema requires its own explicit approval at the time, per the Approval Rules above.
- **Credentials are stored outside the app's own config.** Never in `.env.local` (reserved for the app's runtime credentials) and never committed to the repo. Stored in a separate, git-ignored location, read only when a Supabase read task is explicitly requested.
- **Never print, log, or echo the credential itself** — connection strings, passwords, and keys are handled the same as any other secret under the "never expose secrets" rule above.
- **Every Supabase read is reported, not silent.** When Hermes runs a read-only Supabase query, the approval request and the result should both be shown, so there's a clear record of what was checked and what was found.

---

## Approval Rules

- **Optimize for trust over speed.** When in doubt, ask — a slower, well-explained action beats a fast, opaque one.
- **Never bundle unrelated actions into one approval.** Each approval request covers exactly one logical operation.
- **Every approval request must include:**
  1. What you're doing
  2. Why it's needed
  3. Risk level (None/Low/Medium/High)
  4. What will be affected
  5. How to undo it (if applicable)
- **Always separate approvals for:**
  - Build artifacts (`.next`, `dist`, `build`)
  - Temporary files (`/tmp`, logs, screenshots, HTML captures)
  - Source code edits/deletes
  - Git add
  - Git commit
  - Git push
  - Database reads/writes/migrations
  - Deployments
- **If a command contains multiple intentions, split it into separate approval requests** — don't chain unrelated operations behind a single "yes."
- **For destructive commands** (`rm`, `rm -rf`, `git clean`, `git reset`, database deletes, schema changes), **request approval for one logical operation at a time.**
- **Always verify the fix before requesting optional cleanup.** Confirm the actual change works first; cleanup of test artifacts is a separate, later, optional approval.

---

## Change Philosophy

- **Prefer small, safe changes.** Favor the minimal diff that solves the problem over broad rewrites, unless Zac asks for a larger refactor.
- **Prefer mobile-first UI.** RaiseHub's product goals prioritize mobile-first design — default new UI work to mobile-first patterns unless told otherwise.
- **Keep RaiseHub's production/demo data strategy clear.** Be deliberate about what's real vs. demo/test data, tag it appropriately, and don't let the two blur together (see `DEMO_DATA_STRATEGY.md` / `TECHNICAL_AUDIT.md` when present for current state).

---

## Documentation Upkeep

- **Update `PROJECT_STATUS.md` after meaningful work** — keep it reflecting current goals, focus, known issues, and next tasks.
- **Add important discoveries to `LESSONS_LEARNED.md`** — root causes found, gotchas hit, and how they were resolved or avoided, so they aren't rediscovered the hard way later.

---

## End-of-Task Reporting

After every completed task, finish with a **Project Health** summary covering:

- Build
- Lint
- Git status
- Files changed
- Files created
- Files deleted
- Deployment status

Then **recommend exactly ONE next task** and wait for approval before proceeding to it.

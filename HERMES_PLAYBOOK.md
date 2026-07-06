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

## Change Philosophy

- **Prefer small, safe changes.** Favor the minimal diff that solves the problem over broad rewrites, unless Zac asks for a larger refactor.
- **Prefer mobile-first UI.** RaiseHub's product goals prioritize mobile-first design — default new UI work to mobile-first patterns unless told otherwise.
- **Keep RaiseHub's production/demo data strategy clear.** Be deliberate about what's real vs. demo/test data, tag it appropriately, and don't let the two blur together (see `DEMO_DATA_STRATEGY.md` / `TECHNICAL_AUDIT.md` when present for current state).

---

## Documentation Upkeep

- **Update `PROJECT_STATUS.md` after meaningful work** — keep it reflecting current goals, focus, known issues, and next tasks.
- **Add important discoveries to `LESSONS_LEARNED.md`** — root causes found, gotchas hit, and how they were resolved or avoided, so they aren't rediscovered the hard way later.

# RaiseHub Technical Audit — Findings Report

**Scope:** Read-only static analysis. No file edits, no Supabase calls, no commits/pushes, `.env.local` contents not read.

---

## 1. Executive Summary

**Verdict: Not yet ready for live onboarding — but no blockers found.** The codebase builds and lints cleanly overall. Issues found are fixable in isolation and don't require architectural change. Two items should be resolved before further feature work: the uncommitted debug code and the campaign-progress root cause.

---

## 2. Findings Table

| Severity | Area | File(s) | Description | Recommended Fix |
|---|---|---|---|---|
| **High** | Data integrity | `campaigns/page.tsx` vs `campaigns/[id]/page.tsx`, `page.tsx`, `campaign-progress-carousel.tsx` | Progress calc is duplicated in 3 places (client-side `.reduce`/`Math.min` math copy-pasted) with no shared caching directive on `/campaigns` list page (missing `export const dynamic = 'force-dynamic'`, unlike the other two). See root cause below. | Extract into one shared `lib/campaigns/progress.ts` helper; apply consistent caching directive across all 3 usages |
| **Medium** | Repo hygiene / security | `src/lib/supabase/client.ts` (uncommitted diff) | Working tree currently has uncommitted `console.log` of `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` left in from debugging — logs secrets-adjacent config to browser console on every page load | Remove before commit (flagging only — not editing per standing rules) |
| **Medium** | Type safety | `src/app/dashboard/page.tsx:228` | `eslint` error: `Unexpected any. Specify a different type` — 1 hard lint error, not just a warning | Replace `any` with a proper type |
| **Low** | Code health | `src/app/dashboard/page.tsx` | 6 unused imports/vars (`AddOfferForm`, `SaveOfferButton`, `RemoveSavedOfferButton`, `BusinessProfileCard`, `RedemptionReport`, `Offer` type, `totalCampaigns`) — suggests dead/refactored-out code left behind | Clean up during dashboard work |
| **Low** | Performance/UX | `business-profile-card.tsx`, `business-profile-form.tsx`, `featured-deals-carousel-client.tsx`, `logo-carousel-client.tsx` (x2), `offers/[id]/page.tsx` | 8 instances of native `<img>` instead of `next/image` — slower LCP, no automatic optimization | Migrate to `next/image` where feasible |
| **Low** | Architecture gap | repo root | No `middleware.ts` exists — auth/role gating currently relies entirely on server-component checks inside each page/action, not a centralized layer. Not wrong, but worth a deliberate decision before onboarding real orgs/businesses | Decide: keep per-page checks (document it) or centralize in middleware |
| **Low** | Data layer | repo | No `migrations/` directory — schema changes aren't tracked in version control (violates AGENTS.md's "prefer migration files") | Recommend introducing tracked migrations before live data exists |
| **Info** | Build health | — | `npm run build`, `npm run lint`, `npx tsc --noEmit` all pass (1 lint error above, 13 warnings, 0 type errors) | — |

---

## 3. Root Cause — Campaign Progress (Local vs. Live)

Three separate places compute the same "progress %" (homepage carousel, `/campaigns/[id]` detail page, and the `campaign-progress-carousel` component), each running its own Supabase query + `Math.min((earnings/goal)*100, 100)` math independently.

- `page.tsx` (homepage), `campaign-progress-carousel.tsx`, and `campaigns/[id]/page.tsx` all explicitly set `export const dynamic = 'force-dynamic'` / `revalidate = 0`.
- **`campaigns/page.tsx` (the list page) has neither directive.** Next.js's dynamic-vs-static rendering decision for that route is currently inferred (it happened to render as `ƒ` dynamic in this build because the Supabase server client reads cookies, which forces dynamic rendering) — but this is implicit, not guaranteed. Any change that removes cookie access from that code path, or a Next.js version/runtime difference between local and live (e.g. different caching layer, CDN, or edge config), could silently make `/campaigns` static while the other two pages stay dynamic — producing exactly the symptom described in PROJECT_STATUS.md: progress differs between environments.

This is very likely the actual mechanism behind the known bug — not a data bug, but a caching/rendering-mode divergence caused by relying on implicit dynamic detection instead of an explicit directive, combined with the same calculation being duplicated three times instead of centralized.

---

## 4. Unrelated Issues (flagged, not fixed)

- Uncommitted changes: `AGENTS.md` (expanded content) and `src/lib/supabase/client.ts` (debug logging) — not part of this audit's scope.
- Untracked files: `LESSONS_LEARNED.md`, `PRODUCT_VISION.md`, `PROJECT_STATUS.md`, `ROADMAP.md` — new docs, not yet in git.
- `src/app/raisehub` is a stray HTML text file sitting directly in `src/app/` (not a folder/route) — looks like an accidental artifact, doesn't match any route convention, worth investigating/removing separately.
- `next.config.ts` is the default scaffold with no custom config — fine for now, just noting for completeness.

---

## 5. Suggested Remediation Order

1. Resolve the campaign-progress root cause: add explicit `dynamic`/`revalidate` directives to `campaigns/page.tsx` and centralize the progress-calc logic → this is the "Campaign progress fix" task, now scoped precisely.
2. Decide on the uncommitted `client.ts` debug logs + `AGENTS.md` diff (commit or discard).
3. Fix the 1 lint error + dead-code warnings in `dashboard/page.tsx` (small, low-risk).
4. Then proceed to Demo business migration with a stable, non-duplicated progress calculation in place.
5. QA review last, once the above is settled.

---

## Addendum — Verified Findings (Post-Audit Investigation)

The following corrects and extends Section 3 above based on deeper investigation conducted after this audit was written. Read this addendum together with Section 3, not as a replacement for it.

### Correction: Progress is calculated in 2 places, not 3

Section 3 above states progress is computed in three places. This was inaccurate — the homepage carousel *is* the `campaign-progress-carousel.tsx` component (the homepage simply renders it); they are not separate calculations. **The actual calculation sites are:**

1. `src/app/components/campaign-progress-carousel.tsx` (rendered on the homepage)
2. `src/app/campaigns/[id]/page.tsx` (campaign detail page)

`src/app/campaigns/page.tsx` (the campaigns list page) does **not** calculate progress at all — it was incorrectly implicated in the original audit finding and is removed from consideration.

### Confirmed: No `payment_status` filtering on either progress query

Neither of the two real calculation sites filters by `payment_status`. Both sum `organization_earnings` across every row in `campaign_purchases` for the relevant campaign(s), regardless of status. This is currently **inert** (every existing purchase is inserted with a hardcoded `payment_status: 'test_paid'` in `src/app/campaigns/actions.ts` — there is no live payment gateway yet, so no row currently has any other status), but will become a live defect the moment real payment statuses (failed, pending, refunded) exist post-Stripe integration.

### Confirmed: Local and production share the same Supabase project

Verified directly via an authenticated comparison: production environment variables were pulled via the Vercel CLI and compared against local `.env.local`, using **hashed** project-reference identifiers only — no secret, URL, or key value was read, printed, or exposed at any point. The hashes matched.

**This is the most significant and highest-confidence finding in this investigation.** It means:

- Local development and production are not environment-isolated at all.
- Any campaign, offer, business profile, or purchase created while developing/testing locally is a real row in the production database.
- This is very likely the dominant driver of the original "campaign progress differs between local and live" symptom — not a caching or rendering-mode bug, but local test activity directly and visibly inflating (or otherwise altering) numbers that are also visible in production, and vice versa.
- This elevates environment separation from a nice-to-have to a pre-onboarding blocker (see `DEMO_EXPERIENCE.md` and the demo/staging data strategy discussion for the proposed remediation: `is_demo`/`data_source` tagging, RLS-backed hiding, and eventually a genuinely separate Supabase project for local development).

### Updated Ranked Root Cause (supersedes Section 3's ranking)

1. **Confirmed primary cause:** Shared Supabase project between local and production, combined with no `payment_status` filtering — any local test purchase directly affects the numbers seen in production and vice versa.
2. **Secondary, currently dormant:** Missing `payment_status` filter will become an active defect once real Stripe payment statuses exist.
3. **Ruled out / not applicable:** The `campaigns/page.tsx` missing-`dynamic`-directive theory from Section 3 — that page doesn't calculate progress, so its caching behavior is irrelevant to this bug.

No remediation has been implemented as a result of this addendum — this is a findings update only, per standing instruction not to fix without approval.

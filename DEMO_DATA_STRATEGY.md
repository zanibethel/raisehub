# RaiseHub Demo Data Strategy

This document defines how RaiseHub handles demo, test, staging, and production data — written before building out the demo showroom, so the infrastructure work in Phase 2 has a clear data foundation to build against. It complements `DEMO_EXPERIENCE.md` (the demo *experience*), `TECHNICAL_AUDIT.md` (current known issues, including its addendum), and `HERMES_PLAYBOOK.md` (working agreement).

**Note on domains:** as of this writing, RaiseHub does not own or use `raisehub.com`. The current live URL is `https://raisehub.vercel.app/`. `demo.raisehub.com` and `raisehub.com`, referenced below, are **future custom-domain goals** — demo infrastructure today is built around the current Vercel app and the `NEXT_PUBLIC_APP_MODE` environment variable, not a custom domain.

---

## 1. Demo Philosophy

- `demo.raisehub.com` *(future custom-domain goal — not available today; current live URL is `https://raisehub.vercel.app/`)* is envisioned as an **interactive showroom** — a place where visitors can explore the full RaiseHub experience (businesses, campaigns, offers, dashboards) before committing to anything.
- The goal is to let people **experience RaiseHub before buying** — see how a campaign looks, how a business offer works, how a customer's digital pass behaves — without any real signup, real money, or real commitment required.
- The demo must **feel polished, realistic, and safe**: realistic enough that it genuinely represents the product, but safe enough that nothing a visitor does in the demo has any real-world consequence, and no real business or customer data is ever at risk of being confused with it.

---

## 2. Data Classifications

RaiseHub's data falls into four categories. These are conceptual classifications first — Section 4 defines how they get tagged in practice.

| Classification | Definition |
|---|---|
| **Demo data** | Polished, intentionally-created content designed to be shown publicly under demo mode — realistic fake businesses, campaigns, and offers meant to represent the product well. Demo data is *meant to be seen*. |
| **Test data** | Ad hoc content created while developing or manually testing a feature (e.g. clicking through a purchase flow to confirm it works). Test data is a byproduct of engineering work, not curated, and not meant to be shown to anyone. |
| **Staging data** | Data that exists in an environment used to validate changes before they reach production — closer in spirit to production data (may resemble real usage patterns) but still not real/live. RaiseHub does not currently have a staging environment; this classification is defined here so the option exists once one is introduced. |
| **Production data** | Real businesses, real organizations, real customers, real purchases, real money (once Stripe is integrated). This is the only classification that must never be treated as disposable. |

---

## 3. Demo vs. Production

| | Demo mode (today: `raisehub.vercel.app` w/ `NEXT_PUBLIC_APP_MODE=demo`) → `demo.raisehub.com` (future goal) | Production (today: `https://raisehub.vercel.app/`) → `raisehub.com` (future goal) |
|---|---|---|
| **Purpose** | Interactive showroom — explore before buying | The real platform |
| **Data shown** | Demo data only (curated, polished) | Production data only |
| **Signup/purchase** | Simulated — no real accounts, no real money | Real — real accounts, real money (once Stripe is live) |
| **Content lifecycle** | Reset/refreshed on a defined cadence (see Section 6) | Permanent, real, and protected |
| **Primary CTA** | "Build My RaiseHub" → routes to real onboarding (today: `/signup` on `raisehub.vercel.app`; future: `raisehub.com`) | Actual signup/campaign creation/business onboarding flows |
| **Visual indicator** | Persistent demo banner: *"Welcome to the RaiseHub Interactive Demo"* (see `DEMO_EXPERIENCE.md`) | No demo banner |
| **Risk tolerance** | High — content can be reset, seeded, or broken without real-world consequence | Low — must be reliable, accurate, and protected per `AGENTS.md`'s Database Rules |

---

## 4. Tagging Strategy

To make data classifications (Section 2) enforceable rather than just conceptual, the following fields are recommended. **None of these are implemented yet — this section is a design proposal, not a migration plan.**

| Field | Type | Purpose |
|---|---|---|
| `is_demo` | `boolean` | The primary switch — true for anything belonging to the curated demo showroom. This is what public-facing queries filter on to hide/show demo content. |
| `is_test` | `boolean` | True for ad hoc engineering/QA test data that isn't meant to be shown anywhere, demo or production. Distinct from `is_demo` because test data and demo data have different lifecycles and different cleanup rules. |
| `demo_group` | `text` (nullable) | Groups related demo rows together (e.g. all rows belonging to one seeded "demo season" or one themed demo scenario), so a whole batch can be identified, refreshed, or retired together without affecting other demo content. |
| `app_mode` | `text` (`'demo'` \| `'production'`, set at write time) | Records which surface (Section 3) the row was created under — the most direct evidence of where a row originated, independent of intent. Useful for auditing exactly how a questionable row got created. |
| `created_by_demo_seed` | `boolean` | True specifically for rows created by an automated seed script (see Section 6), as opposed to rows manually created by a human while exploring the demo experience itself. Separates "system-generated demo content" from "a real demo visitor's simulated activity," which may need different reset behavior. |

### Tables that may eventually need these tags

| Table | Why it needs tagging |
|---|---|
| `profiles` | Demo businesses and organizations must be distinguishable from real ones — the current `AGENTS.md` Demo Content Strategy already calls for polished demo businesses that don't interfere with real ones. |
| `campaigns` | Demo campaigns shown in the showroom must never be mistaken for real fundraising campaigns, and must never contribute to real organization earnings reporting. |
| `offers` | Demo offers must be distinguishable from real business offers, especially since offers are reusable and could otherwise persist indefinitely without a clear "this is fake" marker. |
| `campaign_purchases` | The most sensitive table — this is where the confirmed local/production data-mixing issue (`TECHNICAL_AUDIT.md` addendum) actually shows up as skewed progress numbers. Needs tagging most urgently. |
| `saved_offers` | Demo visitors "saving" an offer during a showroom session shouldn't pollute real engagement metrics. |
| `redemptions` | Same reasoning — simulated redemptions during a demo walkthrough must not count toward a real business's redemption reporting. |
| `offer_views` | Demo showroom traffic shouldn't inflate real offer performance analytics. |
| `offer_clicks` | Same as above — click tracking data needs to distinguish demo exploration from real customer interest. |

---

## 5. Mobile Testing Strategy

Currently, mobile proof-of-concept testing happens directly against the live production environment (confirmed: local and production share the same Supabase project, per `TECHNICAL_AUDIT.md`'s addendum). This is a reasonable *short-term* approach while the platform is pre-launch and no real businesses or customers exist yet — but it is not where mobile testing should live long-term.

Once demo mode exists, **it should become the safer, permanent home for mobile testing** — whether accessed via a Vercel deployment with `NEXT_PUBLIC_APP_MODE=demo` today, or via `demo.raisehub.com` once that domain exists: a phone-in-hand walkthrough of the purchase flow, dashboard, or offer redemption can happen entirely inside the demo surface, using demo-tagged data, with zero risk of writing anything into real production records. This removes the current risk where a mobile QA session today could be silently creating real-looking rows in the same database real customers will eventually use.

---

## 6. Reset Strategy

Demo content will need to be refreshed periodically so the showroom stays clean and doesn't accumulate stray test activity from visitors clicking around. Options, in increasing order of automation:

| Option | Description | Tradeoff |
|---|---|---|
| **Manual reset** | A human runs a script or dashboard action on demand to clear and re-seed demo data. | Simplest to build, but relies on someone remembering to do it. |
| **Seed script** | A repeatable script that creates a known-good set of demo businesses/campaigns/offers/purchases, tagged with `created_by_demo_seed: true`. Can be run manually or triggered on a schedule. | Requires upfront investment to write and maintain, but gives consistent, polished demo content every time. |
| **Nightly reset** | An automated job (e.g. a cron job) that wipes all `is_demo: true` data and re-runs the seed script every night. | Keeps the demo perpetually clean with no manual effort, but means any demo state doesn't persist beyond a day — fine for a showroom, not fine if demo state needs to persist across a sales conversation. |
| **Snapshot restore** | Take a point-in-time snapshot of a known-good demo dataset and restore it on a schedule or on demand, rather than regenerating from a script each time. | Faster and more deterministic than re-running a seed script, but requires snapshot/restore tooling on the Supabase project and only works well if demo data doesn't need to vary over time. |

No option is selected here — this is a menu of choices for a future decision once Phase 2 implementation begins.

---

## 7. Hermes Responsibilities

Hermes may generate demo businesses, campaigns, offers, fake purchases, and analytics **only after explicit approval** — consistent with `HERMES_PLAYBOOK.md`'s hard rule that Supabase schema or data changes never happen without approval. This applies whether the generation is a one-off manual action or part of building a seed script (Section 6). Proposing what demo content *should* look like is fine at any time; actually writing it to any database is not, until approved.

---

## 8. Pre-Launch Rule

**Before real businesses or customers are onboarded, demo/test data must be clearly separable from production data.** This is a hard gate, not a preference — it follows directly from the confirmed finding that local and production currently share one database with no separation. Onboarding real users onto a dataset where demo/test content can't be reliably distinguished risks showing real customers stale test businesses, skewing real campaign progress numbers, or worse, letting a real customer interact with fake content believing it's real. This rule must be satisfied before "Business onboarding" and "Organization onboarding" (per `ROADMAP.md`'s "Preparing for Launch" section) can proceed.

---

## 9. Phase 2 Implementation Guidance

Per `ROADMAP.md`'s "Phase 2 — Demo Infrastructure" section, implementation should proceed in this order, and **no database changes should be made until approved**:

1. **`APP_MODE` strategy** — decide how the app determines whether it's running as `demo` or `production` (domain-based, environment-variable-based, or both), before writing any detection code.
2. **Demo mode detection** — implement the actual runtime check based on the strategy above.
3. **Demo banner** — render the *"Welcome to the RaiseHub Interactive Demo"* banner (per `DEMO_EXPERIENCE.md`) whenever demo mode is detected.
4. **"Build My RaiseHub" CTA** — add the conversion CTA that routes demo visitors toward real onboarding (today: the relative `/signup` path, since demo and production currently share one Vercel deployment; update to `raisehub.com` once that domain exists).
5. **No database changes until approved** — the tagging fields proposed in Section 4, any seed script (Section 6), and any RLS policy changes for hiding demo data are all schema/data changes and require explicit sign-off before implementation, per `HERMES_PLAYBOOK.md`.

This ordering intentionally front-loads the parts of Phase 2 that are pure application code (detection, banner, CTA) before anything touches the database — keeping early Phase 2 work low-risk and reversible while the data strategy in this document is reviewed.

# RaiseHub Demo Experience

This document defines the vision and behavior for RaiseHub's public-facing interactive demo, as distinct from the production platform. It complements `TECHNICAL_AUDIT.md` (current known issues) and the demo/staging data strategy discussed for RaiseHub — see `HERMES_PLAYBOOK.md` for how demo/production data should be tagged and kept separate going forward.

---

## Two Surfaces, One Codebase

| Surface | Domain | Purpose |
|---|---|---|
| **Demo** | `demo.raisehub.com` | Interactive showroom — lets visitors explore RaiseHub's full experience (businesses, campaigns, offers, dashboards) using realistic but clearly-marked demo content, without any real signup or real money involved. |
| **Production** | `raisehub.com` | The real platform — real businesses, real organizations, real customers, real campaigns, real purchases. |

Both surfaces are intended to run from the **same codebase**, distinguished by domain/environment configuration rather than a separate fork — consistent with the "small reusable components, minimal duplication" preference in `AGENTS.md`.

---

## Demo Banner

Every page rendered under the demo surface should display a persistent, unmistakable banner:

> **"Welcome to the RaiseHub Interactive Demo"**

This banner exists so no visitor mistakes demo content for a real, live fundraising campaign — protecting trust, which is a core Product Goal (`AGENTS.md`, `PRODUCT_VISION.md`).

---

## Demo Call-to-Action

The demo experience's primary CTA button reads:

> **"Build My RaiseHub"**

This CTA is the conversion path from "exploring the demo" to "become a real customer" — it should route toward real signup/onboarding on production (`raisehub.com`), not deeper into more demo content. The demo's job is to sell the vision; the CTA is the exit door into the real product.

---

## Demo Data Requirements

Demo content shown on `demo.raisehub.com` (businesses, campaigns, offers, purchases, engagement data) must be:

- **Taggable** — every demo-originated row identifiable at the data level (e.g. an `is_demo` flag, as previously proposed), so it can always be distinguished from real production data.
- **Hidable later** — able to be switched off/hidden without deleting it, via a filter or toggle, rather than requiring destructive cleanup. This aligns with `AGENTS.md`'s Database Rule: "Prefer demo data over deleting test data."
- **Realistic but obviously demo** — content should look production-quality (per `AGENTS.md`'s Demo Content Strategy: "Be realistic," "Look production ready") while the banner and any UI labeling make its demo status unambiguous.
- **Isolated from real business/customer records** — demo activity (clicks, saves, purchases, redemptions) must never mix into or inflate real production metrics, campaign progress, or business dashboards.

---

## Relationship to Known Issues

The campaign-progress discrepancy investigated in this project stemmed from local and production sharing one Supabase project with no data separation. The same discipline that resolves that issue — tagging, filtering, and environment awareness — is what makes a safe, trustworthy demo experience possible. `DEMO_EXPERIENCE.md` describes the target *experience*; the tagging/hiding mechanics themselves are tracked as implementation work, not defined here.

---

## Open Items (Not Yet Decided)

- Exact mechanism for domain-based environment detection (subdomain routing vs. separate deployment vs. environment variable).
- Whether `demo.raisehub.com` reads from the same Supabase project (with `is_demo` filtering) or a fully separate project.
- Where "Build My RaiseHub" routes to on production (signup flow details).

These are implementation decisions for a future planning pass, not settled by this document.

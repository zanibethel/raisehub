# RaiseHub Demo Experience

This document defines the vision and behavior for RaiseHub's public-facing interactive demo, as distinct from the production platform. It complements `TECHNICAL_AUDIT.md` (current known issues) and the demo/staging data strategy discussed for RaiseHub — see `HERMES_PLAYBOOK.md` for how demo/production data should be tagged and kept separate going forward.

---

## Two Surfaces, One Codebase

**Current infrastructure (today):** RaiseHub runs as a single Vercel deployment at `https://raisehub.vercel.app/`. No custom domain is owned yet. Demo mode is controlled entirely by the `NEXT_PUBLIC_APP_MODE` environment variable (see `src/lib/app-mode.ts`), which can be set on a separate Vercel deployment or Preview Deployment of the same project to preview demo behavior — no custom domain required to start.

**Future goal (not yet available):** once RaiseHub owns a custom domain, the two surfaces below become real, separately addressable domains:

| Surface | Domain (future goal) | Purpose |
|---|---|---|
| **Demo** | `demo.raisehub.com` *(not yet available — future custom-domain goal)* | Interactive showroom — lets visitors explore RaiseHub's full experience (businesses, campaigns, offers, dashboards) using realistic but clearly-marked demo content, without any real signup or real money involved. |
| **Production** | `raisehub.com` *(not yet available — future custom-domain goal)* | The real platform — real businesses, real organizations, real customers, real campaigns, real purchases. |

Until those domains exist, "demo" and "production" are distinguished by **`NEXT_PUBLIC_APP_MODE`** on Vercel deployments of `raisehub.vercel.app`, not by domain. Both surfaces are intended to run from the **same codebase**, distinguished by environment configuration rather than a separate fork — consistent with the "small reusable components, minimal duplication" preference in `AGENTS.md`. This holds true whether the distinguishing factor is `APP_MODE` (today) or domain (future).

---

## Demo Banner

Every page rendered under the demo surface should display a persistent, unmistakable banner:

> **"Welcome to the RaiseHub Interactive Demo"**

This banner exists so no visitor mistakes demo content for a real, live fundraising campaign — protecting trust, which is a core Product Goal (`AGENTS.md`, `PRODUCT_VISION.md`).

---

## Demo Call-to-Action

The demo experience's primary CTA button reads:

> **"Build My RaiseHub"**

This CTA is the conversion path from "exploring the demo" to "become a real customer" — for now, it should route toward real signup/onboarding on the current production surface (`https://raisehub.vercel.app/signup`, reachable via a relative `/signup` link since demo and production currently share one deployment). Once `raisehub.com` exists as a real, separate domain, this link should be updated to point there. The demo's job is to sell the vision; the CTA is the exit door into the real product.

---

## Demo Data Requirements

Demo content shown under demo mode (businesses, campaigns, offers, purchases, engagement data) must be:

- **Taggable** — every demo-originated row identifiable at the data level (e.g. an `is_demo` flag, as previously proposed), so it can always be distinguished from real production data.
- **Hidable later** — able to be switched off/hidden without deleting it, via a filter or toggle, rather than requiring destructive cleanup. This aligns with `AGENTS.md`'s Database Rule: "Prefer demo data over deleting test data."
- **Realistic but obviously demo** — content should look production-quality (per `AGENTS.md`'s Demo Content Strategy: "Be realistic," "Look production ready") while the banner and any UI labeling make its demo status unambiguous.
- **Isolated from real business/customer records** — demo activity (clicks, saves, purchases, redemptions) must never mix into or inflate real production metrics, campaign progress, or business dashboards.

---

## Relationship to Known Issues

The campaign-progress discrepancy investigated in this project stemmed from local and production sharing one Supabase project with no data separation. The same discipline that resolves that issue — tagging, filtering, and environment awareness — is what makes a safe, trustworthy demo experience possible. `DEMO_EXPERIENCE.md` describes the target *experience*; the tagging/hiding mechanics themselves are tracked as implementation work, not defined here.

---

## Open Items (Not Yet Decided)

- Exact mechanism for domain-based environment detection once a custom domain exists (subdomain routing vs. separate deployment vs. environment variable). Until then, `NEXT_PUBLIC_APP_MODE` on Vercel deployments of `raisehub.vercel.app` is the mechanism in use.
- Whether the future demo surface reads from the same Supabase project (with `is_demo` filtering) or a fully separate project.
- Where "Build My RaiseHub" routes to once real production has its own domain (signup flow details) — today it points at the relative `/signup` path on `raisehub.vercel.app`.
- **`demo.raisehub.com` and `raisehub.com` are future custom-domain goals, not available today.** Zac does not currently own or use `raisehub.com`. The current live URL is `https://raisehub.vercel.app/`. Demo infrastructure should be planned around this Vercel app and `APP_MODE` until a custom domain is acquired.

These are implementation decisions for a future planning pass, not settled by this document.

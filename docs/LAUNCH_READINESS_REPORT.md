# RaiseHub Launch Readiness Report

**Last verified:** 2026-09-19  
**Verification branch:** `chatgpt/launch-readiness-2026-09-19`  
**Pull request:** #142  
**Current state:** Launch-hardening changes verified in Preview; production merge remains owner-gated.

---

## Executive Summary

RaiseHub is no longer in the state described by the older July project-status checklist. The current repository contains working payment, redemption, workspace, owner-console, analytics, notification, demo/live-boundary, and Stripe foundations that were added after that document was written.

The current launch-hardening branch resolves or verifies several concrete readiness issues:

- auth/login redirects are constrained to internal RaiseHub paths;
- authenticated business referral onboarding preserves attribution;
- duplicate business-workspace creation is prevented;
- stale test expectations have been aligned with the current product architecture;
- campaign progress is regression-tested against explicit successful payment statuses;
- the full unit-test suite passes;
- lint has zero errors;
- TypeScript passes;
- the production build passes;
- CodeQL and secret-history scanning pass;
- the production dependency audit passes after updating Next.js and its image-processing dependency chain;
- both RaiseHub and RaiseHub Demo Preview deployments are READY.

This branch has **not** been merged or deployed to production.

---

## Automated Verification

Current PR #142 head verification:

- Unit tests: **486 passed, 0 failed**
- ESLint: **0 errors, 271 warnings**
- TypeScript: **passed**
- Next.js production build: **passed**
- Next.js version: **16.3.5**
- CodeQL: **passed**
- Secret-history scan: **passed**
- Production dependency audit: **passed**
- RaiseHub Vercel Preview: **READY**
- RaiseHub Demo Vercel Preview: **READY**

The remaining lint warnings are cleanup debt, not current CI blockers. The largest groups are explicit `any` usage, native `<img>` usage, and several React/Next.js best-practice warnings.

---

## Supabase / Data-Boundary Verification

Read-only verification against the live RaiseHub Supabase project confirms:

- migration `harden_public_campaign_rpcs_by_environment` is already applied;
- environment-aware signatures exist for:
  - `get_campaign_recovery_context`;
  - `get_public_campaign_progress`;
  - `get_public_campaign_sellers`;
  - `resolve_campaign_seller_referral`;
- legacy public signatures are not executable by `anon` or `authenticated`;
- production-mode reads exclude demo campaigns;
- demo recovery reads require the matching `demo_group`;
- campaign progress counts only explicit successful payment states.

The repository now includes regression coverage for the payment-status contract.

RaiseHub intentionally still uses one Supabase project for production and demo data. Safety therefore depends on the environment fields, RLS, scoped RPCs, and application-level workspace/environment rules continuing to agree. The verified public campaign RPC boundary is currently enforcing that contract.

---

## Security Review Status

### Verified

- Open-redirect hardening is included in PR #142.
- CodeQL passes.
- Secret-history scan passes.
- Production dependency audit passes.
- Security-definer functions reviewed so far use fixed `search_path` values and the public campaign RPCs explicitly validate environment mode/demo group.
- Authenticated business/owner mutation functions inspected so far include actor or role checks rather than trusting client-supplied IDs alone.

### Remaining configuration item

Supabase's security advisor reports **Leaked Password Protection is disabled**.

This is an Auth configuration setting rather than a repository-code defect. It should be enabled before broad public onboarding if the project plan supports the feature.

### SECURITY DEFINER warnings

Supabase also reports executable `SECURITY DEFINER` functions. These should not be blanket-revoked: several are deliberately exposed public/authenticated capability boundaries and contain their own authorization/environment checks.

One internal helper, `sync_business_growth_rewards(uuid)`, is currently callable by `authenticated` even though current application pages invoke it through the server-side admin client and other database functions/triggers invoke it internally. Tightening that grant is a reasonable hardening follow-up, but it is a database permission change and remains owner-gated.

---

## Runtime Observability

Vercel runtime-error review found:

- production: two historical `Invalid Refresh Token: Refresh Token Not Found` middleware errors, with the most recent on 2026-09-17;
- demo: two historical PostgREST single-row errors on dashboard routes, last seen on 2026-09-15.

Current source already contains stale-session recovery handling and the current dashboard code has moved several formerly strict single-row reads to safer current patterns. No corresponding current-branch Preview error cluster has been observed from automated verification.

These historical errors should be watched after the production merge rather than treated as evidence that the current Preview is failing.

---

## What PR #142 Changes

1. Harden unsafe auth/login redirect destinations.
2. Preserve referral attribution through authenticated business signup.
3. Prevent duplicate business-workspace creation.
4. Continue new business workspaces through onboarding.
5. Stabilize stale launch-readiness tests against current product behavior.
6. Add payment-status regression coverage.
7. Fix the Spotlight carousel lint blocker.
8. Update Next.js to 16.3.5 and refresh the vulnerable Sharp/browser-mapping dependency chain.

No production data writes, production migrations, RLS changes, real payment actions, payout actions, refunds, or production deployment were performed as part of this work.

---

## Remaining Gates Before Broad Onboarding

### Owner-gated

- Merge PR #142 to `main` and allow the normal production deployment.
- Enable Supabase Leaked Password Protection if desired/available for the project.
- Apply any future database/RLS/permission hardening only after explicit review.

### Runtime verification

After PR #142 reaches production, perform one authenticated smoke path with a fresh/non-legacy business account:

1. business signup;
2. email/auth confirmation as applicable;
3. business workspace creation;
4. onboarding/profile completion;
5. first offer creation;
6. dashboard/rewards navigation;
7. sign out / sign back in;
8. verify no duplicate workspace is offered;
9. verify referral attribution if the account entered through a referral link.

This is the main remaining proof that automated repository checks cannot substitute for.

---

## Not Initial-Business-Onboarding Blockers

The following remain valid future/platform work but should not be confused with the minimum business-onboarding launch gate:

- broad lint-warning cleanup;
- optional POS integrations;
- advanced website analytics;
- AI marketing/copy tools;
- additional referral/reward expansions;
- deeper owner automation;
- advanced payout automation beyond the currently intended launch scope.

---

## Current Decision Point

PR #142 is technically mergeable and has passed the repository/security/deployment checks listed above.

**Next production action:** owner approval to merge PR #142, followed by the authenticated smoke test and post-deploy runtime-log review.

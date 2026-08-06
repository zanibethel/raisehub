# RaiseHub Launch Readiness Report

Date: 2026-08-06  
Repository: `zanibethel/raisehub`  
Baseline `main` SHA reviewed: `3db83edbd08f8aeb6a21ab3d14a08f74f0085e6f` (PR #92 merge commit)

## 1) Executive verdict

**CONDITIONAL GO**

Evidence supports shipping the current codebase only after the remaining manual/operational blockers in this report are completed and explicitly approved.  
The only verified launch-critical code blocker found during this pass (campaign checkout beneficiary mismatch) is fixed in this branch.

## 2) Verification matrix

| Check | Command / Path | Result | Evidence | Commit | Remaining manual action |
|---|---|---|---|---|---|
| Clean install | `npm ci --ignore-scripts --no-audit --no-fund` | Pass | 404 packages installed | this branch | none |
| Unit/integration tests | `npm test` | Pass | `425 passed, 0 failed` | this branch | none |
| Lint | `npm run lint` | Pass with warnings | `0 errors, 99 warnings` | this branch | triage warnings post-launch unless risk-elevating |
| TypeScript | `npx tsc --noEmit` | Pass | exit code 0 | this branch | none |
| Production build | `npm run build` | Pass | Next.js 16.2.3 build succeeded; all routes generated | this branch | none |
| CI workflow state | `.github/workflows/ci.yml` + Actions run history | Pass on latest `main`/PR runs | recent RaiseHub Code Checks successful on main and PRs #90/#91 | N/A | none |
| PR #90 review | `pull_request_read` (#90) | Incomplete feature branch | PR body explicitly lists unfinished work | N/A | keep out of launch path |
| PR #91 review | `pull_request_read` (#91) + local repro | Confirmed issue + fix | UI allowed alternate beneficiary while server enforced campaign sponsor | fixed here | merge this fix path once validated |

## 3) Risk register

### P0

1. **Misleading campaign checkout beneficiary (verified) — FIXED**
   - Evidence: `src/app/components/buy-campaign-pass-button.tsx` previously allowed selecting another organization; server action (`src/app/campaigns/stripe-checkout-actions.ts`) always enforced campaign sponsor.
   - Reproduction: open campaign checkout with multiple organizations; change “Supporting” org; complete checkout.
   - Affected: Live + Demo buyers, organizations, seller attribution trust.
   - Root cause: UI organization selector diverged from server authority.
   - Fix: lock UI to campaign sponsor and remove alternate-organization selector.
   - Regression risk: low; only removes misleading UI path.
   - Verification: tests/build/lint/typecheck all pass; new regression test added.

### P1

1. **Branch protection appears disabled on `main`**
   - Evidence: GitHub branches API reports `"protected": false` for `main`.
   - Risk: accidental direct pushes / weakened release safety.
   - Required verification: enable and confirm required checks/reviews before launch cutover.

2. **Full role-by-role manual QA matrix not executed in this run**
   - Evidence: no authenticated end-to-end run was executed here for every role/environment combination listed in the launch criteria.
   - Risk: unverified workflow regressions could still exist outside covered automated tests.
   - Required verification: execute full manual matrix and record pass/fail evidence before go-live.

### P2

1. **Documentation drift**
   - `README.md` is still default Next.js starter text and does not describe production architecture/operations.
   - `docs/DATABASE.md` and `docs/DECISIONS.md` are empty.

2. **Lint warning debt**
   - 99 warnings remain (no lint errors), including `no-explicit-any`, `no-img-element`, and `set-state-in-effect`.

## 4) Role and environment QA matrix (status)

| Role | Live | Demo | Status in this run |
|---|---|---|---|
| Public visitor | required | required | not fully executed manually |
| Customer | required | required | automated coverage only; manual E2E not fully executed |
| Business | required | required | not fully executed manually |
| Organization | required | required | not fully executed manually |
| Seller | required | required | not fully executed manually |
| Owner | required | required | not fully executed manually |
| Demo personas | N/A | required | not fully executed manually |

## 5) Database and migration plan

- New migrations in this branch: **none**.
- Existing migration inventory reviewed under `supabase/migrations/` (latest tracked migration: `20260731150000_enforce_checkout_fulfillment_environment.sql`).
- Pre-deploy safety checks:
  1. Confirm target Supabase project/environment.
  2. Confirm no pending, unapplied production migrations.
  3. Backup snapshot before any migration apply.
  4. Apply migrations in timestamp order only.
  5. Re-run checkout + entitlement smoke checks after migration apply.
- Rollback considerations:
  - App rollback: redeploy previous stable commit.
  - DB rollback: restore from backup or execute explicit down/repair migration (no destructive ad-hoc SQL).

## 6) Deployment checklist (human steps, ordered)

1. Confirm `main` branch protection (required checks + review rules) is enabled.
2. Verify production/preview/development env var names are set (do not expose values):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_APP_MODE`
   - `NEXT_PUBLIC_SITE_URL`
   - `NEXT_PUBLIC_PRODUCTION_SITE_URL`
   - `NEXT_PUBLIC_DEMO_GROUP`
   - `RAISEHUB_DEMO_GROUP`
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`
   - `STRIPE_CONNECT_WEBHOOK_SECRET`
   - `VERCEL_URL`
   - `VERCEL_PROJECT_PRODUCTION_URL`
   - `VERCEL_GIT_COMMIT_REF`
   - `DEMO_ACCOUNT_PASSWORD`
   - `DEMO_CUSTOMER_EMAIL`
   - `DEMO_BUSINESS_EMAIL`
   - `DEMO_ORGANIZATION_EMAIL`
3. Confirm Stripe webhook endpoints and subscribed events for both preview/test and production/live.
4. Confirm Supabase auth callback URLs and site URL configuration.
5. Take pre-deploy database backup and verify restore ownership path.
6. Deploy to preview and run smoke tests: login, campaign checkout start, webhook receipt, entitlement visibility, demo checkout simulation.
7. Execute full manual role QA matrix (Live + Demo).
8. Deploy to production.
9. Run post-deploy smoke tests (public pages, checkout, webhook, owner/support visibility, demo isolation).
10. Monitor logs/alerts and rollback immediately on payment-entitlement mismatch, auth bypass, or demo/live leakage.

## 7) Deferred work

- **PR #90 (`feat/online-offer-discount-codes`) deferred post-launch** unless product owner explicitly reclassifies as launch-critical.
  - Reason: PR itself documents unfinished scope (types, validation, wizard integration, protected display, analytics, regression tests).
  - Keep current in-person offer flow as launch path.

## 8) Pull request summary (for launch-readiness branch)

- Root cause fixed: campaign checkout beneficiary mismatch between UI and server authority.
- Security impact: trust/integrity improvement; no auth/RLS weakening.
- Database impact: none.
- Tests executed: `npm ci`, `npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build`.
- Manual QA completed in this run: limited (see matrix; requires full human execution).
- Recommendation: **CONDITIONAL GO** pending manual QA completion and branch-protection/ops confirmations.

## 9) PR disposition

- **PR #91**: launch-relevant and effectively integrated by this branch’s checkout-organization lock fix.
- **PR #90**: not required for safe launch path today; keep as post-launch scope unless explicitly promoted with full completion.

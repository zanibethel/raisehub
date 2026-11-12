# RaiseHub Next.js 16.4.6 security-upgrade impact audit

**Audit date:** 2026-11-12  
**Repository:** `zanibethel/raisehub`  
**Baseline:** `main` at `10e40b2fcde8d14ab7a18e18b3515898c5cb079c`  
**Existing security proposal:** PR #222, branch `security/nextjs-p0-nov2`  
**Concurrent native mobile work:** draft PR #223; merge/rebase coordination required  
**Audit type:** Repository/static impact review, GitHub CI-log review, and upstream release/advisory research. No live user journeys or production writes executed.  
**Release status:** Automated dependency security, code checks, CodeQL, and both Vercel preview builds PASS on commit `516d949a`; behavioral Preview smoke tests and production-release approval are still required.

## 1. What PR #222 originally proposed and the updated patch

The original November 2 PR #222 changed exactly two files. The implementation now includes the corrected 16.4.6 versions, regenerated lockfile, CI corrections, and this audit. Historical comparison:

| File | Proposed change | Audit finding |
| --- | --- | --- |
| `package.json` | `next` 16.3.8 → 16.4.3 | Outdated target: recommend **16.4.6** (latest verified stable 16.4.x as of audit) |
| `package.json` | `eslint-config-next` 16.3.8 → 16.4.3 | Match Next.js at **16.4.6** |
| `.github/workflows/dependency-audit.yml` | Node 20 → 24 | Appropriate runtime change for audit; `.github/workflows/ci.yml` still uses Node 20 |
| `package-lock.json` | **No change** | **Hard blocker.** Root lockfile still pins Next and eslint-config-next to 16.3.8; transitive `@next/*` versions also need regenerating |

**Proven CI failure:** PR #222 run 41470567875 fails at `npm ci` with `EUSAGE` due to out-of-sync `next`, `eslint-config-next`, `@next/eslint-plugin-next`, `@next/env` and multiple `@next/swc-*` lockfile entries. Tests, lint, typecheck and build were **skipped** in that run. The dependency audit also failed at installation, before its security scan. Vercel previews can succeed with a different installation path; this is not proof that the locked build is reproducible.

**Current main audit evidence:** On 2026-11-12, the unchanged 16.3.8 dependency failed `npm audit --omit=dev --audit-level=high` due to the critical Next.js advisories GHSA-673q-mjm6-r5xr, GHSA-2464-fhr4-w9xw and the high-severity GHSA-p3m5-59mp-jv5r. It also logged Node-20 engine warnings for currently resolved Supabase packages requiring Node >=22.

**Additional upstream evidence:** Next.js 16.4.5 (Nov 3) includes seven moderate security fixes not included in 16.4.3. Next.js 16.4.6 (Nov 9) adds fixes such as route-handler response compression and Turbopack development GC fixes. We should target the latter, rather than fixing the three earlier advisories while leaving newer fixes outstanding.

References:
- https://github.com/zanibethel/raisehub/pull/222
- https://nextjs.org/blog/nextjs-security-update-october-14-2026
- https://nextjs.org/blog/next-16-4
- https://github.com/vercel/next.js/releases/tag/v16.4.5
- https://github.com/vercel/next.js/releases/tag/v16.4.6

## 2. Cross-cutting upgrade behavior

1. **All Next.js entrypoints are potentially touched:** App Router routing, server/client rendering, middleware/proxy, Server Actions, route handlers, asset serving and build tooling. The proposed PR does *not* itself edit any business logic or database schema.
2. **Server Actions and cache invalidation:** Code search finds many `'use server'` modules and 35 matches involving `revalidatePath`. Regression risk exists after mutations where affected cards/pages must refresh. Next.js 16.4 Cache Components are recommended upstream, but `next.config.ts` does not opt into `cacheComponents`; do **not** make a cache-architecture migration part of an urgent security patch.
3. **Images:** The Next image optimizer security fix changes its own implementation. `next/image` is directly imported in `src/app/webportal/support/page.tsx`; much RaiseHub imagery uses native `<img>` or stored URLs. Image upload APIs remain important to verify, but `next/image` is not currently widespread. Test image/remote URL behavior without enabling SVG optimization or loosening security.
4. **Route handler responses:** v16.4.6 can automatically compress route-handler responses when not already compressed. Validate JSON, webhook acknowledgements, text manifests, `Content-Type`, cache headers, and any client parsing; ensure raw *incoming* Stripe webhook body and signature verification are preserved.
5. **Runtime:** Supabase package installations in recent CI report Node >=22. Align the app test/build workflows and Vercel runtime with a supported version (Node 24 is the current choice in PR #222 audit) after checking deployment configuration. Keep the separately managed Expo/React Native toolchain independent.
6. **React and Tailwind:** `react`/`react-dom` stay pinned at 19.2.4 and Tailwind stays on the existing version range in current PR. Do not silently upgrade them during this security-only change. Check peer dependencies on clean install.
7. **Vercel + demo:** Preview and demo Vercel projects both build the same Next.js codebase. Validate both configurations and demo/production isolation; no production data should be used for destructive QA.
8. **No assumed DB change:** No SQL migration, RLS policy, entitlement rule, Stripe price change, or API contract should be changed as part of this patch unless a reproducible regression forces a separately reviewed follow-up.

## 3. Area-by-area impact and verification matrix

**Status of every row:** Static impact identified; full end-to-end behavioral verification **NOT YET RUN** on 16.4.6.

| Area | Verified RaiseHub files / flows | Exposure / risk to review | Required Preview acceptance test | Priority |
| --- | --- | --- | --- | --- |
| Public landing, campaign listings, business directory and offers | `src/app/campaigns/actions.ts`, `src/app/offers/actions.ts`, public page routing | Server rendering, links, search params, stale data after actions | Load public pages, view one campaign/offer, compare progress and offer detail, confirm invalid IDs fail safely | P1 |
| Signup, login, email confirmation, session continuity | `src/lib/supabase/server.ts`, `src/lib/supabase/proxy.ts`, `src/proxy.ts`, `src/app/auth/callback/route.ts`, `src/app/auth/confirm/route.ts` | Cookie refresh, redirect, auth boundaries, subdomain rewrite | Signup/confirm in isolated env; sign in/out; expired session; reload protected route; reject unauthorized navigation | **P0** |
| Multi-role workspace switching and dashboards | `src/app/dashboard/page.tsx`, `src/app/components/nav.tsx`, `src/lib/services/authenticated-workspace-service.ts`, `src/lib/rules/workspace-selection-rules.ts` | New navigations, Server Components, redirects, selected workspace state | Same user with multiple memberships switches experiences; revoked access fails closed; customer entitlement remains independently gated | **P0** |
| Customer My Pass, saved offers, redemptions | `src/app/dashboard/actions.ts`, `src/app/offers/actions.ts`, `src/app/redemptions/actions.ts`, `src/lib/services/customer-pass-access-service.ts` | Server Action submission and cache revalidation; pass grant/redeem UX | Save/unsave; active vs expired benefit; one redemption updates state and does not duplicate | **P0** |
| Campaign checkout, hosted and embedded payments | `src/app/campaigns/stripe-checkout-actions.ts`, `src/app/components/stripe-elements-checkout.tsx`, `src/app/checkout/success/page.tsx` | Server Actions, cookies/headers, Stripe iframe/redirect, state refresh | Test-mode valid checkout, declined card, canceled checkout, return-page read, server-calculated totals, no premature entitlement | **P0** |
| Stripe webhook and financial ledger integrity | `src/app/api/stripe/webhook/route.ts`, `src/lib/stripe/server.ts`, checkout-attempt/fulfillment RPCs | Route-handler body handling, signature verification, retryable failures, duplicate deliveries | Stripe-signed test webhook; wrong signature rejected; paid event creates exactly one purchase+entitlement; duplicate gives safe 200; failure remains retryable | **P0** |
| Business dashboards, offers and redemptions | `src/app/dashboard/offers/page.tsx`, `src/app/dashboard/offer-wizard-actions.ts`, `src/app/dashboard/business-profile-actions.ts`, `src/components/dashboards/business/business-redemption-settings-actions.ts` | Form/Server Action behavior, role checks, updated offer lists | Create/edit/pause offer; staff vs manager permissions; reload reflects update; redemptions scoped to business | **P0** |
| Business public microsites, schedulers and installable PWA | `src/app/site/[slug]/page.tsx`, `src/app/site/[slug]/admin/page.tsx`, `src/proxy.ts`, `src/app/api/public/business-sites/[slug]/booking/route.ts`, `src/app/site/[slug]/manifest.webmanifest/route.ts` | Host/subdomain rewrites, public JSON, booking write, manifest response/cache/compression | Visit by path AND subdomain; load/install manifest; submit booking; confirm staff access and persisted booking | P1 |
| Organization campaigns, sellers and payouts | `src/app/organization/actions.ts`, `src/app/seller/dashboard/actions.ts`, `src/app/seller/claim-roster/actions.ts`, `src/app/organizations/stripe-connect-actions.ts` | Server Actions, redirects, seller attribution/roster, Stripe Connect state | Create/modify campaign in isolated env; claim roster; seller earnings show correctly; account permissions and payout status work | **P0** |
| Organization / demo logo uploads and other multipart forms | `src/app/api/organization/logo/route.ts`, `src/app/api/owner/demo-business-logos/route.ts`, `src/app/api/owner/demo-organization-logos/route.ts`, `src/app/api/webportal/advertise/checkout/route.ts` | `request.formData()`, file size/type validation, storage cleanup, generated image URLs | Valid JPG/PNG/WebP upload and display; oversized/invalid rejected; replace/delete; no cross-role or demo data leaks | P1 |
| Business billing / subscriptions, partner rewards | `src/app/api/business/billing/checkout/route.ts`, `src/lib/stripe/business-billing.ts`, `src/app/dashboard/owner/partner-rewards/actions.ts` | Stripe Checkout and portal redirects, Server Action updates, payout idempotency | Open test billing/portal, return/refresh subscription state; audit rewards without executing real payouts | **P0** for money-changing flows |
| Owner, support, demos, verification, promotions | `src/app/dashboard/owner/...`, `src/app/dashboard/owner/demo-groups/actions.ts`, `src/app/api/owner/notifications/send/route.ts` | Highly privileged forms, Server Action cache updates, cross-environment data isolation | Owner-only access; owner action updates one targeted record; non-owner rejected; reset demo using isolated dataset only | **P0** |
| Notifications, emails, gifts and referrals | `src/app/dashboard/notification-actions.ts`, `src/app/dashboard/gifts/actions.ts`, `src/app/gifts/actions.ts`, `src/app/dashboard/rewards/referrals/actions.ts` | Form submissions, tokenized links, status refresh, email routes | Create/test gift claim without duplicate; notification read/update, referral attribution, mail callback routes | P1 |
| WebPortal support/advertising (shared repository site) | `src/app/webportal/support/page.tsx`, `src/app/api/webportal/support/checkout/route.ts`, `src/app/api/webportal/advertise/checkout/route.ts` | Next image rendering, multipart upload, Stripe redirects and shared webhook path | Image loads; test checkout and ad-upload validation; webhook dispatches correctly | P1 |
| New unified Expo mobile app, PR #223 | `apps/mobile/`, `src/app/api/mobile/v1/workspaces/route.ts` on separate feature branch | Next upgrade affects the API endpoint when branches combine, not the Expo runtime directly | After security PR lands, rebase PR #223; invalid/expired JWT denied; account-specific workspaces load; no cross-account access | P1 |

### Cross-cutting negative tests (required)

- Unauthenticated user cannot call private mutation or reach the owner UI.
- Membership revoked/suspended between requests is denied on the next server operation.
- Wrong Stripe signature and duplicate webhook do not grant a pass.
- Live/production environment never returns demo data; demo test never calls live Stripe.
- Unknown subdomain cannot rewrite to another business's workspace.
- Invalid file MIME/type/size rejected; file uploads cannot escalate to owner-only storage operations.
- Mutation responses consistently refresh the relevant dashboard; reload does not produce stale or phantom saved state.
- Manifests, JSON and webhook responses retain correct content types/status codes after response compression.

## 4. Required upgrade work, ordered by dependency

| ID | Action | Definition of done | Status |
| --- | --- | --- | --- |
| U1 | Change `next` and `eslint-config-next` to exact **16.4.6** | `package.json` aligned | **DONE** |
| U2 | Regenerate root `package-lock.json` using agreed Node/npm on a clean checkout | `npm ci` succeeds with consistent `@next/*` and associated deps | **DONE** |
| U3 | Align `.github/workflows/ci.yml`, audit workflow, and Vercel runtime to supported Node (recommended 24 after verification) | No Supabase engine warning; CI/runtime agreement documented | **DONE** — CI/audit workflows use Node 24; both Vercel projects report `nodeVersion: 24.x` |
| U4 | Run `npm audit --omit=dev --audit-level=high`, `npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build` | All green; no severity exception or security-gate bypass | **DONE** — CI run 1736, dependency audit run 802 |
| U5 | Run P0 Preview smoke tests for customer, business, org/seller, owner and auth | Capture evidence/screenshots without production writes | NOT DONE |
| U6 | Run Stripe test-mode webhooks, idempotency, refunds/failures and business billing regression | No incorrect paid state or duplicated customer entitlement | NOT DONE |
| U7 | Run uploads, business microsites, booking, demo/production isolation and WebPortal regressions | All P1 cases pass | NOT DONE |
| U8 | Rebase unified mobile PR #223 onto verified patch, rerun web+mobile checks | Shared bootstrap endpoint and website still work | NOT DONE |
| U9 | Record before/after observed behavior and merge approval; stage verified build then promote/release under approval | Rollback and monitoring plan documented | NOT DONE |

## 5. Rollout and rollback plan

1. Keep PR #222 **draft**; update and verify the security upgrade on a disposable Preview branch / isolated staging data. Do not test monetary mutations on production.
2. Run all automated gates, then complete the P0 and P1 matrix using Stripe test keys and separate demo fixtures.
3. Compare before/after data: purchase and entitlement counts, checkout-attempt state, webhook failures/retries, auth redirect failures, offer/redemption results, error logs and API response codes.
4. Merge only with explicit review of remaining issues and release approval; no changes to payment, publishing, entitlement or owner permissions by default.
5. After deployment, monitor auth errors, checkout failure ratio, webhook delivery/retry rate, server errors and subdomain routes. Stop rollout on any data-integrity or permission failure.
6. Roll back the web deployment if needed using Vercel's existing last-known-good production deployment. An urgent security rollback must be a time-limited containment action because it would re-expose the vulnerable framework; favor a repaired forward deployment.

## 6. Findings summary

- **P0 blocker:** current PR package/lockfile mismatch prevents reproducible CI installation.
- **P0 blocker:** PR #222 targets 16.4.3 even though 16.4.5 includes additional November security fixes. Target 16.4.6.
- **P0 blocker:** no 16.4.6 cross-workspace payment/auth smoke verification exists yet.
- **P1 gap:** app CI workflow uses Node 20 while currently installed Supabase dependencies require Node >=22.
- **P1 coordination:** PR #223 must be rebased and checked after the security patch merges.
- **No code-change requirement established:** no audit evidence currently requires rewriting business logic, replacing Supabase Auth, changing database schema, redoing React UI, or splitting RaiseHub into separate mobile apps.
- **Limit:** Static inspection and CI logs identify exposure and test cases; they do not prove an area will fail after the upgrade. Mark behavioral status as unverified until isolated Preview testing is complete.

**Approval recommendation:** Proceed with a narrowly scoped, version-locked security PR plus this regression plan. Block merge/promotion until reproducible CI, security audit, and priority workflow evidence are green.

## 7. Implementation and automated verification checkpoint — November 12, 2026

**Patch branch:** `security/nextjs-p0-nov2` · **Verified CI commit:** `516d949a556cce340b51844810f80c21be5fc94a`.

- `package.json`: `next` and `eslint-config-next` pinned to `16.4.6`; Node engine declared `>=22.0.0`.
- Root `package-lock.json`: regenerated by a controlled Node 24 GitHub runner and committed; package versions for `next`, `eslint-config-next` and `@next/swc-linux-x64-gnu` all verify as `16.4.6`. One-time lock regeneration workflow removed after use.
- `.github/workflows/ci.yml` and `dependency-audit.yml`: Node 24; existing lockfile repair verifier no longer expects 16.3.8.
- **GitHub Actions:** RaiseHub Dependency Audit run [802](https://github.com/zanibethel/raisehub/actions/runs/43254554726) **SUCCESS**, output `found 0 vulnerabilities` from `npm audit --omit=dev --audit-level=high`.
- RaiseHub Code Checks run [1736](https://github.com/zanibethel/raisehub/actions/runs/43254554582) **SUCCESS**: clean install, unit tests, lint, TypeScript and Next production build.
- RaiseHub CodeQL run [802](https://github.com/zanibethel/raisehub/actions/runs/43254554733) **SUCCESS**.
- RaiseHub Secret History Scan run [785](https://github.com/zanibethel/raisehub/actions/runs/43254554624) **SUCCESS**.
- Vercel `raisehub` Preview `dpl_Cpj4HftMbV9dcssz1nieV61LnQYm`: **READY** for the verified commit; `raisehub-demo` Preview `dpl_D9dZBtwtJhnZrpcDUhM7cP4TW8bc`: **READY** for the same commit.

**Vercel runtime inspection:** Connected Vercel project settings verify both `raisehub` (`prj_dgC022Tu2ua8xNgoBKRrenRmYAnd`) and `raisehub-demo` (`prj_jW5s9BRT8TEfl13P8SJLlDsGllYu`) use Node.js `24.x`.

**Unverified release gates:** Authenticated browser walkthroughs, real multi-role permissions, Stripe test-mode checkout and independently signed webhook replay, redemption idempotency, logo uploads, business microsite/booking, demo-vs-production behavior, and mobile PR #223 integration. Automated CI passing does *not* substitute for these checks.

**Release decision:** Keep PR #222 draft; do not merge or deploy production until the remaining P0/P1 behavioral smoke tests are evidenced and release approval is obtained. Production site remains on the previous main branch.

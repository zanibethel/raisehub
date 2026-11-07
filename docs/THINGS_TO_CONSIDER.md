# Things to Consider — RaiseHub

This is a review-only backlog. Entries are not approved code, deployment, schema, or pricing changes.

Last reviewed: 2026-11-07

## 1. Verify supported Node.js versions across CI and production

**Status:** Recommend read-only inventory / Evaluate patch  
**Added:** 2026-10-23  
**Last reviewed:** 2026-11-03

**Evidence:** Prior repository review found a CI workflow selecting Node 20 (end-of-life); the actual production Node patch version has not been established. Node.js shipped security updates Oct 21: 22.23.4, 24.22.1, 26.12.1.

**Possible solution:** Inspect CI runner and Vercel production runtime versions separately; test a supported patched release with checkout/webhook regression coverage.

**Recommendation:** Seek approval before changing CI/runtime settings or deploying.

Reference: https://nodejs.org/en/blog/vulnerability/october-2026-security-releases

**2026-10-29 evidence:** RaiseHub pins Next.js 16.3.8. Next.js has announced seven medium-severity fixes for Nov 3, but affected versions and patch instructions are not yet published. Read-only inventory of production/CI versions and test coverage now; plan a separate approved patched release after advisories, including checkout/webhook regression tests. Source: https://nextjs.org/blog/upcoming-nextjs-security-release-november-2026 .

**2026-10-31 evidence:** Epoch AI's Oct 29 Firefox patch-gap research demonstrates that public security fixes can become exploitable before users receive patched releases. This does not establish a RaiseHub vulnerability. Next.js's Nov 3 seven-issue advisory still has no published affected ranges in the reviewed evidence; continue read-only CI/production Node and browser/runtime inventory, then seek approval for isolated checkout/webhook regression testing and any deployment. Source: https://epoch.ai/publications/open-weight-models-patch-gap .

**2026-10-31 runtime verification:** Vercel `raisehub` project is configured for Node **24.x**, and `package.json` has no `engines.node`; Next.js is 16.3.8. This differs from the older CI Node 20 reference, so do not conflate CI and production runtimes. Vercel announced Node 26 LTS GA Oct 29 (default for new projects; existing upgrades depend on engine constraints). Verify actual build/function versions and test checkout/webhooks before any approved change. Source: https://vercel.com/changelog/node-js-26-lts-is-now-generally-available-on-vercel .

**2026-11-01 security evidence:** Wiz documented at least nine October AI developer-platform incidents involving stolen environment variables and provider keys; no RaiseHub exposure is established. Read-only inventory should cover Vercel/CI secret scopes and Stripe webhook credentials alongside the planned Nov 3 Next.js patch review. Current Stripe webhook counts remain **37 processed / 4 historical failed** with no new incident verified. **Recommendation:** review exposure, verify actual runtime and patch advisory, then seek separate approval for credential rotation, CI changes or deployment. Source: https://www.wiz.io/blog/black-october-for-ai-developer-platforms .

**2026-11-03 evidence:** Vercel's Nov 2 blocked-npm-package controls now automatically check supported lockfiles before and during **new** builds (including cache paths). This improves future-build protection but does not verify existing deployed dependencies, CI Node patch versions or the scheduled Next.js security release. No official Nov 3 affected-version advisory was verified at this morning's review. **Possible solution:** read-only CI/lockfile/deployed-runtime inventory; check official advisories and test webhook/checkout regressions in isolation before seeking deployment approval. **Recommendation unchanged:** no runtime, webhook, security or deployment changes from this review. Source: https://vercel.com/changelog/blocking-malicious-npm-packages-before-and-during-installation .

## 2. Stripe webhook processing acceptance

**Status:** Monitor / acceptance evidence pending  
**Added:** 2026-10-23  
**Last reviewed:** 2026-10-23

**Evidence:** Latest production commit `10e40b2` hardened webhook claims/retry failure handling. Database has 37 processed records and four historical failed records (latest July 25); no newly observed incident.

**Possible solution:** Read-only reconciliation and isolated duplicate/retry/lease-expiry tests before claiming end-to-end resilience.

**Recommendation:** No payment-policy or pricing change from this review.


**2026-11-04 runtime/security recheck (existing item 1):** Latest TLDR Dev (Nov 3) discusses Next.js 16.4 bundle analysis and AI-assisted import-chain optimization, but this is a vendor-reported opportunity, not a verified RaiseHub improvement. No independently confirmed Nov 3 Next.js affected-version matrix was obtained in this review. Connected Stripe event counts remain **37 processed / 4 historical failed**; no new payment incident established. **Status:** Evaluate read-only patch/runtime inventory; webhook consideration unchanged. **Possible solution:** verify deployed lockfile/Next.js version and official security advisory, then isolate bundle/checkout/webhook regressions before any proposed patch. **Recommendation:** no automatic dependency, runtime or production changes. Source: https://signup.tldr.tech/dev/2026-11-03 .


**2026-11-05 existing runtime/payment review:** Connected Stripe webhook table still **37 processed / 4 historical failed**; no new incident established. TLDR Tech Nov 4 highlights Siri App Intents and engineering context management, neither currently establishes a RaiseHub dependency or verified benefit. Reuters reports renewed AI/data-center policy uncertainty, not a direct RaiseHub product catalyst. **Status:** Existing webhook consideration unchanged; runtime-security patch inventory remains Evaluate. **Possible solution:** verify exact deployed framework version against official advisories and regression-test payment/webhook paths before any patch proposal. **Recommendation:** no new integration, pricing, deployment or payment-policy change. Sources: https://tldr.tech/tech/2026-11-04 ; connected Stripe webhook records.


**2026-11-06 runtime and payment consideration review (existing items 1–2):** AI developer and capital-market newsletters contain no independently verified RaiseHub-specific payment or framework incident. The database still exposes 41 historical Stripe webhook event rows, but processing-state columns were not independently rechecked in this run. **Status:** Runtime inventory Evaluate; webhook acceptance Monitor (unchanged). **Possible solution:** read-only deployed Next.js/Node advisory comparison and webhook retry/lease-expiry acceptance before any approved patch. **Recommendation:** no new payment, security-policy or deployment change. Sources: https://tldr.tech/tech/archives ; connected RaiseHub database.


**2026-11-07 existing runtime/webhook consideration review:** Connected Stripe webhook events remain **37 processed / 4 failed**, unchanged; no new incident established. TLDR Dev Nov 6 mentions React rendering latency and cheaper AI; neither demonstrates a RaiseHub-specific defect. **Status:** Runtime/Next.js advisory verification Evaluate; webhook acceptance Monitor (unchanged). **Possible solution:** verify deployed Node/Next patch versions and official advisories, then isolated webhook/checkout regressions if needed. **Recommendation:** no new integration, security-policy, payment or deployment change. Sources: https://tldr.tech/dev/archives ; connected RaiseHub database.

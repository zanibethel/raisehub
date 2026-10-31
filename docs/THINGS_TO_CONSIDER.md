# Things to Consider — RaiseHub

This is a review-only backlog. Entries are not approved code, deployment, schema, or pricing changes.

Last reviewed: 2026-10-29

## 1. Verify supported Node.js versions across CI and production

**Status:** Recommend read-only inventory / Evaluate patch  
**Added:** 2026-10-23  
**Last reviewed:** 2026-10-31

**Evidence:** Prior repository review found a CI workflow selecting Node 20 (end-of-life); the actual production Node patch version has not been established. Node.js shipped security updates Oct 21: 22.23.4, 24.22.1, 26.12.1.

**Possible solution:** Inspect CI runner and Vercel production runtime versions separately; test a supported patched release with checkout/webhook regression coverage.

**Recommendation:** Seek approval before changing CI/runtime settings or deploying.

Reference: https://nodejs.org/en/blog/vulnerability/october-2026-security-releases

**2026-10-29 evidence:** RaiseHub pins Next.js 16.3.8. Next.js has announced seven medium-severity fixes for Nov 3, but affected versions and patch instructions are not yet published. Read-only inventory of production/CI versions and test coverage now; plan a separate approved patched release after advisories, including checkout/webhook regression tests. Source: https://nextjs.org/blog/upcoming-nextjs-security-release-november-2026 .

**2026-10-31 evidence:** Epoch AI's Oct 29 Firefox patch-gap research demonstrates that public security fixes can become exploitable before users receive patched releases. This does not establish a RaiseHub vulnerability. Next.js's Nov 3 seven-issue advisory still has no published affected ranges in the reviewed evidence; continue read-only CI/production Node and browser/runtime inventory, then seek approval for isolated checkout/webhook regression testing and any deployment. Source: https://epoch.ai/publications/open-weight-models-patch-gap .

## 2. Stripe webhook processing acceptance

**Status:** Monitor / acceptance evidence pending  
**Added:** 2026-10-23  
**Last reviewed:** 2026-10-23

**Evidence:** Latest production commit `10e40b2` hardened webhook claims/retry failure handling. Database has 37 processed records and four historical failed records (latest July 25); no newly observed incident.

**Possible solution:** Read-only reconciliation and isolated duplicate/retry/lease-expiry tests before claiming end-to-end resilience.

**Recommendation:** No payment-policy or pricing change from this review.

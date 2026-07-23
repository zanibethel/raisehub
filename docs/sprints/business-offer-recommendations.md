# Business Offer Recommendation Sprint

## Goal

Redesign the business offer recommendation step into a focused, mobile-friendly one-card-at-a-time experience that businesses can save permanently and resume from the business dashboard.

## Baseline

- Base branch: `main`
- Base commit: `631ef3db9173b3b20c134352fd1e3307a3bfc68c`
- Sprint branch: `sprint/business-offer-recommendations`
- Pull request: draft while sprint work and QA remain active
- Stripe: Sandbox/test mode only unless live cutover is explicitly approved

## Focused scope

### Recommendation experience

- [ ] Show one recommendation card at a time.
- [ ] Add Previous and Next controls.
- [ ] Add visible position/progress indication.
- [ ] Keep Continue disabled or guarded until a recommendation is selected.
- [ ] Add Back to Dashboard.
- [ ] Preserve accessible keyboard and desktop behavior while prioritizing mobile usability.

### Permanent Save for Later

- [ ] Inspect existing Supabase schema, grants, functions, migrations, and RLS before database changes.
- [ ] Reuse an existing persistence model if one already fits safely.
- [ ] Otherwise add a narrowly scoped committed migration for saved business recommendations.
- [ ] Save recommendations to the authenticated business account.
- [ ] Prevent one business from reading or changing another business's saved recommendations.
- [ ] Allow saved recommendations to be removed.
- [ ] Record whether any migration was reviewed and applied successfully.

### Dashboard resume

- [ ] Show saved recommendation status on the business dashboard.
- [ ] Provide a clear resume action that returns to the recommendation flow.
- [ ] Restore enough context to continue without making the business repeat completed choices.
- [ ] Give an actionable empty state when no recommendation is saved.

### Controlled-pilot validation

- [ ] Run focused Business QA for authentication, recommendation navigation, persistence, resume, offer creation handoff, role isolation, and mobile usability.
- [ ] Run Organization QA only for regression paths affected by shared dashboard, routing, permissions, notifications, or offer data.
- [ ] Inspect preview build and runtime errors when a flow fails.
- [ ] Add production monitoring or launch alerts only where they directly cover this sprint's critical flow and reuse existing systems.

## Out of scope

- Customer recommendation redesign.
- Seller Rewards Pass implementation.
- Broad business onboarding redesign.
- Broad organization workspace redesign.
- Stripe live-payment cutover.
- General Owner Console redesign.
- Unrelated notification, analytics, or automation expansion.

## Test evidence

Record each result with environment, branch/commit, account role, action, expected result, actual result, and evidence link or screenshot note.

- [ ] Static checks: TypeScript.
- [ ] Static checks: lint.
- [ ] Static checks: production build.
- [ ] Automated regression coverage for recommendation navigation and persistence logic.
- [ ] Preview deployment verified against the exact branch and commit SHA.
- [ ] Mobile browser evidence.
- [ ] Desktop browser evidence.
- [ ] Database persistence evidence.
- [ ] Cross-business isolation evidence with two business accounts.
- [ ] Business-to-organization regression evidence where shared behavior is touched.

## Discovered blockers

- None recorded yet.

## Fixes made

- None recorded yet.

## Remaining manual QA

- [ ] To be guided one test at a time after a matching preview deployment is READY.

## Exit criteria

This sprint is complete only when:

1. The recommendation step shows exactly one card at a time with working Previous, Next, progress, selection, Continue, and Back to Dashboard controls.
2. A signed-in business can save a recommendation, refresh or sign out, return later, and resume it from the business dashboard.
3. Saved recommendation data is account-scoped and cross-business isolation is proven with two accounts.
4. Selecting or resuming a recommendation correctly populates the existing offer-details workflow without duplicating recommendation or offer-building logic.
5. Mobile and desktop behavior are verified in the matching Vercel preview deployment.
6. TypeScript, lint, build, and relevant automated tests pass, or any blocker is documented with exact evidence.
7. Focused Business QA critical paths pass; Organization QA confirms no regression in any shared behavior changed by this sprint.
8. The preview deployment is READY for the final sprint commit, available CI/status checks are acceptable, and no unresolved production-severity runtime error remains.
9. The pull request remains draft until final review and is not merged without explicit approval.

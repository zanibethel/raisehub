# Live Platform and Interactive Demo

## Product decision

RaiseHub has one public brand and one primary experience-selection page. Visitors choose between **Live Platform** and **Interactive Demo** before entering an operating experience.

The user-facing term is **Interactive Demo**. Internal implementation terms such as `is_demo`, `demo_group`, deployment environment variables, and database names must not appear in customer-facing copy.

## Routing and deployment model

RaiseHub continues to use one codebase deployed to two Vercel projects:

- `https://raisehub.app` — Live Platform
- `https://demo.raisehub.app` — Interactive Demo

The root page presents the experience chooser. The Live action enters the production campaign experience. The Interactive Demo action opens `/demo` on the demo deployment, where visitors select a supporter, business, or organization experience without creating a new account.

The selected experience survives refreshes and direct links because it is defined by the deployment hostname and `NEXT_PUBLIC_APP_MODE`, not temporary browser state. Existing public campaign, redemption, authentication callback, owner, and dashboard routes remain unchanged.

## Environment indicators

Application navigation displays one compact label:

- `RaiseHub · Live Platform`
- `RaiseHub · Interactive Demo`

The demo label also states that sample data is being used and provides actions to switch to Live or return to the experience selection page. Labels use text in addition to visual styling so the distinction does not depend on color alone.

## Data separation expectations

The deployment boundary does not replace row-level safeguards. Existing repository queries must continue to apply `is_demo` filtering according to app mode, and `demo_group` remains the grouping mechanism for reusable demo scenarios.

Expected behavior:

- Live public pages exclude demo-only rows.
- Interactive Demo pages exclude production-only rows.
- Owner tools may intentionally inspect both when their current controls allow it.
- Demo actions may only operate on demo accounts and demo-owned records.
- Reset behavior remains controlled by Demo Center; no public shared-data reset was added.

No database redesign or migration is part of this sprint.

## Stripe safety

Interactive Demo must never initiate a real Stripe payment. Existing demo-mode checkout guards remain mandatory. New demo entry actions only authenticate into existing public demo accounts and do not create checkout sessions.

## Authentication and redirects

Live authentication, onboarding, and role-based dashboard routing are unchanged. Interactive Demo uses the existing `/api/demo/login` endpoint and existing demo-account destinations. The new entry routes do not alter auth callback routes or middleware.

## Deployment implications

Both Vercel projects must continue deploying the same `main` branch with different configuration:

- Live project: production/default app mode
- Demo project: `NEXT_PUBLIC_APP_MODE=demo` and the existing demo account credentials

The canonical cross-environment links are `raisehub.app` and `demo.raisehub.app`. These links should be updated only if the canonical domains change.

## Deferred work

- A full guided product tour
- Rebuilding Demo Center or Experience Viewer
- Public demo reset controls
- A separate demo database
- Broader marketing-site redesign
- Expanded automated end-to-end coverage for cross-domain navigation

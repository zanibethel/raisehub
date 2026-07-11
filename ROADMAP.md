# RaiseHub Roadmap

## Phase 1

- [x] Authentication
- [x] Business dashboard
- [x] Customer dashboard
- [x] Offer saving
- [x] Offer removal
- [x] Business offers
- [x] Campaign creation

---
# Phase 5 — Platform Console

Goal:

Create a single Owner experience capable of operating, supporting, and testing the entire RaiseHub platform.

Features:

## Workspace System

- Workspace selector
- Business workspaces
- Organization workspaces
- Customer workspaces
- Recent workspaces
- Favorites

## Support

- Read-only support mode
- Assisted editing
- Audit logging
- Support notes

## Navigation

- Global workspace search
- Keyboard shortcut (⌘K / Ctrl+K)

## Platform

- Revenue
- Health
- Client management
- Feature flags
- Platform settings

Result:

One owner login can safely access every client experience without changing authentication identity.


## Preparing for Launch

- [ ] Technical audit
- [ ] Demo businesses
- [ ] Demo campaigns
- [ ] Demo offers
- [ ] Campaign progress bug
- [ ] Mobile QA
- [ ] Business onboarding
- [ ] Organization onboarding

---

## Phase 2 — Demo Infrastructure

- [ ] Define APP_MODE strategy for demo vs production
- [ ] Add demo mode detection
- [ ] Add demo banner
- [ ] Add "Build My RaiseHub" CTA
- [ ] Plan demo mode routing on the current Vercel app (`raisehub.vercel.app` + `APP_MODE`); treat `demo.raisehub.com` as a future custom-domain goal, not available today
- [ ] Ensure production behavior is unchanged
- [ ] Prepare for demo data tagging/hiding

---

## Future

- Stripe
- QR redemption
- Admin dashboard
- Analytics
- Email automation
- Mobile apps
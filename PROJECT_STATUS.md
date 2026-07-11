# RaiseHub Project Status

# RaiseHub Project Status

## Current Version

### v0.8 — Platform Foundation

**Goal**

Complete every core dashboard and business workflow before introducing payments.

---

## Current Sprint

### Business Dashboard Completion

Remaining work

- [ ] Archive Offer
- [ ] Restore Offer
- [ ] Duplicate Offer Wizard
- [ ] Extend Offer
- [ ] Attention Center integration
- [ ] Offer Health integration
- [ ] Notification Center
- [ ] Business reports polish

---

## Next Sprint

### Customer Dashboard

Planned work

- Customer home
- Digital member pass
- Saved offers
- Nearby businesses
- Redemption history
- Savings tracker
- Notification center

---

## Upcoming Sprint

### Organization Dashboard

Planned work

- Campaign management
- Coupon book progress
- Fundraising analytics
- Student seller tracking
- Organization reports

---

## Future Sprint

### Admin Dashboard

Planned work

- Business management
- Organization management
- User management
- Offer moderation
- Platform reports

---

## Future Sprint

### Owner Dashboard

Planned work

- Marketplace analytics
- Platform health
- Executive reporting
- Personal finance
- Growth metrics
- Business benchmarking

---

## v0.9 Goal

Monetization

- Stripe
- Subscription plans
- Billing
- Revenue reporting

---

## v1.0 Goal

Public Launch

- Mobile app
- Production onboarding
- Live organizations
- Live businesses
- Marketing
- Help center

---

## Current Blockers

None

---

## Guiding Principles

Before implementing new features, verify they align with:

- ARCHITECTURE_PRINCIPLES.md
- BUSINESS_PHILOSOPHY.md
- RULE_ENGINE.md
- PRODUCT_DECISIONS.md

If a feature conflicts with these documents, revisit the decision before implementation.

## Current Goal

Prepare RaiseHub for live business onboarding.

---

## Current Focus

Building an AI-assisted development workflow using Hermes.

---

## Known Issues

- Campaign progress differs between local and live environments. Root cause identified: local and production share the **same Supabase project** (confirmed via Vercel/Supabase project-ref comparison), so local dev/test activity writes directly into production data. Progress calculation is also missing a `payment_status` filter in two places and duplicates the same math in two components. See `TECHNICAL_AUDIT.md` and its addendum for full detail.
- Local development currently has no environment isolation from production (see Lesson in `LESSONS_LEARNED.md`).

---

## Completed Recently

- Terms and Conditions
- Homepage improvements
- Footer additions
- Redemption reporting
- Business dashboard improvements
- Technical audit performed (`TECHNICAL_AUDIT.md`, with addendum covering root-cause investigation and Supabase project verification)
- Campaign progress discrepancy investigated and root-caused
- Demo/staging data strategy scoped (tagging, hiding, UI labels, mobile preview approach)
- `HERMES_PLAYBOOK.md` created — defines Hermes working agreement for RaiseHub and future projects
- `DEMO_EXPERIENCE.md` created — defines demo vision, banner copy, CTA copy, and demo data requirements (domain plan corrected to reflect current `raisehub.vercel.app` deployment; `demo.raisehub.com`/`raisehub.com` are future custom-domain goals)
- `ROADMAP.md` updated with new "Phase 2 — Demo Infrastructure" section
- Renamed `LESSSON_LEARNED.md` → `LESSONS_LEARNED.md` (typo fix) and updated references

---

## Next Tasks

1. Fix campaign progress bug (root-caused; remediation options scoped — awaiting approval to implement)
2. Establish local/production Supabase environment separation (elevated priority — currently shared)
3. Implement Phase 2 — Demo Infrastructure (`APP_MODE` strategy ✅, demo mode detection ✅, demo banner ✅, "Build My RaiseHub" CTA ✅ — all built against the current `raisehub.vercel.app` deployment; domain routing plan (`demo.raisehub.com`) remains a future goal)
4. Demo business/campaign/offer content migration
5. Mobile QA
6. Business & organization onboarding

---

# July 2026 Progress Update

## Completed

✓ Multi-step Business Onboarding

✓ AI-inspired Offer Wizard

✓ Business-type-specific recommendations

✓ RaiseHub Offer Score

✓ Offer Economics

✓ Offer lifecycle

- Active
- Pause
- Resume
- Expired

✓ Business Dashboard improvements

✓ Status badges

✓ Dashboard metrics

✓ Rule-based architecture planning

✓ Documentation overhaul

---

## Current Focus

Business Dashboard completion.

Remaining work includes:

- Archive offers
- Duplicate offers
- Extend offers
- Attention Center
- Offer Health
- Notification Center

---

## Upcoming

Customer Dashboard

Organization Dashboard

Admin Dashboard

Owner Dashboard

Stripe integration

Native Mobile App

---

## Engineering Direction

RaiseHub now prioritizes:

Rule Engine

↓

Analytics

↓

AI

AI is optional.

Rule Engine is foundational.

---

## Documentation

Project philosophy is now documented in:

- Architecture Principles
- Business Philosophy
- Rule Engine
- Product Decisions
- Owner Vision
- Idea Backlog

Future development should reference these documents before introducing major features.
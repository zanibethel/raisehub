# RaiseHub Project Status

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
- `DEMO_EXPERIENCE.md` created — defines demo.raisehub.com vision, banner copy, CTA copy, and demo data requirements
- `ROADMAP.md` updated with new "Phase 2 — Demo Infrastructure" section
- Renamed `LESSSON_LEARNED.md` → `LESSONS_LEARNED.md` (typo fix) and updated references

---

## Next Tasks

1. Fix campaign progress bug (root-caused; remediation options scoped — awaiting approval to implement)
2. Establish local/production Supabase environment separation (elevated priority — currently shared)
3. Implement Phase 2 — Demo Infrastructure (`APP_MODE` strategy, demo mode detection, demo banner, "Build My RaiseHub" CTA, demo.raisehub.com routing plan)
4. Demo business/campaign/offer content migration
5. Mobile QA
6. Business & organization onboarding
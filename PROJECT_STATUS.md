# RaiseHub Project Status

**Last updated:** July 2026  
**Current version:** v0.8 — Platform Foundation  
**Overall status:** Stable development build  
**Current initiative:** Owner Platform Console and Workspace System

---

## Current Product Position

RaiseHub is a community fundraising and local-business growth platform.

The core product now supports:

- Customer accounts
- Business accounts
- Organization accounts
- Admin accounts
- Permanent Owner accounts
- Fundraising campaigns
- Campaign purchases
- Local business offers
- Saved offers
- Offer redemptions
- Role-specific dashboards
- Rule-based offer health and dashboard alerts
- Demo-mode infrastructure
- GitHub Actions build verification

The immediate goal is to turn the Owner Platform Console into the central operating system for testing, supporting, and managing RaiseHub.

---

## Current Architecture Status

### Dashboard Refactor

Status: **Complete**

Completed:

- Business dashboard extracted into modular files
- Customer dashboard extracted into modular files
- Organization dashboard extracted into modular files
- Admin dashboard extracted into modular files
- Owner Platform Console introduced
- `src/app/dashboard/page.tsx` reduced to role routing and orchestration
- Dashboard structure standardized around:
  - Loader
  - Content
  - Sections
  - Reusable components
- Dependency-first migration workflow adopted
- GitHub Actions kept green between completed commits

### Data Architecture

Status: **In progress**

Completed:

- Workspace service introduced
- Workspace repository introduced
- Service and repository responsibilities separated
- Platform components introduced under `src/components/platform/`

Current direction:

```text
UI
↓
Service
↓
Repository
↓
Database
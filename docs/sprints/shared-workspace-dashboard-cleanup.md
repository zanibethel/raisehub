# Shared Workspace and Dashboard Cleanup Sprint

## Goal

Create a consistent, compact workspace experience across Customer, Organization, and Business dashboards while preserving role isolation and existing workflows.

## Branch

`sprint/shared-workspace-dashboard-cleanup`

## Baseline

`main` at `d53e25c49cd4f8fa609bd625ebf75f2bf3e22323`

## In scope

- Rename and clarify the shared workspace/account switcher experience.
- Keep existing authorized workspaces grouped separately from account creation paths.
- Add valid, non-404 entry points for missing Customer and Organization experiences after route verification.
- Reuse a consistent compact dashboard header pattern for Customer and Organization.
- Condense Customer dashboard cards while keeping pass, saved offer, redemption, and nearby-offer actions discoverable.
- Condense Organization dashboard cards while keeping campaign creation, campaign management, seller performance, supporter activity, and financial summaries discoverable.
- Preserve role isolation and server-side authorization on every workspace destination.
- Add focused Business, Customer, and Organization regression QA.
- Define the data requirements for annual Business activity reports without presenting tax advice or unsupported deductible totals.

## Out of scope

- Broad Owner Console redesign.
- New payment pricing or Stripe production changes.
- Changing Customer pass entitlement rules.
- Changing Organization campaign accounting rules.
- Claiming discounts are automatically tax deductible.
- Replacing existing authorization with client-side workspace selection.

## Planned sequence

1. Inspect shared account menu, workspace resolution, and role-specific signup routes.
2. Document existing Customer and Organization dashboard sections and actions.
3. Implement shared switcher wording and safe missing-experience actions.
4. Implement compact Customer dashboard layout.
5. Implement compact Organization dashboard layout.
6. Verify Business dashboard remains unchanged except for shared controls.
7. Add annual Business report data requirements and follow-up implementation plan.
8. Run preview QA and role regression checks.

## Exit criteria

- Existing workspaces switch correctly without exposing unauthorized data.
- Missing-experience links resolve to valid routes and do not produce 404s.
- Customer dashboard is materially shorter and its primary actions remain visible.
- Organization dashboard is materially shorter and its primary actions remain visible.
- Business dashboard header and editing behavior still work.
- Mobile layouts have no clipped names, overlapping controls, or inaccessible expansion panels.
- Preview deployment is READY and manually reviewed before merge.
- PR remains draft until explicit approval.

## Status

- [x] Branch created from merged Business sprint baseline.
- [x] Initial Customer and Organization loaders inspected.
- [ ] Shared switcher and destination routes inspected.
- [ ] Customer dashboard content structure inspected.
- [ ] Organization dashboard content structure inspected.
- [ ] Implementation started.
- [ ] Preview QA started.
- [ ] Regression QA completed.

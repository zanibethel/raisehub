# RaiseHub Feature Placeholder Audit — 2026-09-17

## Purpose

Review customer-facing and owner-facing areas that use language such as **Coming soon**, **Coming Later**, **Next phase**, **not configured**, or **not connected yet** and separate them into:

1. Features that already had enough foundation to finish now.
2. Defensive configuration fallbacks that do not indicate a current product gap.
3. Features that still require real product or integration work before they should be advertised as live.
4. Architectural debt that should be resolved without weakening environment or workspace isolation.

This audit intentionally does **not** mark a feature live simply to remove placeholder language. A feature only moves to live when there is a real data path, permission model, and usable customer or owner experience behind it.

---

## 1. Moved to Live During This Audit

### Business signup Partner Rewards explanation

**Status:** LIVE

The business signup experience now explains Partner Points and Partner Rewards without promising a fixed cash value or guaranteed payout amount.

Public positioning includes:

- Complete the business profile.
- Become verified.
- Keep valuable offers active.
- Generate real redemption activity.
- Refer other local businesses.
- Use eligible points for currently available RaiseHub benefits or retain them toward the business's proportional quarterly Partner Rewards Pool share.

The copy preserves the existing rule that Partner Points do not have a fixed cash value.

---

### Featured Offer Partner Reward

**Prior state:** Marketplace item existed but was inactive / coming soon.

**Status:** LIVE

Implementation now connects an active `featured_offer_7d` reward redemption to the existing **Exclusive Local Deals** carousel.

Current behavior:

- Cost: 400 eligible Partner Points.
- Duration: 7 days.
- Requires a qualifying active offer.
- Non-stackable.
- The rewarded business's newest qualifying active offer is moved ahead of standard offers in the public carousel.
- The promoted offer displays a **Featured Partner** badge.

The marketplace item is active in the live Supabase project.

---

### QR Instant Verification

**Prior state:** `qr_code` was marked planned / Coming Later.

**Status:** LIVE OPTIONAL TOOL

RaiseHub's core redemption workflow remains **24-Hour Auto Validation**. QR is an optional immediate-verification path, not a required checkout step.

Current flow:

1. Supporter taps **Redeem Offer**.
2. RaiseHub records the redemption immediately.
3. The supporter receives a short-lived QR code plus the existing six-character fallback code.
4. Staff scans the QR with a standard phone camera.
5. The QR opens `/dashboard/redeem?code=...` in RaiseHub.
6. If staff needs to log in, the code is preserved through the login redirect.
7. RaiseHub prefills the verification code.
8. Staff taps **Verify Now** before confirmation is committed.
9. If staff does nothing, the normal 24-hour review/auto-confirm workflow remains unchanged.

No external scanner SDK or POS dependency is required for this version.

---

### Owner Support — Business Redemptions

**Prior state:** Next phase.

**Status:** LIVE READ-ONLY SUPPORT VIEW

Owner Support can now review:

- Recent redemption records.
- Pending / confirmed / rejected state.
- Customer-value snapshot.
- Confirmation method.
- Auto-confirm timing.
- Confirmation / rejection timestamps and rejection reason.

Live and demo data remain separated.

---

### Owner Support — Business Analytics

**Prior state:** Next phase.

**Status:** LIVE READ-ONLY SUPPORT VIEW

Uses existing RaiseHub event tables rather than creating a second analytics system.

Owner Support can now review:

- Offer views.
- Offer clicks.
- Saved offers.
- Confirmed redemptions.
- Redemption-to-view conversion rate.
- Per-offer and business-wide totals.

Live and demo data remain separated.

---

### Owner Support — Organization Sellers

**Prior state:** Next phase.

**Status:** LIVE READ-ONLY SUPPORT VIEW

Uses the existing campaign seller roster and purchase attribution data.

Owner Support can now review:

- Seller roster entries.
- Active status.
- Whether the roster entry has been claimed/linked to a seller account.
- Campaign association.
- Paid sales count.
- Gross seller-attributed sales.
- Organization earnings from those sales.

---

### Owner Support — Organization Financials

**Prior state:** Next phase.

**Status:** LIVE READ-ONLY SUPPORT VIEW

Uses existing paid campaign purchases and the organization transfer ledger.

Owner Support can now review:

- Passes sold.
- Gross volume.
- Platform fees.
- Organization earnings.
- Donations.
- Completed transfer total.
- Pending transfer total.
- Recent transfer status / failures.

---

### Canonical workspace dashboard bridge

**Prior state:** A canonical Business or Organization workspace without a `legacy_profile_id` could be recognized by access control but blocked by the dashboard with **workspace is not connected yet**.

**Status:** PRIMARY DASHBOARD PATHS LIVE

The main Business and Organization experiences now route by canonical workspace ID. Legacy profile IDs remain compatibility data rather than a prerequisite for opening the selected workspace.

Business migration completed during this audit:

- Main dashboard routes the canonical `businesses.id` into the Business dashboard loader.
- Business profile data can load directly from `businesses` when no legacy profile exists.
- Offer reads accept canonical and legacy-linked offer rows during the transition.
- Offer create, edit, pause, and reactivate actions resolve the currently selected Business workspace server-side.
- Offer RLS now authorizes active Business members for reads and limits writes to Owner/Manager memberships.
- `/dashboard/offers` edits the selected canonical Business instead of silently editing `profiles.id = auth.uid()`.
- Canonical businesses receive a workspace-linked profile editor with membership authorization.
- Offer recommendations use the canonical Business category.
- Saved offer drafts are now isolated by canonical Business through `business_workspace_offer_drafts`; the old user-owned draft table remains intact for legacy-only accounts.
- A person managing multiple businesses can therefore maintain separate business-owned drafts rather than sharing one user-level draft.
- Rewards and Reports preserve the selected canonical Business ID.

Organization migration confirmed during this audit:

- Main dashboard routes canonical `organizations.id` directly into the Organization dashboard loader.
- Campaign reads use `canonical_organization_id` with legacy fallback only where required for historical rows.
- Campaign creation already writes `canonical_organization_id` and authorizes Organization Admin/Manager membership.
- Campaign update/review actions already resolve authorization through the canonical Organization when present.
- Campaigns and Reports preserve the selected canonical Organization ID.
- Seller and financial dashboard data already operate from canonical Organization context.

The previous `WorkspaceUnavailable` bridge is no longer required by the primary dashboard router. Existing legacy links remain supported so this migration does not strand older accounts.

---

## 2. Already Live — Placeholder-Like Fallback Is Defensive

### Cron configuration guards

**Status:** CONFIGURED

Code contains `not configured` fallbacks for missing `CRON_SECRET`, but production verification on 2026-09-17 returned **401 Unauthorized** (rather than the 503 not-configured response) for both:

- `/api/cron/business-notifications`
- `/api/cron/partner-rewards-report`

This confirms the production secret is present and the routes are protected.

Do not remove these fallback checks; they are useful deployment safety guards.

---

### Secure Stripe checkout fallback messages

**Status:** DEFENSIVE FALLBACK, NOT CLASSIFIED AS A CURRENT FEATURE GAP

Checkout code intentionally returns messages such as **Secure checkout is not configured yet** when Stripe credentials are absent.

The database contains production `paid` campaign purchases, so the existence of the fallback text alone should not be treated as evidence that production checkout is unfinished.

Keep the defensive fallback unless live checkout verification discovers an actual environment/configuration failure.

---

### Transactional email / inbound mail fallbacks

**Status:** CONFIGURATION GUARDS — VERIFY WHEN TESTING COMMUNICATION FLOWS

Email code contains safe skip / 503 paths when Resend or inbound-mail environment variables are absent.

These should remain as guards. Treat them as a product problem only if an expected production email or inbound-message workflow fails an end-to-end test.

---

## 3. Intentionally Still Coming Later

These items should **not** be activated merely to remove placeholder text.

### POS Discount Code

**Current status:** PLANNED

A real supported point-of-sale workflow does not yet exist. The six-character RaiseHub verification code works inside RaiseHub, but that is not the same as distributing or validating a discount code inside a third-party POS.

**Needed before activation:**

- Define supported POS workflow(s).
- Secure code lifecycle / redemption semantics.
- Reconciliation with the canonical RaiseHub redemption record.
- Duplicate / replay protection.
- Merchant-facing setup and troubleshooting guidance.

---

### Square Integration

**Current status:** PLANNED

**Needed before activation:**

- Square OAuth / connected merchant account flow.
- Location selection.
- Webhook/event reconciliation.
- Mapping Square transactions to RaiseHub offers/redemptions.
- Disconnect/reconnect handling.
- Demo/live separation and test coverage.

This should remain clearly labeled as future integration work.

---

### Event Promotion Partner Reward

**Current status:** INACTIVE

Marketplace item exists, but RaiseHub does not currently have a sufficiently complete canonical business-event model and public event-promotion surface to make this reward meaningful.

**Needed before activation:**

- Business event entity / fields.
- Public event discovery or promotion surface.
- Eligibility rules and moderation.
- Reward redemption -> promoted event placement connection.

---

### AI Website Copy Refresh Partner Reward

**Current status:** INACTIVE

The business website builder is real, but there is not yet a production-safe AI rewrite workflow with review/approval before publishing.

**Needed before activation:**

- Explicit business request/action.
- AI-generated copy proposal.
- Side-by-side review or preview.
- Business approval before persisted changes.
- Revision/audit record and safe rollback.

---

### Website Analytics Plus Partner Reward

**Current status:** INACTIVE

A published `business_sites` model exists, but the audit did not find a mature dedicated website traffic/engagement event foundation comparable to the offer analytics tables.

**Needed before activation:**

- Site page-view / visitor event model.
- Demo/live separation.
- Privacy-conscious aggregation.
- Baseline free analytics definition.
- Clear definition of what **Analytics Plus** adds.

---

### Featured Business Website Partner Reward

**Current status:** INACTIVE

The business website builder exists, but there is not yet a clear public RaiseHub website-discovery surface where a purchased featured placement would reliably appear.

**Needed before activation:**

- Public business-site discovery surface.
- Placement rules.
- Eligibility for published/approved sites only.
- Reward redemption -> placement linkage.
- Expiration / non-stackable behavior.

---

## 4. Architectural Debt — Remaining Compatibility Work

### Legacy-profile compatibility references

**Status:** NON-BLOCKING TRANSITION DEBT

`legacy_profile_id` still exists throughout RaiseHub because historical Business and Organization data was originally attached to profile IDs. It should not be removed wholesale until historical rows are migrated or their canonical linkage is proven complete.

The key distinction after this audit is:

- A missing legacy profile no longer blocks the primary selected Business or Organization dashboard.
- New Business offer writes can use the canonical Business ID.
- New Organization campaigns already store the canonical Organization ID.
- Legacy IDs remain as explicit compatibility fallbacks for historical rows and older accounts.

Remaining work should therefore be handled as targeted compatibility cleanup, not by restoring a global legacy-profile requirement.

Recommended follow-up checks:

1. Runtime-test a brand-new canonical Business with no legacy profile from signup through profile edit, offer draft, publish, pause/reactivate, QR redemption, analytics, and Partner Rewards.
2. Runtime-test a brand-new canonical Organization from signup through profile completion, campaign creation/review, seller roster, checkout, financial reporting, and Stripe payout onboarding.
3. Search individual specialty routes for direct `profiles.id = auth.uid()` assumptions and migrate only those that represent workspace-owned state.
4. Keep legacy fallbacks until historical production records have an explicit canonical owner.

---

## 5. Empty States That Are Not Missing Features

Do not treat normal empty-state language as unfinished functionality.

Examples include:

- No local deals yet / new local deals are coming.
- Profile field is not set yet.
- No redemption activity yet.
- No seller roster entries yet.
- No transfers yet.

These are legitimate states when a user or network has not created data yet.

---

## 6. Current Placeholder Priority

### Highest priority

**Canonical workspace runtime verification + targeted compatibility cleanup**

Reason: the architectural blocker has been removed from the primary dashboard path. The next job is proving the no-legacy-profile flows end-to-end and finding any specialty route that still stores workspace-owned data against the signed-in person.

### Integration backlog

1. POS Discount Code.
2. Square integration.
3. Business event model + Event Promotion reward.
4. Business-site traffic analytics + Website Analytics Plus.
5. Public business-site discovery + Featured Business Website reward.
6. AI website copy proposal/review workflow + AI Copy Refresh reward.

The order can change based on launch demand, but none should be represented as live before its real workflow is connected.

---

## 7. Audit Principle

RaiseHub should keep using the same standard for future placeholder cleanup:

> **Do not remove “Coming soon” by changing the label. Remove it by connecting the feature to real data, permissions, behavior, and a testable user outcome.**

This keeps public promises aligned with the actual platform and prevents support debt from features that look enabled but are not operational.

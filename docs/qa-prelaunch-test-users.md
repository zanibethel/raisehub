# RaiseHub QA Prelaunch Test Users

## Purpose

This document records the temporary `qa_prelaunch_2026` test dataset used for prelaunch verification.

Passwords and private credentials are intentionally excluded from the repository.

## Batch identity

- Seed batch: `qa_prelaunch_2026`
- Email pattern: `qa.%@raisehubtesting.com`
- Cleanup script: `supabase/verification/qa-prelaunch-cleanup.sql`
- Cleanup status: Not run
- Intended removal: Before production launch

## Verified user coverage

The connected RaiseHub Supabase project contains 11 confirmed QA users:

| Role | Count |
|---|---:|
| Customer | 5 |
| Business | 2 |
| Organization | 2 |
| Admin | 1 |
| Owner | 1 |
| Total | 11 |

All 11 users have confirmed email identities.

## Setup-state coverage

| State | Count |
|---|---:|
| Onboarding complete | 8 |
| Onboarding incomplete | 3 |
| Demo users | 2 |
| Production users | 9 |

The dataset includes:

- Clean Production customer with no active pass
- Production customer with an active pass
- Incomplete Production customer
- Clean Demo customer with no active pass
- Demo customer with an active pass
- Complete Business user
- Incomplete Business user
- Complete Organization user
- Incomplete Organization user
- Admin user
- Owner user

## Related test data

The verified QA batch includes:

| Resource | Count |
|---|---:|
| Business entities | 1 |
| Organization entities | 1 |
| Business memberships | 1 |
| Organization memberships | 1 |
| Active QA campaigns | 1 |
| Active QA offers | 1 |
| Customer entitlements | 2 |

## Intended test coverage

Use this batch to verify:

- Login and role-based routing
- Complete and incomplete onboarding
- Customer checkout without an existing pass
- Donation-only behavior with an active pass
- Demo checkout and Demo-group isolation
- Business membership and offer access
- Organization membership and campaign access
- Admin authorization
- Owner authorization
- Purchase snapshot creation
- Entitlement creation
- Production and Demo separation
- Cleanup before launch

## Security rules

- Never commit QA passwords.
- Keep the credentials file outside the repository.
- Do not share Admin or Owner credentials outside the testing group.
- Do not use QA accounts for real customer, business, or organization activity.
- Review the cleanup script against the current schema before running it.
- Run cleanup only with explicit launch-readiness approval.

## Current verification status

Database structure and account setup have been verified.

Visual browser login, role routing, checkout interaction, and deployed customer experience remain to be executed and recorded separately.
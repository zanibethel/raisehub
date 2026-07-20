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

On July 20, 2026, the committed readiness script was executed against the connected RaiseHub Supabase production project:

```text
supabase/verification/qa-prelaunch-readiness.sql
```

Result:

```text
0 violations
```

This confirms that:

- All 11 expected QA users exist.
- No unexpected users are included in the QA batch.
- Roles, Demo flags, Demo groups, and onboarding states match the intended matrix.
- Email identities are present and confirmed.
- Active entitlement counts match the clean-customer and active-pass scenarios.
- The complete Business entity, membership, and QA offer exist.
- The complete Organization entity, membership, and QA campaign exist.
- The dedicated `qa_prelaunch_2026` Demo group exists.

This is the known-good database baseline before interactive checkout testing.

## Authentication smoke-test result

On July 20, 2026, the committed authentication smoke test was executed locally against the connected RaiseHub Supabase project:

```text
scripts/qa-auth-smoke.ts
```

The script used the private QA credentials CSV stored outside the repository.

Initial result:

```text
11 QA logins failed
Database error querying schema
```

Supabase Auth logs identified the exact cause:

```text
confirmation_token was NULL
```

The temporary QA users had been inserted directly into `auth.users`, and four Auth string fields were `NULL` rather than empty strings.

Only the `qa_prelaunch_2026` batch was normalized:

- `confirmation_token`
- `recovery_token`
- `email_change_token_new`
- `email_change`

After normalization, the same authentication smoke test was rerun.

Final result:

```text
11 of 11 QA logins passed
All QA logins and authenticated profile checks passed.
```

The successful run verified:

- Real email/password authentication through Supabase Auth
- Authenticated email identity
- `qa_prelaunch_2026` auth metadata
- Authenticated profile access
- Correct Customer, Business, Organization, Admin, and Owner roles
- Correct Production and Demo classification
- Correct Demo group
- Correct complete and incomplete onboarding states
- Correct active-entitlement counts for customer scenarios
- Successful sign-out after each account

This confirms the QA accounts are login-capable and ready for role-routing and interactive checkout testing.

Visual role routing, checkout interaction, and the deployed customer experience remain to be executed and recorded separately.
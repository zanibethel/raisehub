# RaiseHub QA Role-Routing Verification

## Purpose

Use the temporary `qa_prelaunch_2026` accounts to verify the deployed RaiseHub login and routing experience for every supported role and setup state.

This checklist verifies browser behavior that the authentication smoke test cannot prove by itself.

## Safety

- Use only the QA accounts listed below.
- Keep passwords in the private credentials file outside the repository.
- Do not change real Production customer, business, organization, campaign, or pricing data.
- Sign out fully between accounts.
- Stop and record the result if an account reaches another role's workspace.
- Do not remove the QA users until all required testing is complete.

## Test environment

| Item | Value |
|---|---|
| Deployed application | `https://raisehub.vercel.app` |
| QA batch | `qa_prelaunch_2026` |
| Deployment SHA | |
| Browser/device | |
| Tester | |
| Test date | |

## Pass criteria

A test passes only when:

- Login succeeds.
- The user reaches the correct role experience.
- Completed users reach their usable workspace.
- Incomplete users are guided into onboarding rather than a completed workspace.
- Demo users remain visibly and functionally separated from Production.
- The user cannot reach another role's restricted workspace.
- Sign-out clears the active session.

## Test procedure

For each account:

1. Open a private/incognito browser window.
2. Go to `https://raisehub.vercel.app`.
3. Sign in using the private credentials file.
4. Record the first URL shown after login.
5. Record the visible workspace title or primary heading.
6. Confirm the account sees the expected role experience.
7. Attempt to open `/dashboard`.
8. Confirm the dashboard remains appropriate for that role and setup state.
9. Confirm the account cannot access an unrelated role's protected tools through visible navigation.
10. Sign out.
11. Confirm the signed-out user cannot return to the protected workspace with the browser Back button.

## Customer routing

### Clean Production customer

Account:

```text
qa.clean.customer@raisehubtesting.com
```

Expected:

- Login succeeds.
- Customer experience loads.
- No active-pass state is shown.
- The account can reach the Production campaign purchase flow.
- No Demo label or Demo group appears.

| Check | Result |
|---|---|
| First URL after login | |
| Workspace heading | |
| Customer dashboard shown | |
| No active pass shown | |
| Production experience only | |
| Sign-out clears access | |
| Final result | |

### Active-pass Production customer

Account:

```text
qa.active.customer@raisehubtesting.com
```

Expected:

- Login succeeds.
- Customer experience loads.
- Existing pass access is shown.
- Purchase prompts do not incorrectly require a second pass.
- Donation-only behavior is available where supported.
- No Demo label or Demo group appears.

| Check | Result |
|---|---|
| First URL after login | |
| Workspace heading | |
| Active pass shown | |
| No duplicate-pass prompt | |
| Production experience only | |
| Sign-out clears access | |
| Final result | |

### Incomplete Production customer

Account:

```text
qa.incomplete.customer@raisehubtesting.com
```

Expected:

- Login succeeds.
- The user is guided into customer onboarding.
- The completed customer workspace is not presented as ready.
- The next required action is clear.

| Check | Result |
|---|---|
| First URL after login | |
| Onboarding heading | |
| Required next action | |
| Completed workspace blocked | |
| Sign-out clears access | |
| Final result | |

### Clean Demo customer

Account:

```text
qa.demo.clean.customer@raisehubtesting.com
```

Expected:

- Login succeeds.
- Demo customer experience loads.
- Demo context is visible.
- No active pass is shown.
- Production-only data is not exposed.
- The account remains in Demo group `qa_prelaunch_2026`.

| Check | Result |
|---|---|
| First URL after login | |
| Workspace heading | |
| Demo context visible | |
| No active pass shown | |
| No Production data exposed | |
| Sign-out clears access | |
| Final result | |

### Active-pass Demo customer

Account:

```text
qa.demo.active.customer@raisehubtesting.com
```

Expected:

- Login succeeds.
- Demo customer experience loads.
- Existing Demo pass access is shown.
- Production-only data is not exposed.
- The account remains in Demo group `qa_prelaunch_2026`.

| Check | Result |
|---|---|
| First URL after login | |
| Workspace heading | |
| Demo context visible | |
| Active Demo pass shown | |
| No Production data exposed | |
| Sign-out clears access | |
| Final result | |

## Business routing

### Complete Business user

Account:

```text
qa.complete.business@raisehubtesting.com
```

Expected:

- Login succeeds.
- Business workspace loads.
- The linked QA business is available.
- The active QA offer is visible.
- Organization, Admin, and Owner tools are not exposed.

| Check | Result |
|---|---|
| First URL after login | |
| Workspace heading | |
| Linked business visible | |
| QA offer visible | |
| Unrelated role tools blocked | |
| Sign-out clears access | |
| Final result | |

### Incomplete Business user

Account:

```text
qa.incomplete.business@raisehubtesting.com
```

Expected:

- Login succeeds.
- Business onboarding is shown.
- The complete Business workspace is not presented as ready.
- The next required setup action is clear.

| Check | Result |
|---|---|
| First URL after login | |
| Onboarding heading | |
| Required next action | |
| Completed workspace blocked | |
| Sign-out clears access | |
| Final result | |

## Organization routing

### Complete Organization user

Account:

```text
qa.complete.organization@raisehubtesting.com
```

Expected:

- Login succeeds.
- Organization workspace loads.
- The linked QA organization is available.
- The active QA campaign is visible.
- Business, Admin, and Owner tools are not exposed.

| Check | Result |
|---|---|
| First URL after login | |
| Workspace heading | |
| Linked organization visible | |
| QA campaign visible | |
| Unrelated role tools blocked | |
| Sign-out clears access | |
| Final result | |

### Incomplete Organization user

Account:

```text
qa.incomplete.organization@raisehubtesting.com
```

Expected:

- Login succeeds.
- Organization onboarding is shown.
- The complete Organization workspace is not presented as ready.
- The next required setup action is clear.

| Check | Result |
|---|---|
| First URL after login | |
| Onboarding heading | |
| Required next action | |
| Completed workspace blocked | |
| Sign-out clears access | |
| Final result | |

## Admin routing

Account:

```text
qa.admin@raisehubtesting.com
```

Expected:

- Login succeeds.
- Admin-authorized experience loads.
- Admin functionality is available only to the Admin and Owner roles where intended.
- Customer, Business, and Organization views do not replace the Admin experience.
- Owner-only controls remain blocked unless explicitly shared with Admin.

| Check | Result |
|---|---|
| First URL after login | |
| Workspace heading | |
| Admin tools visible | |
| Owner-only controls blocked | |
| Sign-out clears access | |
| Final result | |

## Owner routing

Account:

```text
qa.owner@raisehubtesting.com
```

Expected:

- Login succeeds.
- Owner Console loads.
- Owner-only navigation and controls are visible.
- Demo Center, Support Center, platform management, analytics, or their current implemented equivalents are reachable.
- The Owner experience is not replaced by a lower-role dashboard.

| Check | Result |
|---|---|
| First URL after login | |
| Workspace heading | |
| Owner Console shown | |
| Owner-only controls visible | |
| Lower-role dashboard not substituted | |
| Sign-out clears access | |
| Final result | |

## Cross-role access checks

While signed into each complete account, record whether these protected areas are correctly allowed or denied.

Use only routes that currently exist in the deployed application. Record `not implemented` rather than failing a test for a route that does not exist yet.

| Signed-in role | Customer area | Business area | Organization area | Admin area | Owner area |
|---|---|---|---|---|---|
| Customer | Expected | Denied | Denied | Denied | Denied |
| Business | Denied | Expected | Denied | Denied | Denied |
| Organization | Denied | Denied | Expected | Denied | Denied |
| Admin | As designed | As designed | As designed | Expected | Denied unless shared |
| Owner | As designed | As designed | As designed | As designed | Expected |

## Failure categories

Use one of these labels when a test does not pass:

- `LOGIN_FAILURE`
- `WRONG_ROLE_ROUTE`
- `ONBOARDING_BYPASS`
- `DEMO_PRODUCTION_LEAK`
- `UNAUTHORIZED_WORKSPACE_ACCESS`
- `MISSING_LINKED_ENTITY`
- `MISSING_TEST_RESOURCE`
- `SIGN_OUT_FAILURE`
- `BROKEN_OR_BLANK_PAGE`
- `UNCLEAR_NEXT_ACTION`
- `NOT_IMPLEMENTED`

## Final result

| Area | Result |
|---|---|
| Customer routing | |
| Business routing | |
| Organization routing | |
| Admin routing | |
| Owner routing | |
| Incomplete onboarding | |
| Demo separation | |
| Cross-role access | |
| Sign-out behavior | |
| Overall decision | |

Role-routing verification is complete only when all implemented required paths pass or have a documented blocker with a follow-up commit.
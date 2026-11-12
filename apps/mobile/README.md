# RaiseHub mobile

Phase 1 developer preview — one app, multiple workspaces.

This Expo app shares the existing RaiseHub Supabase Auth account and uses the verified workspace list from the existing backend. Customers, sellers, business members, organization members, and owners switch workspaces inside one application.

## Local setup

1. Install Node 22.13+.
2. Run cd apps/mobile and npm install.
3. Run npx expo install --check and npm run typecheck.
4. Copy .env.example to .env. Fill in the public Supabase URL and anon key, and set EXPO_PUBLIC_RAISEHUB_BASE_URL to the HTTPS Preview or staging URL running the matching mobile API.
5. Run npm start and test on a supported Expo Go or development build.

Expo SDK 58 may require a development build depending on the version of Expo Go installed on the device.

Never use Supabase service-role keys, payment keys or other secrets in EXPO_PUBLIC variables. They are embedded in the client.

## Test flows

- Sign in with an existing verified RaiseHub email/password account.
- Confirm only that account’s current authorized workspaces appear.
- Switch among customer, seller, organization, business and owner experiences without signing out.
- Sign out, restart the app, and sign in again.
- Revoke a membership and reload; an unavailable workspace must disappear.

The first-version screens show next-phase feature labels but are not yet operational for purchases, offers, redemption, analytics or owner actions.

## Read-only API

GET /api/mobile/v1/workspaces with Authorization: Bearer <verified Supabase JWT> returns account identity and authorized workspace navigation context. Missing/invalid token returns 401; lookup failures return 503. All responses are non-cacheable.

See docs/MOBILE_UNIFIED_APP.md for the architecture and testing checklist.

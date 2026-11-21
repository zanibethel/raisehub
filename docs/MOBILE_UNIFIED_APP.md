# RaiseHub unified mobile app — Phase 1

Status: feature-branch developer preview. Not released.

## Product contract

One RaiseHub app for iOS and Android; one Supabase Auth identity per person. The app shows Customer, Fundraising/Seller, Organization, Business, and Owner experiences based on the current user’s memberships and capabilities.

The customer experience exists for every authenticated person, while paid customer benefits continue to be guarded by entitlement rules. A seller’s participation is tied to a campaign; a business or organization can have multiple active members; owner permissions are verified.

Workspace selection is UI context only. It never authorizes an API request. Every future data mutation must reauthenticate the actor and verify access to the specific resource on the server.

## Architecture

- Existing Next.js RaiseHub website remains the authority for payments, data writes, authorization and audit history.
- apps/mobile is the dedicated Expo / React Native app and shares the existing Supabase Auth identity. Do not create a second role/account system.
- GET /api/mobile/v1/workspaces accepts a Supabase JWT, verifies it with Supabase Auth, reads through Supabase RLS under that JWT, and returns only navigation presentation fields.
- The mobile read adapter reuses the canonical capability summary rules and authenticated-workspace builder already used by the web.
- Current data environment controls are applied to the native read adapter. No database schema changes or production writes are included.

## Initial branch deliverables

- iOS/Android Expo scaffold.
- Email/password sign-in, secure session persistence, sign-out.
- Read-only native workspace list and experience switching.
- Canonical mobile workspace transport, selection fallback and focused tests.
- Read-only bearer-token endpoint using existing account and permissions.

The native experience tiles are placeholders, not completed feature screens. The app is not store-ready.

## What comes next

1. Run website checks and native installation/type checks; add a reviewed mobile lockfile.
2. Test real accounts, invalid tokens, active/suspended memberships, owner access and demo isolation in isolated Preview / staging.
3. Implement native customer discovery, My Pass, saved offers and redemptions using existing protected server actions/APIs.
4. Build business, organization and fundraising native screens in the same app and with the same permissions.
5. Add notifications, scanning and offline pass/wallet functionality.
6. Validate authentication, privacy, accessibility, platform payment rules, signing, TestFlight and Play internal testing.

## Release gates

Before merging: npm ci, npm test, lint, TypeScript and production build on the web; npm install, Expo dependency verification and typecheck in apps/mobile; preview authentication and RLS regression tests. Block any production deployment or app store submission until approved and verified.

No Apple/Google sign-in callback, payment flow, QR camera, push notifications, offline storage of passes or production release are claimed complete by this foundation PR.

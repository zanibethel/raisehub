# Rate limiting

RaiseHub rate limits security-sensitive mutations with shared Supabase state rather than process memory so enforcement remains consistent across serverless instances.

## Checkout

Campaign checkout attempts are limited at the database boundary before a Stripe Checkout Session is created. The initial policy allows five checkout-attempt inserts per authenticated buyer and data environment in a fixed 60-second window.

## Offer redemptions

Customer redemption inserts are also limited at the database boundary. The trigger verifies the authenticated user matches the redemption user, derives Demo/Live classification from the authoritative offer, and allows five redemption attempts per user and environment in a fixed 60-second window. Trusted service-role maintenance writes bypass the customer bucket.

## Gift passes

Gift-pass creation is limited to five inserts per purchaser and data environment in a fixed 60-second window. The trigger derives environment classification from the authoritative campaign rather than trusting caller-supplied `is_demo` or `demo_group` values.

Gift claiming is not yet implemented in the current application. When a claim mutation is introduced, it must reuse this shared limiter before entitlement creation or transfer.

## Shared security boundary

The bucket table is protected by RLS and direct access is revoked from `PUBLIC`, `anon`, and `authenticated`. Only service-role server/database code can consume the shared limiter RPC.

Raw authenticated user IDs are not stored in the rate-limit bucket table. Application helpers use SHA-256 subject hashes; database triggers use deterministic hashes of the environment scope and user identity.

Financial and entitlement-changing mutations should fail closed when rate-limit state cannot be confirmed.

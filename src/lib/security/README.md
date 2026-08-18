# Rate limiting

RaiseHub rate limits security-sensitive mutations with shared Supabase state rather than process memory so enforcement remains consistent across serverless instances.

## Checkout

Campaign checkout attempts are limited at the database boundary before a Stripe Checkout Session is created. The initial policy allows five checkout-attempt inserts per authenticated buyer and data environment in a fixed 60-second window.

## Offer redemptions

Customer redemption inserts are also limited at the database boundary. The trigger verifies the authenticated user matches the redemption user, derives Demo/Live classification from the authoritative offer, and allows five redemption attempts per user and environment in a fixed 60-second window. Trusted service-role maintenance writes bypass the customer bucket.

## Gift passes

Gift-pass creation is limited to five inserts per purchaser and data environment in a fixed 60-second window. The trigger derives environment classification from the authoritative campaign rather than trusting caller-supplied `is_demo` or `demo_group` values.

Gift claiming is not yet implemented in the current application. When a claim mutation is introduced, it must reuse this shared limiter before entitlement creation or transfer.

## Password recovery

Password-reset requests are routed through a RaiseHub server endpoint before calling Supabase Auth. RaiseHub permits three attempts per email/IP-derived subject in a fixed 15-minute window and returns HTTP `429` with `Retry-After` when blocked. The public response is deliberately generic so recovery does not reveal whether an email belongs to an account.

Supabase Auth keeps its own upstream password-reset and email-send limits as a second layer.

## Support requests

Support submissions are limited to five requests per 15 minutes. Signed-in users are keyed by user identity; signed-out requests use a hashed subject derived from the normalized email and available client-IP headers. Demo and Live support buckets remain separate.

## Shared security boundary

The bucket table is protected by RLS and direct access is revoked from `PUBLIC`, `anon`, and `authenticated`. Only service-role server/database code can consume the shared limiter RPC.

Raw authenticated user IDs, email addresses, and IP addresses are not stored in the rate-limit bucket table. Application helpers hash rate-limit subjects before persistence; database triggers use deterministic hashes of the environment scope and user identity.

Financial, entitlement-changing, authentication-sensitive, and public-write mutations should fail closed when rate-limit state cannot be confirmed.

# Rate limiting

RaiseHub rate limits security-sensitive mutations with shared Supabase state rather than process memory so enforcement remains consistent across serverless instances.

## Checkout

Campaign checkout attempts are limited at the database boundary before a Stripe Checkout Session is created. The initial policy allows five checkout-attempt inserts per authenticated buyer and data environment in a fixed 60-second window.

The bucket table is protected by RLS and direct access is revoked from `PUBLIC`, `anon`, and `authenticated`. Only service-role server code can consume the shared limiter RPC.

Raw authenticated user IDs are not stored in the rate-limit bucket table. Application helpers use SHA-256 subject hashes; the database checkout trigger uses a deterministic hash of the environment scope and authenticated user ID.

Financial mutations should fail closed when rate-limit state cannot be confirmed.

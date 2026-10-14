# Stripe webhook stuck-claim recovery (manual, fail-closed)

**Status:** operator runbook. No automatic replay or reset of expired claims.

## Detect and triage

Read-only query (service operator only):

```sql
select stripe_event_id, event_type, livemode, processing_status,
       attempt_count, created_at, updated_at, claim_expires_at,
       (claim_expires_at < now()) as lease_expired,
       left(last_error, 160) as error_summary
from public.stripe_webhook_events
where processing_status in ('processing', 'failed')
order by updated_at asc;
```

Do not copy event payloads, payment details, or customer identifiers into public issues or logs.

## Before authorizing any recovery

1. Verify the worker is no longer running, including any deployment or queue consumers. An expired lease **does not** prove the worker stopped.
2. Inspect Stripe's dashboard for the exact event and session/payment intent; verify test/live mode.
3. Correlate the stored checkout attempt with its purchase, entitlement, gift pass, and any payment reconciliation side effects. The fulfillment RPC locks the checkout attempt and checks its purchase ID, but other event handlers must be evaluated separately.
4. Check whether the side effect already completed even if event status remains `processing`. If it did, do not replay; reconcile status with a separately reviewed procedure.
5. Record the event ID, incident reference, actor, timestamp, observed Stripe status, existing side effects, and approval in the private incident log.

## Recovery decision

- **Worker possibly still active, unknown side effects, or conflicting evidence:** quarantine. Do not change status or replay.
- **Effect already applied:** do not replay. Escalate for audited status reconciliation.
- **Worker definitively stopped and no effect applied:** obtain a second review of the event-specific handler, then plan an explicitly approved, idempotent retry.
- **Malformed or historical test events:** investigate separately; never bulk-replay.

No general-purpose SQL command to reset `processing` to `failed` is provided intentionally. The claim function permits retries of `failed` events, so a blind reset could create financial side effects.

## Verification gates

- Test two overlapping deliveries through the deployed signed webhook endpoint.
- Test worker interruption before and after fulfillment and verify exactly one purchase/entitlement.
- Test expiry while the first worker is still running: the second delivery must remain busy.
- Test Stripe test-mode checkout, asynchronous failure, refund, and duplicate delivery.
- Verify cross-account access boundaries and audit/alert delivery.
- Keep launch gate closed until these pass.

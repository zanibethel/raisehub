import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'

type OperationalQueryError = {
  message: string
}

export type WebhookFailure = {
  stripeEventId: string
  eventType: string
  livemode: boolean
  attemptCount: number
  lastError: string | null
  updatedAt: string
}

export type PayoutFailure = {
  id: string
  organizationId: string
  stripePayoutId: string | null
  status: string
  livemode: boolean
  failureCode: string | null
  failureMessage: string | null
  updatedAt: string
}

export type RateLimitPressure = {
  scope: string
  requestCount: number
  updatedAt: string
}

export type OwnerOperationalHealth = {
  generatedAt: string
  failedWebhooks24h: number
  staleProcessingWebhooks: number
  failedCheckouts24h: number
  failedPayouts24h: number
  recentWebhookFailures: WebhookFailure[]
  recentPayoutFailures: PayoutFailure[]
  rateLimitPressure: RateLimitPressure[]
  errors: string[]
}

function messageOf(error: OperationalQueryError | null | undefined) {
  return error?.message?.trim() || null
}

export async function getOwnerOperationalHealth(
  now = new Date()
): Promise<OwnerOperationalHealth> {
  const admin = createAdminClient() as any
  const since24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
  const staleBefore = new Date(now.getTime() - 5 * 60 * 1000).toISOString()
  const recentRateWindow = new Date(now.getTime() - 15 * 60 * 1000).toISOString()

  const [
    failedWebhookCountResult,
    staleWebhookCountResult,
    failedCheckoutCountResult,
    failedPayoutCountResult,
    webhookFailureResult,
    payoutFailureResult,
    ratePressureResult,
  ] = await Promise.all([
    admin
      .from('stripe_webhook_events')
      .select('id', { count: 'exact', head: true })
      .eq('processing_status', 'failed')
      .gte('updated_at', since24h),
    admin
      .from('stripe_webhook_events')
      .select('id', { count: 'exact', head: true })
      .eq('processing_status', 'processing')
      .lt('updated_at', staleBefore),
    admin
      .from('checkout_attempts')
      .select('id', { count: 'exact', head: true })
      .eq('is_demo', false)
      .eq('status', 'failed')
      .gte('updated_at', since24h),
    admin
      .from('organization_payout_events')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'failed')
      .gte('updated_at', since24h),
    admin
      .from('stripe_webhook_events')
      .select(
        'stripe_event_id, event_type, livemode, attempt_count, last_error, updated_at'
      )
      .eq('processing_status', 'failed')
      .order('updated_at', { ascending: false })
      .limit(12),
    admin
      .from('organization_payout_events')
      .select(
        'id, organization_id, stripe_payout_id, status, livemode, failure_code, failure_message, updated_at'
      )
      .eq('status', 'failed')
      .order('updated_at', { ascending: false })
      .limit(12),
    admin
      .from('rate_limit_buckets')
      .select('scope, request_count, updated_at')
      .gte('updated_at', recentRateWindow)
      .order('request_count', { ascending: false })
      .limit(12),
  ])

  const errors = [
    messageOf(failedWebhookCountResult.error),
    messageOf(staleWebhookCountResult.error),
    messageOf(failedCheckoutCountResult.error),
    messageOf(failedPayoutCountResult.error),
    messageOf(webhookFailureResult.error),
    messageOf(payoutFailureResult.error),
    messageOf(ratePressureResult.error),
  ].filter((message): message is string => Boolean(message))

  return {
    generatedAt: now.toISOString(),
    failedWebhooks24h: Number(failedWebhookCountResult.count ?? 0),
    staleProcessingWebhooks: Number(staleWebhookCountResult.count ?? 0),
    failedCheckouts24h: Number(failedCheckoutCountResult.count ?? 0),
    failedPayouts24h: Number(failedPayoutCountResult.count ?? 0),
    recentWebhookFailures: (webhookFailureResult.data ?? []).map((row: any) => ({
      stripeEventId: String(row.stripe_event_id),
      eventType: String(row.event_type),
      livemode: Boolean(row.livemode),
      attemptCount: Number(row.attempt_count ?? 0),
      lastError: row.last_error ? String(row.last_error) : null,
      updatedAt: String(row.updated_at),
    })),
    recentPayoutFailures: (payoutFailureResult.data ?? []).map((row: any) => ({
      id: String(row.id),
      organizationId: String(row.organization_id),
      stripePayoutId: row.stripe_payout_id ? String(row.stripe_payout_id) : null,
      status: String(row.status),
      livemode: Boolean(row.livemode),
      failureCode: row.failure_code ? String(row.failure_code) : null,
      failureMessage: row.failure_message ? String(row.failure_message) : null,
      updatedAt: String(row.updated_at),
    })),
    rateLimitPressure: (ratePressureResult.data ?? []).map((row: any) => ({
      scope: String(row.scope),
      requestCount: Number(row.request_count ?? 0),
      updatedAt: String(row.updated_at),
    })),
    errors,
  }
}

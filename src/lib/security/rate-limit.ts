'use server'

import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'
import {
  hashRateLimitSubject,
  normalizeRateLimitDecision,
  type RateLimitDecision,
} from './rate-limit-core'

type RateLimitRpcRow = {
  allowed: boolean
  remaining: number
  retry_after_seconds: number
}

type UntypedAdminClient = {
  rpc(
    fn: string,
    args: Record<string, unknown>
  ): Promise<{ data: RateLimitRpcRow[] | null; error: { message: string } | null }>
}

export async function consumeRateLimit(input: {
  scope: string
  subject: string
  limit: number
  windowSeconds: number
}): Promise<RateLimitDecision> {
  const admin = createAdminClient() as unknown as UntypedAdminClient
  const subjectHash = hashRateLimitSubject(input.subject)

  const { data, error } = await admin.rpc('consume_rate_limit', {
    p_scope: input.scope,
    p_subject_hash: subjectHash,
    p_limit: input.limit,
    p_window_seconds: input.windowSeconds,
  })

  if (error || !data?.[0]) {
    throw new Error(error?.message || 'Rate limit state could not be confirmed')
  }

  return normalizeRateLimitDecision(data[0])
}

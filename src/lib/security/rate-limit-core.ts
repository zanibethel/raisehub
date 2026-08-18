import { createHash } from 'node:crypto'

export type RateLimitDecision = {
  allowed: boolean
  remaining: number
  retryAfterSeconds: number
}

export function hashRateLimitSubject(subject: string) {
  return createHash('sha256').update(subject).digest('hex')
}

export function normalizeRateLimitDecision(input: {
  allowed: unknown
  remaining: unknown
  retry_after_seconds: unknown
}): RateLimitDecision {
  return {
    allowed: input.allowed === true,
    remaining: Math.max(0, Number(input.remaining) || 0),
    retryAfterSeconds: Math.max(0, Number(input.retry_after_seconds) || 0),
  }
}

import assert from 'node:assert/strict'
import test from 'node:test'

import {
  hashRateLimitSubject,
  normalizeRateLimitDecision,
} from './rate-limit-core'

test('rate limit subjects are stored as deterministic hashes', () => {
  const first = hashRateLimitSubject('user:123')
  const second = hashRateLimitSubject('user:123')
  const other = hashRateLimitSubject('user:456')

  assert.equal(first, second)
  assert.notEqual(first, other)
  assert.match(first, /^[a-f0-9]{64}$/)
  assert.ok(!first.includes('user:123'))
})

test('rate limit decisions fail closed unless allowed is explicitly true', () => {
  assert.deepEqual(
    normalizeRateLimitDecision({
      allowed: false,
      remaining: -3,
      retry_after_seconds: 12,
    }),
    {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: 12,
    }
  )

  assert.deepEqual(
    normalizeRateLimitDecision({
      allowed: 'true',
      remaining: 4,
      retry_after_seconds: 0,
    }),
    {
      allowed: false,
      remaining: 4,
      retryAfterSeconds: 0,
    }
  )
})

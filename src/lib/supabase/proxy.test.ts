import assert from 'node:assert/strict'
import test from 'node:test'

import {
  isRecoverableSessionError,
  isSupabaseAuthCookie,
} from './proxy'

test('recognizes Supabase auth cookies including chunked cookies', () => {
  assert.equal(isSupabaseAuthCookie('sb-project-auth-token'), true)
  assert.equal(isSupabaseAuthCookie('sb-project-auth-token.0'), true)
  assert.equal(isSupabaseAuthCookie('raisehub-selected-workspace'), false)
  assert.equal(isSupabaseAuthCookie('sb-project-other-cookie'), false)
})

test('recognizes stale refresh-token failures that should become signed-out state', () => {
  assert.equal(
    isRecoverableSessionError({
      code: 'refresh_token_not_found',
      message: 'Invalid Refresh Token: Refresh Token Not Found',
      status: 400,
    }),
    true
  )

  assert.equal(
    isRecoverableSessionError({
      code: 'invalid_refresh_token',
      message: 'Invalid refresh token',
      status: 400,
    }),
    true
  )
})

test('does not hide unrelated auth or infrastructure failures', () => {
  assert.equal(
    isRecoverableSessionError({
      code: 'unexpected_failure',
      message: 'Auth service unavailable',
      status: 503,
    }),
    false
  )
  assert.equal(isRecoverableSessionError(new Error('Network failed')), false)
})

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'

const passwordResetRoute = readFileSync(
  join(process.cwd(), 'src/app/api/auth/password-reset/route.ts'),
  'utf8'
)

const forgotPasswordPage = readFileSync(
  join(process.cwd(), 'src/app/forgot-password/page.tsx'),
  'utf8'
)

const supportRoute = readFileSync(
  join(process.cwd(), 'src/app/api/support/requests/route.ts'),
  'utf8'
)

test('password recovery is routed through the protected server endpoint', () => {
  assert.ok(passwordResetRoute.includes("scope: 'auth:password_reset'"))
  assert.ok(passwordResetRoute.includes('limit: 3'))
  assert.ok(passwordResetRoute.includes('windowSeconds: 15 * 60'))
  assert.ok(passwordResetRoute.includes('status: 429'))
  assert.ok(passwordResetRoute.includes("'Retry-After'"))
  assert.ok(passwordResetRoute.includes('resetPasswordForEmail'))
  assert.ok(passwordResetRoute.includes('If an account matches that email'))
  assert.ok(forgotPasswordPage.includes("fetch('/api/auth/password-reset'"))
  assert.ok(!forgotPasswordPage.includes('resetPasswordForEmail'))
})

test('public support requests share the server-side abuse limiter', () => {
  assert.ok(supportRoute.includes("'support_request:create:demo'"))
  assert.ok(supportRoute.includes("'support_request:create:live'"))
  assert.ok(supportRoute.includes('limit: 5'))
  assert.ok(supportRoute.includes('windowSeconds: 15 * 60'))
  assert.ok(supportRoute.includes('status: 429'))
  assert.ok(supportRoute.includes("'Retry-After'"))
  assert.ok(supportRoute.includes('buildPublicRateLimitSubject'))
})

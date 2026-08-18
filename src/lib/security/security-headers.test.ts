import assert from 'node:assert/strict'
import test from 'node:test'

import nextConfig from '../../../next.config'

test('applies the launch security headers to every route', async () => {
  assert.equal(typeof nextConfig.headers, 'function')

  const rules = await nextConfig.headers!()
  const catchAll = rules.find((rule) => rule.source === '/:path*')

  assert.ok(catchAll, 'expected a catch-all security header rule')

  const headers = new Map(
    catchAll.headers.map((header) => [header.key, header.value])
  )

  assert.equal(headers.get('X-Content-Type-Options'), 'nosniff')
  assert.equal(headers.get('X-Frame-Options'), 'DENY')
  assert.equal(headers.get('Referrer-Policy'), 'strict-origin-when-cross-origin')
  assert.match(
    headers.get('Strict-Transport-Security') ?? '',
    /max-age=31536000/
  )

  const csp = headers.get('Content-Security-Policy') ?? ''
  assert.match(csp, /default-src 'self'/)
  assert.match(csp, /object-src 'none'/)
  assert.match(csp, /frame-ancestors 'none'/)
  assert.match(csp, /base-uri 'self'/)
  assert.match(csp, /https:\/\/\*\.supabase\.co/)
  assert.match(csp, /https:\/\/checkout\.stripe\.com/)
  assert.match(csp, /upgrade-insecure-requests/)
})

test('disables sensitive browser capabilities by default', async () => {
  assert.equal(typeof nextConfig.headers, 'function')

  const rules = await nextConfig.headers!()
  const catchAll = rules.find((rule) => rule.source === '/:path*')
  assert.ok(catchAll)

  const permissions = catchAll.headers.find(
    (header) => header.key === 'Permissions-Policy'
  )?.value

  assert.match(permissions ?? '', /camera=\(\)/)
  assert.match(permissions ?? '', /microphone=\(\)/)
  assert.match(permissions ?? '', /geolocation=\(\)/)
})

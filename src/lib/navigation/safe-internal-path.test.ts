import assert from 'node:assert/strict'
import test from 'node:test'

import { getSafeInternalPath } from './safe-internal-path'

test('allows same-origin application paths', () => {
  assert.equal(getSafeInternalPath('/dashboard'), '/dashboard')
  assert.equal(
    getSafeInternalPath('/onboarding/business?step=2#profile'),
    '/onboarding/business?step=2#profile'
  )
})

test('rejects external and protocol-relative destinations', () => {
  assert.equal(getSafeInternalPath('https://example.com'), '/dashboard')
  assert.equal(getSafeInternalPath('//example.com'), '/dashboard')
  assert.equal(getSafeInternalPath('/\\example.com'), '/dashboard')
  assert.equal(getSafeInternalPath('dashboard'), '/dashboard')
})

test('uses the requested fallback for invalid or missing destinations', () => {
  assert.equal(getSafeInternalPath(null, '/signup/business'), '/signup/business')
  assert.equal(
    getSafeInternalPath('https://example.com', '/signup/business'),
    '/signup/business'
  )
})

import assert from 'node:assert/strict'
import test from 'node:test'

import { buildProductionUrl, normalizeSiteUrl } from './production-url'

test('normalizes production origins and trailing slashes', () => {
  assert.equal(normalizeSiteUrl('raisehub.app/'), 'https://raisehub.app')
  assert.equal(normalizeSiteUrl('https://raisehub.app///'), 'https://raisehub.app')
  assert.equal(normalizeSiteUrl('http://localhost:3000/'), 'http://localhost:3000')
})

test('builds Go Live URLs on the production origin', () => {
  process.env.NEXT_PUBLIC_PRODUCTION_SITE_URL = 'https://raisehub.app/'
  assert.equal(
    buildProductionUrl('/go-live', { live: '1', from: 'demo' }),
    'https://raisehub.app/go-live?live=1&from=demo'
  )
})

test('preserves campaign and role query parameters', () => {
  process.env.NEXT_PUBLIC_PRODUCTION_SITE_URL = 'https://raisehub.app'
  const params = new URLSearchParams({ campaign: 'lakeview', role: 'customer' })
  assert.equal(
    buildProductionUrl('/signup', params),
    'https://raisehub.app/signup?campaign=lakeview&role=customer'
  )
})

import assert from 'node:assert/strict'
import test from 'node:test'

import { buildBusinessSiteAppManifest } from './business-site-app-manifest'

test('builds a unique install identity and start URL for each business', () => {
  const manifest = buildBusinessSiteAppManifest({
    slug: 'elysian-hair-salon',
    siteTitle: 'Elysian Hair Salon',
    accentColor: '#123456',
    backgroundColor: '#fefefe',
    logoUrl: 'https://cdn.example.com/logo.png',
  })

  assert.equal(manifest.id, '/site/elysian-hair-salon')
  assert.equal(manifest.start_url, '/site/elysian-hair-salon?source=installed-app')
  assert.equal(manifest.name, 'Elysian Hair Salon')
  assert.equal(manifest.theme_color, '#123456')
  assert.equal(manifest.icons[0]?.src, 'https://cdn.example.com/logo.png')
})

test('uses safe visual fallbacks when optional app branding is missing or invalid', () => {
  const manifest = buildBusinessSiteAppManifest({
    slug: 'demo-business',
    siteTitle: 'A Business With A Name That Is Longer Than Twenty Four Characters',
    accentColor: 'blue',
    backgroundColor: null,
    logoUrl: '',
  })

  assert.equal(manifest.theme_color, '#2563eb')
  assert.equal(manifest.background_color, '#ffffff')
  assert.equal(manifest.icons[0]?.src, '/default-business-logo.png')
  assert.ok(manifest.short_name.length <= 24)
})

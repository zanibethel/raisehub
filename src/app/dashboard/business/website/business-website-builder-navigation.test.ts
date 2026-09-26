import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const commandCenterSource = readFileSync(
  new URL('../../../../components/dashboards/business/business-command-center.tsx', import.meta.url),
  'utf8'
)
const headerSource = readFileSync(
  new URL('../../../components/authenticated-workspace-header.tsx', import.meta.url),
  'utf8'
)
const builderSource = readFileSync(
  new URL('./page.tsx', import.meta.url),
  'utf8'
)

test('business dashboard exposes the Website & App Builder', () => {
  assert.match(commandCenterSource, /Website & App Builder/)
  assert.match(
    commandCenterSource,
    /\/dashboard\/business\/website\?business=/
  )
})

test('business workspace menu exposes the Website & App Builder only for business workspaces', () => {
  assert.match(headerSource, /selectedWorkspaceIsBusiness/)
  assert.match(headerSource, /Website &amp; App Builder/)
  assert.match(headerSource, /websiteBuilderHref/)
})

test('website builder honors an explicitly selected authorized business', () => {
  assert.match(
    builderSource,
    /new URLSearchParams\(window\.location\.search\)\.get\('business'\)/
  )
  assert.match(builderSource, /membershipQuery = membershipQuery\.eq/)
  assert.match(builderSource, /legacyBusinessQuery = legacyBusinessQuery\.eq/)
})

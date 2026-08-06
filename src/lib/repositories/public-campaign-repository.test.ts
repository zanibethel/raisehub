import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const repositorySource = readFileSync(
  new URL('./public-campaign-repository.ts', import.meta.url),
  'utf8'
)

const carouselSource = readFileSync(
  new URL('../../app/components/campaign-progress-carousel.tsx', import.meta.url),
  'utf8'
)

const campaignsPageSource = readFileSync(
  new URL('../../app/campaigns/page.tsx', import.meta.url),
  'utf8'
)

test('loads public campaign cards with strict sellable filters', () => {
  assert.ok(repositorySource.includes("import 'server-only'"))
  assert.ok(repositorySource.includes('createAdminClient()'))
  assert.ok(repositorySource.includes(".eq('status', 'active')"))
  assert.ok(repositorySource.includes('starts_at.is.null,starts_at.lte.'))
  assert.ok(repositorySource.includes('ends_at.is.null,ends_at.gt.'))
})

test('uses the public repository for homepage and fundraiser browsing', () => {
  assert.ok(carouselSource.includes('getPublicSellableCampaigns'))
  assert.ok(campaignsPageSource.includes('getPublicSellableCampaigns'))
})

test('scopes campaigns and both organization identity sources', () => {
  assert.ok(repositorySource.includes('applyEnvironmentScope(campaignQuery, environment)'))
  assert.ok(repositorySource.includes('applyEnvironmentScope(organizationQuery, environment)'))
  assert.ok(repositorySource.includes('applyEnvironmentScope(profileQuery, environment)'))
  assert.ok(repositorySource.includes('recordsShareEnvironment(campaign, parent'))
})

test('loads environment metadata needed to fail closed', () => {
  assert.ok(
    repositorySource.includes(
      "'id, legacy_profile_id, name, logo_url, is_demo, demo_group'"
    )
  )
  assert.ok(
    repositorySource.includes(
      "'id, display_name, business_name, logo_url, is_demo, demo_group'"
    )
  )
})

test('passes explicit environment expectations to public campaign progress RPCs', () => {
  assert.ok(repositorySource.includes('p_expected_environment_mode'))
  assert.ok(repositorySource.includes('p_expected_demo_group'))
  assert.ok(repositorySource.includes('toRpcEnvironmentExpectation(environment)'))
})

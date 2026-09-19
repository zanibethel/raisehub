import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const campaignRepositorySource = fs.readFileSync(
  path.join(process.cwd(), 'src/lib/repositories/campaign-repository.ts'),
  'utf8'
)

const campaignPageSource = fs.readFileSync(
  path.join(process.cwd(), 'src/app/campaigns/[id]/page.tsx'),
  'utf8'
)

const campaignProgressMigrationSource = fs.readFileSync(
  path.join(
    process.cwd(),
    'supabase/migrations/20260806221500_harden_public_campaign_rpcs_by_environment.sql'
  ),
  'utf8'
)

test('campaign recovery and progress RPCs include explicit environment expectations', () => {
  assert.match(campaignRepositorySource, /get_campaign_recovery_context/)
  assert.match(campaignRepositorySource, /get_public_campaign_progress/)
  assert.match(campaignRepositorySource, /toRpcEnvironmentExpectation/)
  assert.match(campaignRepositorySource, /getActiveDataEnvironment/)
})

test('campaign detail route preserves live mode while passing environment to referral and progress RPC access', () => {
  assert.match(campaignPageSource, /resolveDataEnvironment\('production'\)/)
  assert.match(
    campaignPageSource,
    /getCampaignById\(\s*id,\s*environment\s*\)/
  )
  assert.match(
    campaignPageSource,
    /resolveCampaignRecovery\(\s*id,\s*now,\s*environment\s*\)/
  )
  assert.match(campaignPageSource, /toRpcEnvironmentExpectation\(environment\)/)
  assert.match(
    campaignPageSource,
    /getPublicCampaignProgress\([\s\S]*\[campaign\.id\],[\s\S]*environment[\s\S]*\)/
  )
})


test('public campaign progress counts only explicit successful payment states', () => {
  const progressFunctionStart = campaignProgressMigrationSource.indexOf(
    'create or replace function public.get_public_campaign_progress'
  )
  const sellersFunctionStart = campaignProgressMigrationSource.indexOf(
    'create or replace function public.get_public_campaign_sellers'
  )

  assert.notEqual(progressFunctionStart, -1)
  assert.notEqual(sellersFunctionStart, -1)

  const progressFunction = campaignProgressMigrationSource.slice(
    progressFunctionStart,
    sellersFunctionStart
  )

  for (const status of [
    'test_paid',
    'paid',
    'succeeded',
    'completed',
    'captured',
    'settled',
  ]) {
    assert.match(progressFunction, new RegExp(`'${status}'`))
  }

  for (const status of [
    'pending',
    'failed',
    'refunded',
    'partially_refunded',
    'disputed',
  ]) {
    assert.doesNotMatch(progressFunction, new RegExp(`'${status}'`))
  }

  assert.match(
    progressFunction,
    /then coalesce\(cp\.organization_earnings, 0\)\s*else 0/
  )
})

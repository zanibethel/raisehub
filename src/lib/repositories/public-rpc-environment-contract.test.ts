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

test('campaign recovery and progress RPCs include explicit environment expectations', () => {
  assert.match(campaignRepositorySource, /get_campaign_recovery_context/)
  assert.match(campaignRepositorySource, /get_public_campaign_progress/)
  assert.match(campaignRepositorySource, /toRpcEnvironmentExpectation/)
  assert.match(campaignRepositorySource, /getActiveDataEnvironment/)
})

test('campaign detail route preserves live mode while passing environment to referral and progress RPC access', () => {
  assert.match(campaignPageSource, /resolveDataEnvironment\('production'\)/)
  assert.match(campaignPageSource, /toRpcEnvironmentExpectation\(environment\)/)
  assert.match(
    campaignPageSource,
    /getPublicCampaignProgress\([\s\S]*\[campaign\.id\],[\s\S]*environment[\s\S]*\)/
  )
})

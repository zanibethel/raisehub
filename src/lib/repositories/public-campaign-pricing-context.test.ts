import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const source = fs.readFileSync(
  path.join(process.cwd(), 'src/lib/repositories/public-campaign-repository.ts'),
  'utf8'
)

test('public campaign discovery loads complete environment metadata', () => {
  assert.match(
    source,
    /display_name, business_name, logo_url, is_demo, demo_group/
  )
})

test('public campaign pricing uses the validated campaign environment', () => {
  assert.match(source, /isDemo: campaign\.is_demo === true/)
  assert.match(source, /resolveEffectiveCampaignPricingBatch/)
  assert.match(source, /recordsShareEnvironment\(campaign, parent/)
})

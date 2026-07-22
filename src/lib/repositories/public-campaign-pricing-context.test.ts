import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import assert from 'node:assert/strict'

const source = fs.readFileSync(
  path.join(
    process.cwd(),
    'src/lib/repositories/public-campaign-repository.ts'
  ),
  'utf8'
)

test('public campaign discovery loads demo status with organization metadata', () => {
  assert.match(
    source,
    /display_name, business_name, logo_url, is_demo/
  )
})

test('public campaign pricing keeps production and demo rules separated', () => {
  assert.match(
    source,
    /isDemo: profile\?\.is_demo \?\? false/
  )
  assert.match(
    source,
    /resolveEffectiveCampaignPricingBatch/
  )
})

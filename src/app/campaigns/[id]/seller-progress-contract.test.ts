import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const campaignSource = readFileSync(
  new URL('./page.tsx', import.meta.url),
  'utf8'
)

const sellerDashboardSource = readFileSync(
  new URL('../../seller/dashboard/page.tsx', import.meta.url),
  'utf8'
)

const rosterActionsSource = readFileSync(
  new URL(
    '../../../components/dashboards/organization/organization-seller-roster-actions.ts',
    import.meta.url
  ),
  'utf8'
)

test('public seller progress uses the canonical payment eligibility rule', () => {
  assert.match(
    campaignSource,
    /isCampaignPurchaseProgressEligible\(purchase\.payment_status\)/
  )
  assert.match(
    campaignSource,
    /\.eq\('campaign_seller_id', managedSeller\.campaign_seller_id\)/
  )
  assert.match(campaignSource, /Seller progress/)
  assert.match(campaignSource, /Passes credited/)
  assert.match(campaignSource, /Helped raise/)
})

test('seller-facing totals use the same qualifying payment rule', () => {
  assert.match(
    sellerDashboardSource,
    /isCampaignPurchaseProgressEligible\(purchase\.payment_status\)/
  )
  assert.match(
    rosterActionsSource,
    /isCampaignPurchaseProgressEligible\(purchase\.payment_status\)/
  )
})

test('seller campaign page keeps gift-a-pass support available', () => {
  assert.match(campaignSource, /<GiftCampaignPassButton/)
  assert.match(campaignSource, /send one to someone else as a gift/)
})

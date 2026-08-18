import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import assert from 'node:assert/strict'

const dashboardSource = fs.readFileSync(
  path.join(process.cwd(), 'src/app/seller/dashboard/page.tsx'),
  'utf8'
)
const shareSource = fs.readFileSync(
  path.join(process.cwd(), 'src/app/seller/dashboard/share-seller-link.tsx'),
  'utf8'
)

test('seller campaign selection stays explicit and attributed', () => {
  assert.match(dashboardSource, /searchParams: Promise<\{ campaign\?: string \}>/)
  assert.match(dashboardSource, /selectedCampaignId/)
  assert.match(dashboardSource, /\/seller\/dashboard\?campaign=/)
  assert.match(dashboardSource, /seller_profile_id/)
})

test('seller next action stays focused on the attributed campaign link', () => {
  assert.match(dashboardSource, /What should I do next\?/)
  assert.match(dashboardSource, /Share your personal fundraiser link/)
  assert.match(dashboardSource, /\?seller=/)
})

test('seller QR can be downloaded without sending the seller URL to another service', () => {
  assert.match(shareSource, /QRCode\.toDataURL\(url/)
  assert.match(shareSource, /Download QR code/)
  assert.match(shareSource, /link\.download = `\$\{safeFileName\(campaignName\)\}-raisehub-qr\.png`/)
})

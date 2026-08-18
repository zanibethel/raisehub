import fs from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

const dashboardSource = fs.readFileSync(path.join(process.cwd(), 'src/app/seller/dashboard/page.tsx'), 'utf8')
const shareSource = fs.readFileSync(path.join(process.cwd(), 'src/app/seller/dashboard/share-seller-link.tsx'), 'utf8')

describe('seller dashboard launch polish', () => {
  it('keeps seller campaign selection explicit and attributed', () => {
    expect(dashboardSource).toContain("searchParams: Promise<{ campaign?: string }>")
    expect(dashboardSource).toContain("selectedCampaignId")
    expect(dashboardSource).toContain("/seller/dashboard?campaign=")
    expect(dashboardSource).toContain("seller_profile_id")
  })

  it('keeps the next action focused on sharing the attributed campaign link', () => {
    expect(dashboardSource).toContain('What should I do next?')
    expect(dashboardSource).toContain('Share your personal fundraiser link')
    expect(dashboardSource).toContain('?seller=')
  })

  it('supports a downloadable QR code without sending the seller URL to another service', () => {
    expect(shareSource).toContain("QRCode.toDataURL(url")
    expect(shareSource).toContain('Download QR code')
    expect(shareSource).toContain("link.download = `${safeFileName(campaignName)}-raisehub-qr.png`")
  })
})

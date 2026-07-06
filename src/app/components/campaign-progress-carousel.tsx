import { createClient } from '@/lib/supabase/server'
import CampaignProgressCarouselClient from './campaign-progress-carousel-client'
import { isDemoMode } from '@/lib/app-mode'

export const dynamic = 'force-dynamic'

type Campaign = {
  id: string
  name: string
  goal_amount: number | null
}

type Purchase = {
  campaign_id: string
  organization_earnings: number | null
}

// =========================================
// 🎭 DEMO SAMPLE CAMPAIGNS
// Shown only when app mode is demo AND the real
// Supabase query returns no active campaigns.
// Production behavior is unaffected — this data is
// never used unless isDemoMode() is true. Progress
// values are pre-computed realistically (not maxed
// out, not zero) to look like a genuine, in-progress
// fundraiser.
// =========================================
const DEMO_SAMPLE_CAMPAIGNS = [
  {
    id: 'demo-campaign-1',
    name: 'Lakeview Elementary Fall Fundraiser',
    goal: 5000,
    earnings: 3250,
    progress: 65,
  },
  {
    id: 'demo-campaign-2',
    name: 'Lakeview Youth Soccer Club — New Uniforms',
    goal: 3000,
    earnings: 1140,
    progress: 38,
  },
  {
    id: 'demo-campaign-3',
    name: 'Riverside Middle School Band Trip',
    goal: 8000,
    earnings: 7120,
    progress: 89,
  },
]

export default async function CampaignProgressCarousel() {
  const supabase = await createClient()

  // =========================================
  // 📦 FETCH ACTIVE CAMPAIGNS
  // =========================================
  const { data: campaigns } = await supabase
    .from('campaigns')
    .select('id, name, goal_amount')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(10)

  const hasRealCampaigns = !!campaigns && campaigns.length > 0

  // Demo fallback only applies when real data is empty AND
  // the app is running in demo mode. In production (the
  // default), this branch is never taken — behavior is
  // identical to before this change.
  if (!hasRealCampaigns && isDemoMode()) {
    return <CampaignProgressCarouselClient campaigns={DEMO_SAMPLE_CAMPAIGNS} />
  }

  if (!hasRealCampaigns) return null

  const campaignIds = campaigns.map((campaign) => campaign.id)

  // =========================================
  // 💰 FETCH PURCHASE TOTALS
  // =========================================
  const { data: purchases } = await supabase
    .from('campaign_purchases')
    .select('campaign_id, organization_earnings')
    .in('campaign_id', campaignIds)

  const earningsByCampaign = new Map<string, number>()

  for (const purchase of (purchases ?? []) as Purchase[]) {
    earningsByCampaign.set(
      purchase.campaign_id,
      (earningsByCampaign.get(purchase.campaign_id) ?? 0) +
        Number(purchase.organization_earnings ?? 0)
    )
  }

  const campaignCards = (campaigns as Campaign[]).map((campaign) => {
    const earnings = earningsByCampaign.get(campaign.id) ?? 0
    const goal = Number(campaign.goal_amount ?? 0)
    const progress = goal > 0 ? Math.min((earnings / goal) * 100, 100) : 0

    return {
      id: campaign.id,
      name: campaign.name,
      goal,
      earnings,
      progress,
    }
  })

  return <CampaignProgressCarouselClient campaigns={campaignCards} />
}
import { createClient } from '@/lib/supabase/server'
import CampaignProgressCarouselClient from './campaign-progress-carousel-client'

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

  if (!campaigns || campaigns.length === 0) return null

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
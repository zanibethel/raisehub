import { createClient } from '@/lib/supabase/server'
import OrganizationDashboardContent from './organization-dashboard-content'

// =============================================================================
// Types
// =============================================================================

type CampaignPurchase = {
  campaign_id: string
  amount_paid: number
  platform_fee: number
  organization_earnings: number
  seller_name: string | null
}

type CampaignMetrics = {
  sold: number
  gross: number
  fees: number
  earnings: number
}

// =============================================================================
// Organization dashboard loader
// =============================================================================

export default async function OrganizationDashboard() {
  const supabase = await createClient()

  // ===========================================================================
  // Authentication
  // ===========================================================================

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  // ===========================================================================
  // Campaigns
  // ===========================================================================

  const { data: campaigns } = await supabase
    .from('campaigns')
    .select('*')
    .eq('organization_id', user.id)
    .order('created_at', { ascending: false })

  const organizationCampaigns = campaigns ?? []

  const activeCampaigns = organizationCampaigns.filter(
    (campaign) => campaign.status === 'active'
  ).length

  const totalGoal = organizationCampaigns.reduce(
    (sum, campaign) =>
      sum + Number(campaign.goal_amount ?? 0),
    0
  )

  // ===========================================================================
  // Purchase analytics
  // ===========================================================================

  const campaignIds = organizationCampaigns.map(
    (campaign) => campaign.id
  )

  let purchases: CampaignPurchase[] = []

  if (campaignIds.length > 0) {
    const { data } = await supabase
      .from('campaign_purchases')
      .select(
        'campaign_id, amount_paid, platform_fee, organization_earnings, seller_name'
      )
      .in('campaign_id', campaignIds)

    purchases = data ?? []
  }

  const totalPassesSold = purchases.length

  const grossRevenue = purchases.reduce(
    (sum, purchase) =>
      sum + Number(purchase.amount_paid ?? 0),
    0
  )

  const totalFees = purchases.reduce(
    (sum, purchase) =>
      sum + Number(purchase.platform_fee ?? 0),
    0
  )

  const totalEarnings = purchases.reduce(
    (sum, purchase) =>
      sum + Number(purchase.organization_earnings ?? 0),
    0
  )

  // ===========================================================================
  // Campaign metrics
  // ===========================================================================

  const metricsByCampaign = new Map<
    string,
    CampaignMetrics
  >()

  for (const purchase of purchases) {
    const existing =
      metricsByCampaign.get(purchase.campaign_id) ?? {
        sold: 0,
        gross: 0,
        fees: 0,
        earnings: 0,
      }

    existing.sold += 1
    existing.gross += Number(purchase.amount_paid ?? 0)
    existing.fees += Number(purchase.platform_fee ?? 0)
    existing.earnings += Number(
      purchase.organization_earnings ?? 0
    )

    metricsByCampaign.set(
      purchase.campaign_id,
      existing
    )
  }

  // ===========================================================================
  // Seller metrics
  // ===========================================================================

  const sellerStats = new Map<
    string,
    {
      sold: number
      earnings: number
    }
  >()

  for (const purchase of purchases) {
    const seller = purchase.seller_name?.trim()

    if (!seller) {
      continue
    }

    const existing = sellerStats.get(seller) ?? {
      sold: 0,
      earnings: 0,
    }

    existing.sold += 1
    existing.earnings += Number(
      purchase.organization_earnings ?? 0
    )

    sellerStats.set(seller, existing)
  }

  const topSellers = [...sellerStats.entries()]
    .map(([seller, stats]) => ({
      seller,
      sold: stats.sold,
      earnings: stats.earnings,
    }))
    .sort((a, b) => b.sold - a.sold)

  // ===========================================================================
  // Render
  // ===========================================================================

  return (
    <OrganizationDashboardContent
      totalPassesSold={totalPassesSold}
      totalEarnings={totalEarnings}
      activeCampaigns={activeCampaigns}
      totalGoal={totalGoal}
      grossRevenue={grossRevenue}
      totalFees={totalFees}
      sellers={topSellers}
      campaigns={organizationCampaigns}
      metricsByCampaign={Object.fromEntries(
        metricsByCampaign
      )}
    />
  )
}
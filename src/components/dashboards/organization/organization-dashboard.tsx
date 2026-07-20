import { isCampaignPurchaseProgressEligible } from '@/lib/rules/campaign-progress-rules'
import { resolveEffectivePricing } from '@/lib/services/pricing-resolution-service'
import { createClient } from '@/lib/supabase/server'
import OrganizationDashboardContent from './organization-dashboard-content'

// =============================================================================
// Types
// =============================================================================

type OrganizationDashboardProps = {
  /**
   * Legacy organization profile ID associated with an already-authorized
   * organization workspace.
   *
   * The dashboard route must verify the selected workspace before supplying
   * this value. When omitted, the current legacy behavior continues to use
   * the authenticated user's ID.
   */
  organizationLegacyProfileId?: string | null
}

type CampaignPurchase = {
  id: string
  campaign_id: string
  user_id: string | null
  buyer_email: string | null
  amount_paid: number
  platform_fee: number
  organization_earnings: number
  seller_name: string | null
  payment_status: string
}

type CampaignMetrics = {
  supporterCount: number
  sellerCount: number
  gross: number
  fees: number
  amountRaised: number
}

type CanonicalOrganizationPricingRow = {
  id: string
  town_name: string | null
  state_code: string | null
}

function generateSupporterKey(
  purchase: CampaignPurchase
): string {
  if (purchase.user_id) {
    return `user:${purchase.user_id}`
  }

  if (purchase.buyer_email) {
    return `email:${purchase.buyer_email.toLowerCase()}`
  }

  return `guest:${purchase.id}`
}

// =============================================================================
// Organization dashboard loader
// =============================================================================

export default async function OrganizationDashboard({
  organizationLegacyProfileId,
}: OrganizationDashboardProps = {}) {
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

  const organizationProfileId =
    organizationLegacyProfileId?.trim() || user.id

  // ===========================================================================
  // Effective managed pricing
  // ===========================================================================

  const [
    { data: organizationProfile },
    { data: canonicalOrganization },
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('is_demo')
      .eq('id', organizationProfileId)
      .maybeSingle(),
    supabase
      .from('organizations')
      .select('id, town_name, state_code')
      .eq('legacy_profile_id', organizationProfileId)
      .maybeSingle<CanonicalOrganizationPricingRow>(),
  ])

  const campaignCreationPricing =
    await resolveEffectivePricing({
      organizationId:
        canonicalOrganization?.id ?? null,
      townName:
        canonicalOrganization?.town_name ?? null,
      stateCode:
        canonicalOrganization?.state_code ?? null,
      isDemo: organizationProfile?.is_demo ?? false,
    })

  // ===========================================================================
  // Campaigns
  // ===========================================================================

  const { data: campaigns } = await supabase
    .from('campaigns')
    .select('*')
    .eq('organization_id', organizationProfileId)
    .order('created_at', { ascending: false })

  const organizationCampaigns = campaigns ?? []

  const activeCampaigns = organizationCampaigns.filter(
    (campaign) => campaign.status === 'active'
  ).length

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
        'id, campaign_id, user_id, buyer_email, amount_paid, platform_fee, organization_earnings, seller_name, payment_status'
      )
      .in('campaign_id', campaignIds)

    purchases = (data ?? []).filter((purchase) =>
      isCampaignPurchaseProgressEligible(
        purchase.payment_status
      )
    )
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
      sum +
      Number(purchase.organization_earnings ?? 0),
    0
  )

  // ===========================================================================
  // Campaign metrics
  // ===========================================================================

  const metricsByCampaign = new Map<
    string,
    CampaignMetrics
  >()

  const supportersByCampaign = new Map<
    string,
    Set<string>
  >()

  const sellersByCampaign = new Map<
    string,
    Set<string>
  >()

  const supporterKeys = new Set<string>()

  for (const purchase of purchases) {
    const existing =
      metricsByCampaign.get(purchase.campaign_id) ?? {
        supporterCount: 0,
        sellerCount: 0,
        gross: 0,
        fees: 0,
        amountRaised: 0,
      }

    existing.gross += Number(
      purchase.amount_paid ?? 0
    )

    existing.fees += Number(
      purchase.platform_fee ?? 0
    )

    existing.amountRaised += Number(
      purchase.organization_earnings ?? 0
    )

    const supporterKey =
      generateSupporterKey(purchase)

    supporterKeys.add(supporterKey)

    const campaignSupporters =
      supportersByCampaign.get(
        purchase.campaign_id
      ) ?? new Set<string>()

    campaignSupporters.add(supporterKey)
    existing.supporterCount =
      campaignSupporters.size

    supportersByCampaign.set(
      purchase.campaign_id,
      campaignSupporters
    )

    const seller = purchase.seller_name?.trim()

    if (seller) {
      const campaignSellers =
        sellersByCampaign.get(
          purchase.campaign_id
        ) ?? new Set<string>()

      campaignSellers.add(seller)
      existing.sellerCount =
        campaignSellers.size

      sellersByCampaign.set(
        purchase.campaign_id,
        campaignSellers
      )
    }

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
    .sort((first, second) =>
      second.sold - first.sold
    )

  const totalCampaigns =
    organizationCampaigns.length

  const activeSellerCount = sellerStats.size
  const totalSupporters = supporterKeys.size

  // ===========================================================================
  // Render
  // ===========================================================================

  return (
    <OrganizationDashboardContent
      totalPassesSold={totalPassesSold}
      totalEarnings={totalEarnings}
      activeCampaigns={activeCampaigns}
      totalFundsRaised={totalEarnings}
      totalSellers={activeSellerCount}
      totalSupporters={totalSupporters}
      grossRevenue={grossRevenue}
      totalFees={totalFees}
      sellers={topSellers}
      campaigns={organizationCampaigns}
      metricsByCampaign={Object.fromEntries(
        metricsByCampaign
      )}
      totalCampaigns={totalCampaigns}
      activeSellerCount={activeSellerCount}
      campaignCreationPricing={{
        passPrice: campaignCreationPricing.passPrice,
        platformFeePercent:
          campaignCreationPricing.platformFeePercent,
        organizationPassEarnings:
          campaignCreationPricing.organizationPassEarnings,
        usedFallback:
          campaignCreationPricing.usedFallback,
      }}
    />
  )
}
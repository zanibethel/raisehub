import { isCampaignPurchaseProgressEligible } from '@/lib/rules/campaign-progress-rules'
import { resolveEffectivePricing } from '@/lib/services/pricing-resolution-service'
import { createClient } from '@/lib/supabase/server'
import OrganizationDashboardContent from './organization-dashboard-content'

type OrganizationDashboardProps = {
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
  refunded_amount_cents: number | null
  refunded_organization_amount_cents: number | null
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

type CanonicalOrganizationPricingRow = { id: string }

function generateSupporterKey(purchase: CampaignPurchase): string {
  if (purchase.user_id) return `user:${purchase.user_id}`
  if (purchase.buyer_email) return `email:${purchase.buyer_email.toLowerCase()}`
  return `guest:${purchase.id}`
}

function isProgressPurchase(purchase: CampaignPurchase) {
  return (
    isCampaignPurchaseProgressEligible(purchase.payment_status) ||
    purchase.payment_status?.trim().toLowerCase() === 'partially_refunded'
  )
}

function netPurchaseAmounts(purchase: CampaignPurchase) {
  const gross = Math.max(
    Number(purchase.amount_paid ?? 0) -
      Number(purchase.refunded_amount_cents ?? 0) / 100,
    0
  )
  const organizationEarnings = Math.max(
    Number(purchase.organization_earnings ?? 0) -
      Number(purchase.refunded_organization_amount_cents ?? 0) / 100,
    0
  )

  return {
    gross,
    organizationEarnings,
    platformFee: Math.max(gross - organizationEarnings, 0),
  }
}

export default async function OrganizationDashboard({
  organizationLegacyProfileId,
}: OrganizationDashboardProps = {}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const organizationProfileId = organizationLegacyProfileId?.trim() || user.id

  const [{ data: organizationProfile }, { data: canonicalOrganization }] = await Promise.all([
    supabase.from('profiles').select('is_demo').eq('id', organizationProfileId).maybeSingle(),
    supabase.from('organizations').select('id').eq('legacy_profile_id', organizationProfileId).maybeSingle<CanonicalOrganizationPricingRow>(),
  ])

  const canonicalOrganizationId = canonicalOrganization?.id ?? null
  const campaignCreationPricing = await resolveEffectivePricing({
    organizationId: canonicalOrganizationId,
    isDemo: organizationProfile?.is_demo ?? false,
  })

  let campaignQuery = supabase.from('campaigns').select('*')
  campaignQuery = canonicalOrganizationId
    ? campaignQuery.or(`canonical_organization_id.eq.${canonicalOrganizationId},organization_id.eq.${organizationProfileId}`)
    : campaignQuery.eq('organization_id', organizationProfileId)

  const { data: campaigns } = await campaignQuery.order('created_at', { ascending: false })
  const organizationCampaigns = campaigns ?? []
  const activeCampaigns = organizationCampaigns.filter((campaign) => campaign.status === 'active').length
  const campaignIds = organizationCampaigns.map((campaign) => campaign.id)

  let purchases: CampaignPurchase[] = []
  if (campaignIds.length > 0) {
    // The checked-in generated Supabase types predate the refund reconciliation
    // columns. Keep the compatibility cast local until types are regenerated.
    const { data } = await (supabase.from('campaign_purchases') as any)
      .select('id, campaign_id, user_id, buyer_email, amount_paid, platform_fee, organization_earnings, refunded_amount_cents, refunded_organization_amount_cents, seller_name, payment_status')
      .in('campaign_id', campaignIds)

    purchases = ((data ?? []) as CampaignPurchase[]).filter(isProgressPurchase)
  }

  const totalPassesSold = purchases.length
  const grossRevenue = purchases.reduce(
    (sum, purchase) => sum + netPurchaseAmounts(purchase).gross,
    0
  )
  const totalFees = purchases.reduce(
    (sum, purchase) => sum + netPurchaseAmounts(purchase).platformFee,
    0
  )
  const totalEarnings = purchases.reduce(
    (sum, purchase) => sum + netPurchaseAmounts(purchase).organizationEarnings,
    0
  )

  const metricsByCampaign = new Map<string, CampaignMetrics>()
  const supportersByCampaign = new Map<string, Set<string>>()
  const sellersByCampaign = new Map<string, Set<string>>()
  const supporterKeys = new Set<string>()

  for (const purchase of purchases) {
    const existing = metricsByCampaign.get(purchase.campaign_id) ?? {
      supporterCount: 0,
      sellerCount: 0,
      gross: 0,
      fees: 0,
      amountRaised: 0,
    }
    const net = netPurchaseAmounts(purchase)

    existing.gross += net.gross
    existing.fees += net.platformFee
    existing.amountRaised += net.organizationEarnings

    const supporterKey = generateSupporterKey(purchase)
    supporterKeys.add(supporterKey)
    const campaignSupporters = supportersByCampaign.get(purchase.campaign_id) ?? new Set<string>()
    campaignSupporters.add(supporterKey)
    existing.supporterCount = campaignSupporters.size
    supportersByCampaign.set(purchase.campaign_id, campaignSupporters)

    const seller = purchase.seller_name?.trim()
    if (seller) {
      const campaignSellers = sellersByCampaign.get(purchase.campaign_id) ?? new Set<string>()
      campaignSellers.add(seller)
      existing.sellerCount = campaignSellers.size
      sellersByCampaign.set(purchase.campaign_id, campaignSellers)
    }

    metricsByCampaign.set(purchase.campaign_id, existing)
  }

  const sellerStats = new Map<string, { sold: number; earnings: number }>()
  for (const purchase of purchases) {
    const seller = purchase.seller_name?.trim()
    if (!seller) continue
    const existing = sellerStats.get(seller) ?? { sold: 0, earnings: 0 }
    existing.sold += 1
    existing.earnings += netPurchaseAmounts(purchase).organizationEarnings
    sellerStats.set(seller, existing)
  }

  const topSellers = [...sellerStats.entries()]
    .map(([seller, stats]) => ({ seller, sold: stats.sold, earnings: stats.earnings }))
    .sort((first, second) => second.sold - first.sold)

  return (
    <OrganizationDashboardContent
      organizationId={canonicalOrganizationId}
      totalPassesSold={totalPassesSold}
      totalEarnings={totalEarnings}
      activeCampaigns={activeCampaigns}
      totalFundsRaised={totalEarnings}
      totalSellers={sellerStats.size}
      totalSupporters={supporterKeys.size}
      grossRevenue={grossRevenue}
      totalFees={totalFees}
      sellers={topSellers}
      campaigns={organizationCampaigns}
      metricsByCampaign={Object.fromEntries(metricsByCampaign)}
      totalCampaigns={organizationCampaigns.length}
      activeSellerCount={sellerStats.size}
      campaignCreationPricing={{
        passPrice: campaignCreationPricing.passPrice,
        platformFeePercent: campaignCreationPricing.platformFeePercent,
        organizationPassEarnings: campaignCreationPricing.organizationPassEarnings,
        usedFallback: campaignCreationPricing.usedFallback,
      }}
    />
  )
}

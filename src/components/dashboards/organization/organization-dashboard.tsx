import Link from 'next/link'

import { evaluateCampaignPublishingEligibility } from '@/lib/campaign-publishing/evaluate'
import { isCampaignPurchaseProgressEligible } from '@/lib/rules/campaign-progress-rules'
import { isCampaignCurrentlySellable } from '@/lib/rules/identity-access-rules'
import { resolveEffectivePricing } from '@/lib/services/pricing-resolution-service'
import { createAdminClient } from '@/lib/supabase/admin'
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

type CanonicalOrganizationPricingRow = {
  id: string
  legacy_profile_id: string | null
  name: string | null
  town_name: string | null
  state_code: string | null
}

type OrganizationMembershipRoleRow = { membership_role: string }

type StripeReadinessRow = {
  livemode: boolean
  onboarding_status: string
  details_submitted: boolean
  payouts_enabled: boolean
  disabled_reason: string | null
  requirements_currently_due: unknown
}

function organizationProfileIsReady(organization: CanonicalOrganizationPricingRow | null) {
  const stateCode = organization?.state_code?.trim().toUpperCase() ?? ''
  return Boolean(
    organization?.name?.trim() &&
      organization.town_name?.trim() &&
      /^[A-Z]{2}$/.test(stateCode)
  )
}

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
    supabase
      .from('organizations')
      .select('id, legacy_profile_id, name, town_name, state_code')
      .eq('legacy_profile_id', organizationProfileId)
      .maybeSingle<CanonicalOrganizationPricingRow>(),
  ])

  const canonicalOrganizationId = canonicalOrganization?.id ?? null
  const { data: organizationMembership } = canonicalOrganizationId
    ? await supabase
        .from('organization_memberships')
        .select('membership_role')
        .eq('organization_id', canonicalOrganizationId)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle<OrganizationMembershipRoleRow>()
    : { data: null }
  const isSellerWorkspace = organizationMembership?.membership_role === 'seller'
  const canManageOrganization = Boolean(
    canonicalOrganization?.legacy_profile_id === user.id ||
      organizationMembership?.membership_role === 'admin' ||
      organizationMembership?.membership_role === 'manager'
  )

  const campaignCreationPricing = await resolveEffectivePricing({
    organizationId: canonicalOrganizationId,
    isDemo: organizationProfile?.is_demo ?? false,
  })

  let campaignQuery = supabase.from('campaigns').select('*')
  campaignQuery = canonicalOrganizationId
    ? campaignQuery.or(`canonical_organization_id.eq.${canonicalOrganizationId},organization_id.eq.${organizationProfileId}`)
    : campaignQuery.eq('organization_id', organizationProfileId)

  const [{ data: campaigns }, stripeAccountResult] = await Promise.all([
    campaignQuery.order('created_at', { ascending: false }),
    canonicalOrganizationId
      ? (createAdminClient() as any)
          .from('organization_stripe_accounts')
          .select('livemode, onboarding_status, details_submitted, payouts_enabled, disabled_reason, requirements_currently_due')
          .eq('organization_id', canonicalOrganizationId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  const stripeAccount = (stripeAccountResult.data ?? null) as StripeReadinessRow | null
  const expectedLivemode = process.env.STRIPE_SECRET_KEY?.trim().startsWith('sk_live_') ?? false
  const profileReady = organizationProfileIsReady(canonicalOrganization ?? null)
  const organizationCampaigns = (campaigns ?? []).map((campaign) => {
    const status = campaign.status?.trim().toLowerCase() ?? ''
    const approvalCurrent =
      campaign.review_status === 'approved' &&
      Number.isInteger(campaign.content_revision) &&
      campaign.content_revision > 0 &&
      campaign.approved_revision === campaign.content_revision

    return {
      ...campaign,
      publishingEligibility: evaluateCampaignPublishingEligibility({
        campaignId: campaign.id,
        campaignStatus: status === 'paused' ? 'draft' : campaign.status,
        reviewStatus: campaign.review_status,
        authorized: canManageOrganization,
        profileReady,
        approvalCurrent,
        stripe: {
          accountExists: Boolean(stripeAccount),
          expectedLivemode,
          livemode: stripeAccount?.livemode ?? null,
          onboardingStatus: stripeAccount?.onboarding_status ?? null,
          detailsSubmitted: stripeAccount?.details_submitted ?? false,
          payoutsEnabled: stripeAccount?.payouts_enabled ?? false,
          disabledReason: stripeAccount?.disabled_reason ?? null,
          requirementsCurrentlyDue: stripeAccount?.requirements_currently_due ?? [],
        },
      }),
    }
  })
  const now = new Date()
  const sellableCampaigns = organizationCampaigns.filter((campaign) =>
    isCampaignCurrentlySellable(campaign, now)
  )
  const activeCampaigns = sellableCampaigns.length
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
    <>
      {isSellerWorkspace ? (
        <section className="mt-6 rounded-3xl border border-violet-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-violet-700">Seller setup</p>
              <h2 className="mt-1 text-xl font-bold text-gray-900">Link your roster name</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
                Select your name from this organization’s available campaign rosters. Your existing QR code, referral link, and sales history will stay connected.
              </p>
            </div>
            <Link
              href="/seller/claim-roster"
              className="inline-flex shrink-0 items-center justify-center rounded-xl bg-violet-600 px-5 py-3 text-sm font-bold text-white hover:bg-violet-700"
            >
              Link my roster name
            </Link>
          </div>
        </section>
      ) : null}

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
        sellerCampaigns={sellableCampaigns}
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
    </>
  )
}

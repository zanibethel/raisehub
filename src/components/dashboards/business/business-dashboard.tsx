import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { getPartnerRewardsSummary } from '@/lib/repositories/partner-rewards-repository'
import { canViewBusiness } from '@/lib/services/capability-resolution-service'
import { getBusinessPayoutStatus } from '@/lib/stripe/business-connect'

import BusinessWorkspaceFrame from './business-workspace-frame'

export type BusinessWorkspaceView = 'dashboard' | 'offers' | 'reports' | 'rewards'

type BusinessDashboardProps = {
  businessId?: string | null
  businessLegacyProfileId?: string | null
  view?: BusinessWorkspaceView
}

type BusinessProfile = {
  business_name: string | null
  phone: string | null
  address: string | null
  google_maps_url: string | null
  logo_url: string | null
  website_url: string | null
  display_name: string | null
  redemption_method: string | null
}

type CanonicalBusiness = {
  id: string
  legacy_profile_id: string | null
  name: string | null
  description: string | null
  category: string | null
  logo_url: string | null
  phone: string | null
  email: string | null
  website_url: string | null
  address: string | null
  google_maps_url: string | null
  status: string
  subscription_tier: string
  archived_at: string | null
  archive_reason: string | null
  restore_requested_at: string | null
}

type ProfileQueryError = {
  code?: string | null
  message?: string | null
}

export type RedemptionRow = {
  id: string
  offer_id: string
  user_id: string
  created_at: string
  offer_title_snapshot: string | null
  benefit_snapshot: string | null
  customer_value_snapshot: number | string | null
  usage_rule_snapshot: string | null
  confirmation_method: string | null
  status: string | null
  auto_confirm_at: string | null
  confirmed_at: string | null
  rejected_at: string | null
  rejection_reason: string | null
}

const BUSINESS_PROFILE_FIELDS =
  'business_name, phone, address, google_maps_url, logo_url, website_url, display_name'
const BUSINESS_PROFILE_FIELDS_WITH_REDEMPTION =
  `${BUSINESS_PROFILE_FIELDS}, redemption_method`
const CANONICAL_BUSINESS_FIELDS =
  'id, legacy_profile_id, name, description, category, logo_url, phone, email, website_url, address, google_maps_url, status, subscription_tier, archived_at, archive_reason, restore_requested_at'

function isMissingRedemptionMethodError(error: ProfileQueryError | null): boolean {
  if (!error) return false

  return (
    error.code === '42703' ||
    error.code === 'PGRST204' ||
    error.message?.toLowerCase().includes('redemption_method') === true
  )
}

function toCustomerValue(value: number | string | null): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

function profileFromCanonicalBusiness(
  business: CanonicalBusiness | null
): BusinessProfile | null {
  if (!business) return null

  return {
    business_name: business.name,
    phone: business.phone,
    address: business.address,
    google_maps_url: business.google_maps_url,
    logo_url: business.logo_url,
    website_url: business.website_url,
    display_name: business.name,
    redemption_method: null,
  }
}

export default async function BusinessDashboard({
  businessId,
  businessLegacyProfileId,
  view = 'dashboard',
}: BusinessDashboardProps = {}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const finalizeDueRedemptionsPromise = (async () => {
    const admin = createAdminClient()

    try {
      await (admin as any).rpc('finalize_due_redemptions')
    } catch (error) {
      console.error(
        'Unable to finalize due redemptions without blocking dashboard:',
        error
      )
    }
  })()

  const requestedBusinessId = businessId?.trim() || null
  const requestedLegacyProfileId = businessLegacyProfileId?.trim() || null

  if (requestedBusinessId) {
    const access = await canViewBusiness(requestedBusinessId)
    if (!access.allowed) return null
  }

  const canonicalQuery = supabase
    .from('businesses')
    .select(CANONICAL_BUSINESS_FIELDS)

  const { data: canonicalBusinessData } = requestedBusinessId
    ? await canonicalQuery.eq('id', requestedBusinessId).maybeSingle()
    : await canonicalQuery
        .eq('legacy_profile_id', requestedLegacyProfileId ?? user.id)
        .maybeSingle()

  const canonicalBusiness =
    (canonicalBusinessData as CanonicalBusiness | null) ?? null
  const legacyProfileId =
    canonicalBusiness?.legacy_profile_id ?? requestedLegacyProfileId
  const businessProfileId = legacyProfileId ?? user.id

  let profile: BusinessProfile | null = null

  if (legacyProfileId || !canonicalBusiness) {
    const profileWithRedemptionMethod = await supabase
      .from('profiles')
      .select(BUSINESS_PROFILE_FIELDS_WITH_REDEMPTION)
      .eq('id', businessProfileId)
      .maybeSingle()

    profile = profileWithRedemptionMethod.data as BusinessProfile | null

    if (isMissingRedemptionMethodError(profileWithRedemptionMethod.error)) {
      const { data: legacyProfile } = await supabase
        .from('profiles')
        .select(BUSINESS_PROFILE_FIELDS)
        .eq('id', businessProfileId)
        .maybeSingle()

      profile = legacyProfile
        ? {
            ...legacyProfile,
            redemption_method: null,
          }
        : null
    }
  }

  if (!profile) {
    profile = profileFromCanonicalBusiness(canonicalBusiness)
  }

  const lifecycle = canonicalBusiness
  const canonicalBusinessId = lifecycle?.id ?? requestedBusinessId
  const isGrowthPlan = lifecycle?.subscription_tier === 'growth'

  const offerBusinessIds = [
    canonicalBusinessId,
    legacyProfileId,
    !canonicalBusinessId && !legacyProfileId ? user.id : null,
  ].filter((value): value is string => Boolean(value))

  const rewardsPromise = getPartnerRewardsSummary(canonicalBusinessId)
  const payoutPromise = getBusinessPayoutStatus(canonicalBusinessId, {
    refreshStripe: false,
  })
  const verificationPromise = canonicalBusinessId
    ? (supabase as any)
        .from('business_verifications')
        .select('status')
        .eq('business_id', canonicalBusinessId)
        .maybeSingle()
    : Promise.resolve({ data: null })
  const offersPromise = offerBusinessIds.length
    ? supabase
        .from('offers')
        .select('*')
        .in('business_id', offerBusinessIds)
        .order('created_at', { ascending: false })
    : Promise.resolve({ data: [] })

  const [[rewardsResult, payoutResult], verificationResult, offersResult] =
    await Promise.all([
      Promise.allSettled([rewardsPromise, payoutPromise]),
      verificationPromise,
      offersPromise,
    ])

  const rewardsSummary =
    rewardsResult.status === 'fulfilled'
      ? rewardsResult.value
      : await getPartnerRewardsSummary(null)
  const payoutStatus =
    payoutResult.status === 'fulfilled' ? payoutResult.value : null
  const verification = verificationResult.data
  const offers = offersResult.data

  if (rewardsResult.status === 'rejected') {
    console.error(
      'Unable to load Partner Rewards without blocking dashboard:',
      rewardsResult.reason
    )
  }
  if (payoutResult.status === 'rejected') {
    console.error(
      'Unable to load payout status without blocking dashboard:',
      payoutResult.reason
    )
  }

  const offerIds = (offers ?? []).map((offer) => offer.id)

  let viewCount = 0
  let clickCount = 0
  let redemptionData: RedemptionRow[] = []

  if (offerIds.length > 0) {
    const viewsPromise = supabase
      .from('offer_views')
      .select('*', { count: 'exact', head: true })
      .in('offer_id', offerIds)
    const clicksPromise = supabase
      .from('offer_clicks')
      .select('*', { count: 'exact', head: true })
      .in('offer_id', offerIds)

    // The maintenance RPC started near the top of the request. Waiting here
    // preserves fresh redemption state without putting it in the initial
    // authorization/profile critical path.
    await finalizeDueRedemptionsPromise

    const [viewsResult, clicksResult, redemptionResult] = await Promise.all([
      viewsPromise,
      clicksPromise,
      (supabase as any)
        .from('redemptions')
        .select(
          'id, offer_id, user_id, created_at, offer_title_snapshot, benefit_snapshot, customer_value_snapshot, usage_rule_snapshot, confirmation_method, status, auto_confirm_at, confirmed_at, rejected_at, rejection_reason'
        )
        .in('offer_id', offerIds)
        .in('status', ['pending', 'confirmed', 'rejected'])
        .order('created_at', { ascending: false }),
    ])

    viewCount = viewsResult.count ?? 0
    clickCount = clicksResult.count ?? 0
    redemptionData = (redemptionResult.data ?? []) as RedemptionRow[]
  } else {
    await finalizeDueRedemptionsPromise
  }

  const conversionRate =
    viewCount > 0 ? ((clickCount / viewCount) * 100).toFixed(1) : '0'

  const redemptionActivity = redemptionData
  const confirmedRedemptions = redemptionActivity.filter(
    (redemption) => redemption.status === 'confirmed'
  )
  const pendingRedemptions = redemptionActivity.filter(
    (redemption) => redemption.status === 'pending'
  )
  const rejectedRedemptions = redemptionActivity.filter(
    (redemption) => redemption.status === 'rejected'
  )

  const activityUserIds = [
    ...new Set(redemptionActivity.map((redemption) => redemption.user_id)),
  ]
  const confirmedUserIds = [
    ...new Set(confirmedRedemptions.map((redemption) => redemption.user_id)),
  ]

  const { data: redeemedProfiles } =
    activityUserIds.length > 0
      ? await supabase
          .from('profiles')
          .select('id,email')
          .in('id', activityUserIds)
      : { data: [] }

  const redemptionCountByOfferId = new Map<string, number>()

  for (const redemption of confirmedRedemptions) {
    redemptionCountByOfferId.set(
      redemption.offer_id,
      (redemptionCountByOfferId.get(redemption.offer_id) ?? 0) + 1
    )
  }

  const totalRedemptions = confirmedRedemptions.length
  const uniqueSupporters = confirmedUserIds.length
  const pendingRedemptionCount = pendingRedemptions.length
  const rejectedRedemptionCount = rejectedRedemptions.length
  const totalCustomerValueDelivered = confirmedRedemptions.reduce(
    (total, redemption) => total + toCustomerValue(redemption.customer_value_snapshot),
    0
  )

  const activeOffers = (offers ?? []).filter(
    (offer) =>
      offer.is_active !== false &&
      (!offer.ends_at || new Date(offer.ends_at) >= new Date())
  )

  const FREE_ACTIVE_OFFER_LIMIT = 3
  const activeOfferLimit = FREE_ACTIVE_OFFER_LIMIT + rewardsSummary.activeExtraOfferSlots
  const hasReachedLimit =
    !isGrowthPlan && activeOffers.length >= activeOfferLimit

  let topOfferId: string | null = null
  let topOfferCount = 0

  for (const [offerId, count] of redemptionCountByOfferId.entries()) {
    if (count > topOfferCount) {
      topOfferId = offerId
      topOfferCount = count
    }
  }

  const topOffer = (offers ?? []).find((offer) => offer.id === topOfferId)

  const profileEmailById = Object.fromEntries(
    (redeemedProfiles ?? []).map((redeemedProfile) => [
      redeemedProfile.id,
      redeemedProfile.email || 'Unknown user',
    ])
  )

  const confirmedRedemptionsByOfferId = new Map<string, RedemptionRow[]>()

  for (const redemption of confirmedRedemptions) {
    const existing = confirmedRedemptionsByOfferId.get(redemption.offer_id) ?? []
    existing.push(redemption)
    confirmedRedemptionsByOfferId.set(redemption.offer_id, existing)
  }

  return (
    <BusinessWorkspaceFrame
      view={view}
      profile={profile}
      offers={offers ?? []}
      totalRedemptions={totalRedemptions}
      uniqueSupporters={uniqueSupporters}
      pendingRedemptionCount={pendingRedemptionCount}
      rejectedRedemptionCount={rejectedRedemptionCount}
      totalCustomerValueDelivered={totalCustomerValueDelivered}
      redemptionActivity={redemptionActivity}
      activeOffersCount={activeOffers.length}
      activeOfferLimit={activeOfferLimit}
      hasReachedLimit={hasReachedLimit}
      isGrowthPlan={isGrowthPlan}
      topOfferTitle={topOffer?.title || ''}
      topOfferCount={topOfferCount}
      redemptionCountByOfferId={Object.fromEntries(redemptionCountByOfferId)}
      redemptionsByOfferId={Object.fromEntries(confirmedRedemptionsByOfferId)}
      profileEmailById={profileEmailById}
      viewCount={viewCount}
      clickCount={clickCount}
      conversionRate={conversionRate}
      businessId={canonicalBusinessId}
      businessStatus={lifecycle?.status ?? 'active'}
      archivedAt={lifecycle?.archived_at ?? null}
      archiveReason={lifecycle?.archive_reason ?? null}
      restoreRequestedAt={lifecycle?.restore_requested_at ?? null}
      rewardsSummary={rewardsSummary}
      verificationStatus={verification?.status ?? 'not_applied'}
      payoutStatus={payoutStatus}
    />
  )
}

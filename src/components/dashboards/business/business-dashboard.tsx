import { createClient } from '@/lib/supabase/server'

import BusinessWorkspaceFrame from './business-workspace-frame'

export type BusinessWorkspaceView = 'dashboard' | 'offers' | 'reports'

type BusinessDashboardProps = {
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

type BusinessWorkspaceLifecycle = {
  id: string
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

export default async function BusinessDashboard({
  businessLegacyProfileId,
  view = 'dashboard',
}: BusinessDashboardProps = {}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  await (supabase as any).rpc('finalize_due_redemptions')

  const businessProfileId = businessLegacyProfileId?.trim() || user.id

  const profileWithRedemptionMethod = await supabase
    .from('profiles')
    .select(BUSINESS_PROFILE_FIELDS_WITH_REDEMPTION)
    .eq('id', businessProfileId)
    .single()

  let profile = profileWithRedemptionMethod.data as BusinessProfile | null

  if (isMissingRedemptionMethodError(profileWithRedemptionMethod.error)) {
    const { data: legacyProfile } = await supabase
      .from('profiles')
      .select(BUSINESS_PROFILE_FIELDS)
      .eq('id', businessProfileId)
      .single()

    profile = legacyProfile
      ? {
          ...legacyProfile,
          redemption_method: null,
        }
      : null
  }

  const { data: businessWorkspace } = await (supabase as any)
    .from('businesses')
    .select(
      'id, status, subscription_tier, archived_at, archive_reason, restore_requested_at'
    )
    .eq('legacy_profile_id', businessProfileId)
    .maybeSingle()

  const lifecycle = businessWorkspace as BusinessWorkspaceLifecycle | null
  const isGrowthPlan = lifecycle?.subscription_tier === 'growth'

  const { data: offers } = await supabase
    .from('offers')
    .select('*')
    .eq('business_id', businessProfileId)
    .order('created_at', { ascending: false })

  const offerIds = (offers ?? []).map((offer) => offer.id)

  let viewCount = 0
  let clickCount = 0

  if (offerIds.length > 0) {
    const { count: views } = await supabase
      .from('offer_views')
      .select('*', { count: 'exact', head: true })
      .in('offer_id', offerIds)

    const { count: clicks } = await supabase
      .from('offer_clicks')
      .select('*', { count: 'exact', head: true })
      .in('offer_id', offerIds)

    viewCount = views ?? 0
    clickCount = clicks ?? 0
  }

  const conversionRate =
    viewCount > 0 ? ((clickCount / viewCount) * 100).toFixed(1) : '0'

  const { data: redemptionData } =
    offerIds.length > 0
      ? await (supabase as any)
          .from('redemptions')
          .select(
            'id, offer_id, user_id, created_at, offer_title_snapshot, benefit_snapshot, customer_value_snapshot, usage_rule_snapshot, confirmation_method, status, auto_confirm_at, confirmed_at, rejected_at, rejection_reason'
          )
          .in('offer_id', offerIds)
          .in('status', ['pending', 'confirmed', 'rejected'])
          .order('created_at', { ascending: false })
      : { data: [] }

  const redemptionActivity = (redemptionData ?? []) as RedemptionRow[]
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
  const hasReachedLimit =
    !isGrowthPlan && activeOffers.length >= FREE_ACTIVE_OFFER_LIMIT

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
      activeOfferLimit={FREE_ACTIVE_OFFER_LIMIT}
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
      businessId={lifecycle?.id ?? null}
      businessStatus={lifecycle?.status ?? 'active'}
      archivedAt={lifecycle?.archived_at ?? null}
      archiveReason={lifecycle?.archive_reason ?? null}
      restoreRequestedAt={lifecycle?.restore_requested_at ?? null}
    />
  )
}

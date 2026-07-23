import { createClient } from '@/lib/supabase/server'

import BusinessDashboardContent from './business-dashboard-content'

type BusinessDashboardProps = {
  businessLegacyProfileId?: string | null
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

type ProfileQueryError = {
  code?: string | null
  message?: string | null
}

const BUSINESS_PROFILE_FIELDS =
  'business_name, phone, address, google_maps_url, logo_url, website_url, display_name'
const BUSINESS_PROFILE_FIELDS_WITH_REDEMPTION =
  `${BUSINESS_PROFILE_FIELDS}, redemption_method`

function isMissingRedemptionMethodError(
  error: ProfileQueryError | null
): boolean {
  if (!error) return false

  return (
    error.code === '42703' ||
    error.code === 'PGRST204' ||
    error.message?.toLowerCase().includes('redemption_method') === true
  )
}

export default async function BusinessDashboard({
  businessLegacyProfileId,
}: BusinessDashboardProps = {}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

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

  const { data: redemptions } =
    offerIds.length > 0
      ? await supabase
          .from('redemptions')
          .select('offer_id, user_id, created_at')
          .in('offer_id', offerIds)
      : { data: [] }

  const redeemedUserIds = [
    ...new Set((redemptions ?? []).map((redemption) => redemption.user_id)),
  ]

  const { data: redeemedProfiles } =
    redeemedUserIds.length > 0
      ? await supabase
          .from('profiles')
          .select('id,email')
          .in('id', redeemedUserIds)
      : { data: [] }

  const redemptionCountByOfferId = new Map<string, number>()

  for (const redemption of redemptions ?? []) {
    redemptionCountByOfferId.set(
      redemption.offer_id,
      (redemptionCountByOfferId.get(redemption.offer_id) ?? 0) + 1
    )
  }

  const totalRedemptions = (redemptions ?? []).length

  const activeOffers = (offers ?? []).filter(
    (offer) =>
      offer.is_active !== false &&
      (!offer.ends_at || new Date(offer.ends_at) >= new Date())
  )

  const ACTIVE_OFFER_LIMIT = 3
  const hasReachedLimit = activeOffers.length >= ACTIVE_OFFER_LIMIT

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
    (redeemedProfiles ?? []).map((profile) => [
      profile.id,
      profile.email || 'Unknown user',
    ])
  )

  const redemptionsByOfferId = new Map<
    string,
    { user_id: string; created_at: string }[]
  >()

  for (const redemption of redemptions ?? []) {
    const existing = redemptionsByOfferId.get(redemption.offer_id) ?? []

    existing.push({
      user_id: redemption.user_id,
      created_at: redemption.created_at,
    })

    redemptionsByOfferId.set(redemption.offer_id, existing)
  }

  return (
    <BusinessDashboardContent
      profile={profile}
      offers={offers ?? []}
      totalRedemptions={totalRedemptions}
      activeOffersCount={activeOffers.length}
      activeOfferLimit={ACTIVE_OFFER_LIMIT}
      hasReachedLimit={hasReachedLimit}
      topOfferTitle={topOffer?.title || ''}
      topOfferCount={topOfferCount}
      redemptionCountByOfferId={Object.fromEntries(redemptionCountByOfferId)}
      redemptionsByOfferId={Object.fromEntries(redemptionsByOfferId)}
      profileEmailById={profileEmailById}
      viewCount={viewCount}
      clickCount={clickCount}
      conversionRate={conversionRate}
    />
  )
}

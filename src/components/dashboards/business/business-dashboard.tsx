import { createClient } from '@/lib/supabase/server'
import BusinessDashboardContent from './business-dashboard-content'

export default async function BusinessDashboard() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  // =========================================
  // 🏪 FETCH BUSINESS PROFILE
  // =========================================

  const { data: profile } = await supabase
    .from('profiles')
    .select(
      'business_name, phone, address, google_maps_url, logo_url, website_url, display_name'
    )
    .eq('id', user.id)
    .single()

  // =========================================
  // 📦 FETCH OFFERS
  // =========================================

  const { data: offers } = await supabase
    .from('offers')
    .select('*')
    .eq('business_id', user.id)
    .order('created_at', { ascending: false })

  const offerIds = (offers ?? []).map((offer) => offer.id)

  // =========================================
  // 📊 ANALYTICS
  // =========================================

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

  // =========================================
  // 🎟️ FETCH REDEMPTIONS
  // =========================================

  const { data: redemptions } = await supabase
    .from('redemptions')
    .select('offer_id, user_id, created_at')

  const redeemedUserIds = [
    ...new Set((redemptions ?? []).map((r) => r.user_id)),
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
  const hasReachedLimit =
    activeOffers.length >= ACTIVE_OFFER_LIMIT

  let topOfferId: string | null = null
  let topOfferCount = 0

  for (const [offerId, count] of redemptionCountByOfferId.entries()) {
    if (count > topOfferCount) {
      topOfferId = offerId
      topOfferCount = count
    }
  }

  const topOffer = (offers ?? []).find(
    (offer) => offer.id === topOfferId
  )

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
    const existing =
      redemptionsByOfferId.get(redemption.offer_id) ?? []

    existing.push({
      user_id: redemption.user_id,
      created_at: redemption.created_at,
    })

    redemptionsByOfferId.set(
      redemption.offer_id,
      existing
    )
  }

  return (
    <>
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5 text-center">
          <p className="text-sm text-blue-600">
            Total Views
          </p>

          <p className="mt-1 text-2xl font-bold text-blue-800">
            {viewCount}
          </p>
        </div>

        <div className="rounded-2xl border border-green-100 bg-green-50 p-5 text-center">
          <p className="text-sm text-green-600">
            Total Clicks
          </p>

          <p className="mt-1 text-2xl font-bold text-green-800">
            {clickCount}
          </p>
        </div>

        <div className="rounded-2xl border border-yellow-100 bg-yellow-50 p-5 text-center">
          <p className="text-sm text-yellow-600">
            Conversion Rate
          </p>

          <p className="mt-1 text-2xl font-bold text-yellow-800">
            {conversionRate}%
          </p>
        </div>
      </div>

      <BusinessDashboardContent
        profile={profile}
        offers={offers ?? []}
        totalRedemptions={totalRedemptions}
        activeOffersCount={activeOffers.length}
        activeOfferLimit={ACTIVE_OFFER_LIMIT}
        hasReachedLimit={hasReachedLimit}
        topOfferTitle={topOffer?.title || ''}
        topOfferCount={topOfferCount}
        redemptionCountByOfferId={Object.fromEntries(
          redemptionCountByOfferId
        )}
        redemptionsByOfferId={Object.fromEntries(
          redemptionsByOfferId
        )}
        profileEmailById={profileEmailById}
      />
    </>
  )
}
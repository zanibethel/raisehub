import AddOfferForm from '../components/add-offer-form'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import LogoutButton from '@/app/components/logout-button'
import SaveOfferButton from '../components/save-offer-button'
import RemoveSavedOfferButton from '../components/remove-saved-offer-button'
import AvailableOffersSection from '../components/available-offers-section'
import BusinessProfileCard from '../components/business-profile-card'
import UseOfferButton from '../components/use-offer-button'
import RedemptionReport from '../components/redemption-report'
import BusinessDashboardContent from '../components/business-dashboard-content'
import CreateCampaignForm from '../components/create-campaign-form'
import BuyCampaignPassButton from '../components/buy-campaign-pass-button'
import Link from 'next/link'
import OrganizationReportToggle from '../components/organization-report-toggle'

type Role = 'customer' | 'business' | 'organization' | 'admin'

type Profile = {
  id: string
  email: string | null
  role: Role
  business_name: string | null
  phone: string | null
  address: string | null
  google_maps_url: string | null
}

type Offer = {
  id: string
  business_id: string
  title: string | null
  description: string | null
  discount: string | null
  starts_at: string | null
  ends_at: string | null
}

function getRoleTheme(role: Role) {
  switch (role) {
    case 'business':
      return {
        title: 'Business Dashboard',
        badge: 'Business',
        badgeClass:
          'border border-green-200 bg-green-50 text-green-700',
        headingClass: 'text-green-700',
        panelClass:
          'border border-green-100 bg-white/90 shadow-xl backdrop-blur',
        intro:
          'Manage offers, track redemptions, and grow local visibility.',
      }
    case 'organization':
      return {
        title: 'Organization Dashboard',
        badge: 'Organization',
        badgeClass:
          'border border-blue-200 bg-blue-50 text-blue-700',
        headingClass: 'text-blue-700',
        panelClass:
          'border border-blue-100 bg-white/90 shadow-xl backdrop-blur',
        intro:
          'Track fundraising progress, supporters, and business partners.',
      }
    case 'admin':
      return {
        title: 'Admin Dashboard',
        badge: 'Admin',
        badgeClass:
          'border border-gray-300 bg-gray-100 text-gray-800',
        headingClass: 'text-gray-800',
        panelClass:
          'border border-gray-200 bg-white/90 shadow-xl backdrop-blur',
        intro:
          'Manage platform activity, users, and campaigns.',
      }
    default:
      return {
        title: 'Customer Dashboard',
        badge: 'Customer',
        badgeClass:
          'border border-yellow-200 bg-yellow-50 text-yellow-700',
        headingClass: 'text-yellow-600',
        panelClass:
          'border border-yellow-100 bg-white/90 shadow-xl backdrop-blur',
        intro:
          'View your passes, savings, and favorite local businesses.',
      }
  }
}

async function CustomerDashboard() {
  const supabase = await createClient()
  const now = new Date().toISOString()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: offers } = await supabase
    .from('offers')
    .select('*')
    .lte('starts_at', now)
    .gte('ends_at', now)
    .order('created_at', { ascending: false })

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, business_name, phone, address, google_maps_url')

  const { data: savedOffers } = await supabase
    .from('saved_offers')
    .select('id, offer_id')
    .eq('user_id', user.id)

  const { data: redemptions } = await supabase
  .from('redemptions')
  .select('offer_id, created_at')
  .eq('user_id', user.id)

  const savedOfferIds = new Set((savedOffers ?? []).map((item) => item.offer_id))
  const redeemedOfferIds = new Set((redemptions ?? []).map((item) => item.offer_id))

const redemptionDateByOfferId = new Map(
  (redemptions ?? []).map((item) => [item.offer_id, item.created_at])
)
  const profileById = new Map(
    (profiles ?? []).map((profile) => [
      profile.id,
      {
        name: profile.business_name || 'Local Business',
        phone: profile.phone || '',
        address: profile.address || '',
        map: profile.google_maps_url || '',
      },
    ])
  )

  const enrichedOffers = (offers ?? []).map((offer) => {
    const business = profileById.get(offer.business_id)

    return {
      ...offer,
      business_name: business?.name || 'Local Business',
      phone: business?.phone || '',
      address: business?.address || '',
      google_maps_url: business?.map || '',
    }
  })

  return (
    <div className="mt-8 space-y-8">
      <section>
        <div className="rounded-3xl border border-green-100 bg-white/90 p-8 shadow-xl backdrop-blur">
          <h2 className="text-2xl font-semibold text-green-700">My Pass</h2>
          <p className="mt-2 text-sm text-gray-600">
            Your saved offers ready to use.
          </p>
        </div>

        <div className="mt-6">
          {savedOffers && savedOffers.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-3">
              {enrichedOffers
                .filter((offer) => savedOfferIds.has(offer.id))
                .map((offer) => (
                  <div
                    key={offer.id}
                    className="rounded-2xl border border-green-100 bg-white/90 p-6 shadow-xl backdrop-blur"
                  >
                    <p className="text-xs font-medium uppercase tracking-wide text-green-700">
                      {offer.business_name}
                    </p>

                    <h3 className="mt-2 text-lg font-semibold text-green-700">
                      {offer.title}
                    </h3>

                    <p className="mt-1 text-sm text-gray-500">
                      {offer.discount}
                    </p>

                    <p className="mt-2 text-sm text-gray-600">
                      {offer.description}
                    </p>

                    <div className="mt-3 space-y-1 text-xs text-gray-500">
                      {offer.phone && <p>📞 {offer.phone}</p>}
                      {offer.address && <p>📍 {offer.address}</p>}
                      {offer.google_maps_url && (
                        <a
                          href={offer.google_maps_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-green-700 underline"
                        >
                          View Map
                        </a>
                      )}
                    </div>

                    <div className="mt-4 space-y-1 text-xs text-gray-500">
                      <p>
                        Ends:{' '}
                        {offer.ends_at
                          ? new Date(offer.ends_at).toLocaleDateString()
                          : '—'}
                      </p>
                    </div>

                    {redeemedOfferIds.has(offer.id) ? (
  <div className="mt-4 rounded-lg bg-gray-100 px-4 py-3 text-center">
    <p className="text-sm font-medium text-gray-700">✅ Used</p>
    <p className="mt-1 text-xs text-gray-500">
      Used on:{' '}
      {redemptionDateByOfferId.get(offer.id)
        ? new Date(
            redemptionDateByOfferId.get(offer.id) as string
          ).toLocaleString()
        : 'Unknown date'}
    </p>
  </div>
) : (
  <UseOfferButton offerId={offer.id} />
)}
                  </div>
                ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-green-100 bg-white/90 p-6 shadow-xl backdrop-blur">
              <p className="text-sm text-gray-600">
                You haven’t saved any offers yet.
              </p>
            </div>
          )}
        </div>
      </section>

      <AvailableOffersSection
        offers={enrichedOffers}
        savedOfferIds={[...savedOfferIds]}
      />
    </div>
  )
}

async function BusinessDashboard() {
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

  const offerIds = (offers ?? []).map((o) => o.id)

  // =========================================
  // 📊 ANALYTICS (NEW)
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

  const redeemedUserIds = [...new Set((redemptions ?? []).map((r) => r.user_id))]

  const { data: redeemedProfiles } =
    redeemedUserIds.length > 0
      ? await supabase
          .from('profiles')
          .select('id, email')
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
    (offer) => !offer.ends_at || new Date(offer.ends_at) >= new Date()
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
    <>
      {/* =========================================
          📊 ANALYTICS SUMMARY (NEW UI BLOCK)
      ========================================= */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5 text-center">
          <p className="text-sm text-blue-600">Total Views</p>
          <p className="mt-1 text-2xl font-bold text-blue-800">
            {viewCount}
          </p>
        </div>

        <div className="rounded-2xl border border-green-100 bg-green-50 p-5 text-center">
          <p className="text-sm text-green-600">Total Clicks</p>
          <p className="mt-1 text-2xl font-bold text-green-800">
            {clickCount}
          </p>
        </div>

        <div className="rounded-2xl border border-yellow-100 bg-yellow-50 p-5 text-center">
          <p className="text-sm text-yellow-600">Conversion Rate</p>
          <p className="mt-1 text-2xl font-bold text-yellow-800">
            {conversionRate}%
          </p>
        </div>
      </div>

      {/* =========================================
          📦 EXISTING DASHBOARD CONTENT
      ========================================= */}
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
      />
    </>
  )
}

async function OrganizationDashboard() {
  const supabase = await createClient()

  // =========================================
  // 🔐 AUTH CHECK
  // =========================================
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  // =========================================
  // 📦 FETCH CAMPAIGNS
  // =========================================
  const { data: campaigns } = await supabase
    .from('campaigns')
    .select('*')
    .eq('organization_id', user.id)
    .order('created_at', { ascending: false })

  const totalCampaigns = campaigns?.length ?? 0
  const activeCampaigns =
    campaigns?.filter((campaign) => campaign.status === 'active').length ?? 0

  const totalGoal =
    campaigns?.reduce(
      (sum, campaign) => sum + Number(campaign.goal_amount ?? 0),
      0
    ) ?? 0

  // =========================================
  // 💰 FETCH PURCHASE ANALYTICS
  // =========================================
  const campaignIds = (campaigns ?? []).map((campaign) => campaign.id)

  let purchases: {
    campaign_id: string
    amount_paid: number
    platform_fee: number
    organization_earnings: number
  }[] = []

  if (campaignIds.length > 0) {
    const { data } = await supabase
      .from('campaign_purchases')
      .select('campaign_id, amount_paid, platform_fee, organization_earnings')
      .in('campaign_id', campaignIds)

    purchases = data ?? []
  }

  const totalPassesSold = purchases.length

  const grossRevenue = purchases.reduce(
    (sum, purchase) => sum + Number(purchase.amount_paid ?? 0),
    0
  )

  const totalFees = purchases.reduce(
    (sum, purchase) => sum + Number(purchase.platform_fee ?? 0),
    0
  )

  const totalEarnings = purchases.reduce(
    (sum, purchase) => sum + Number(purchase.organization_earnings ?? 0),
    0
  )

  const metricsByCampaign = new Map<
    string,
    { sold: number; gross: number; fees: number; earnings: number }
  >()

  for (const purchase of purchases) {
    const existing = metricsByCampaign.get(purchase.campaign_id) ?? {
      sold: 0,
      gross: 0,
      fees: 0,
      earnings: 0,
    }

    existing.sold += 1
    existing.gross += Number(purchase.amount_paid ?? 0)
    existing.fees += Number(purchase.platform_fee ?? 0)
    existing.earnings += Number(purchase.organization_earnings ?? 0)

    metricsByCampaign.set(purchase.campaign_id, existing)
  }

  return (
    <div className="mt-8 space-y-8">
{/* =========================================
    📊 ORGANIZATION MAIN SCOREBOARD
========================================= */}
<div className="grid gap-4 md:grid-cols-4">
  <div className="rounded-2xl border border-green-100 bg-green-50 p-6 shadow-xl">
    <p className="text-sm text-green-600">Passes Sold</p>
    <p className="mt-2 text-3xl font-bold text-green-800">
      {totalPassesSold}
    </p>
  </div>

  <div className="rounded-2xl border border-purple-100 bg-purple-50 p-6 shadow-xl">
    <p className="text-sm text-purple-600">Organization Earned</p>
    <p className="mt-2 text-3xl font-bold text-purple-800">
      ${totalEarnings.toLocaleString()}
    </p>
  </div>

  <div className="rounded-2xl border border-blue-100 bg-white/90 p-6 shadow-xl backdrop-blur">
    <p className="text-sm text-blue-600">Active Campaigns</p>
    <p className="mt-2 text-3xl font-bold text-blue-700">
      {activeCampaigns}
    </p>
  </div>

  <div className="rounded-2xl border border-blue-100 bg-white/90 p-6 shadow-xl backdrop-blur">
    <p className="text-sm text-blue-600">Total Goals</p>
    <p className="mt-2 text-3xl font-bold text-blue-700">
      ${totalGoal.toLocaleString()}
    </p>
  </div>
</div>

{/* =========================================
    📋 OPTIONAL DETAILS / REPORT
========================================= */}
<OrganizationReportToggle
  grossRevenue={grossRevenue}
  totalFees={totalFees}
  totalEarnings={totalEarnings}
  totalPassesSold={totalPassesSold}
/>

      {/* =========================================
          📝 CREATE CAMPAIGN FORM
      ========================================= */}
      <CreateCampaignForm />

      {/* =========================================
          📋 CAMPAIGN LIST
      ========================================= */}
      <div className="rounded-2xl border border-blue-100 bg-white/90 p-6 shadow-xl backdrop-blur">
        <h2 className="text-lg font-semibold text-blue-700">My Campaigns</h2>

        {campaigns && campaigns.length > 0 ? (
          <div className="mt-4 grid gap-4">
            {campaigns.map((campaign) => {
              const metrics = metricsByCampaign.get(campaign.id) ?? {
                sold: 0,
                gross: 0,
                fees: 0,
                earnings: 0,
              }

              const goal = Number(campaign.goal_amount ?? 0)
              const progress =
                goal > 0 ? Math.min((metrics.earnings / goal) * 100, 100) : 0

              return (
                <div
                  key={campaign.id}
                  className="rounded-xl border border-blue-100 bg-blue-50 p-4"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">
                        {campaign.name}
                      </h3>

                      <p className="mt-1 text-sm text-gray-600">
                        {campaign.description || 'No description yet.'}
                      </p>

                      <p className="mt-2 text-sm text-gray-600">
                        Pass price: ${Number(campaign.pass_price ?? 0)}
                      </p>

                      <p className="text-sm text-gray-600">
                        Goal: ${goal.toLocaleString()}
                      </p>

                      {/* =========================================
                          📊 CAMPAIGN PERFORMANCE
                      ========================================= */}
                      <div className="mt-4 space-y-2">
                        <p className="text-sm text-gray-700">
                          Sold:{' '}
                          <span className="font-semibold">{metrics.sold}</span>
                        </p>

                        <p className="text-sm text-gray-700">
                          Earned:{' '}
                          <span className="font-semibold">
                            ${metrics.earnings.toLocaleString()}
                          </span>
                        </p>

                        <div className="h-2 w-full rounded-full bg-gray-200">
                          <div
                            className="h-2 rounded-full bg-blue-600 transition-all"
                            style={{ width: `${progress}%` }}
                          />
                        </div>

                        <p className="text-xs text-gray-500">
                          {progress.toFixed(1)}% of ${goal.toLocaleString()} goal
                        </p>
                      </div>

                      {/* =========================================
    🔗 PUBLIC CAMPAIGN LINK + TEST BUY BUTTON
========================================= */}
<div className="mt-4 space-y-3">
  <BuyCampaignPassButton
    campaignId={campaign.id}
    passPrice={Number(campaign.pass_price ?? 0)}
  />

  <Link
    href={`/campaigns/${campaign.id}`}
    className="inline-flex text-sm font-medium text-blue-700 underline"
  >
    View public campaign page
  </Link>
</div>
                      
                    </div>

                    <span className="rounded-full bg-blue-600 px-3 py-1 text-xs font-medium capitalize text-white">
                      {campaign.status}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="mt-4 text-sm text-gray-600">
            No campaigns created yet.
          </p>
        )}
      </div>
    </div>
  )
}

function AdminDashboard() {
  return (
    <div className="mt-8 grid gap-4 md:grid-cols-3">
      <div className="rounded-2xl border border-gray-200 bg-white/90 p-6 shadow-xl backdrop-blur">
        <h2 className="text-lg font-semibold text-gray-800">Users</h2>
        <p className="mt-2 text-sm text-gray-600">
          Manage users, businesses, and organizations.
        </p>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white/90 p-6 shadow-xl backdrop-blur">
        <h2 className="text-lg font-semibold text-gray-800">Campaigns</h2>
        <p className="mt-2 text-sm text-gray-600">
          Review active fundraiser campaigns.
        </p>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white/90 p-6 shadow-xl backdrop-blur">
        <h2 className="text-lg font-semibold text-gray-800">Platform settings</h2>
        <p className="mt-2 text-sm text-gray-600">
          Configure platform-wide behavior here.
        </p>
      </div>
    </div>
  )
}

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email, role')
    .eq('id', user.id)
    .single<Profile>()

  const role: Role = profile?.role ?? 'customer'
  const theme = getRoleTheme(role)

  return (
    <main className="min-h-screen bg-[#F0F6FF] p-8">
      <div className="mx-auto max-w-5xl">
        <div className={`rounded-3xl p-8 ${theme.panelClass}`}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div
                className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${theme.badgeClass}`}
              >
                {theme.badge}
              </div>

              <h1 className={`mt-4 text-3xl font-bold ${theme.headingClass}`}>
                {theme.title}
              </h1>

              <p className="mt-2 text-gray-600">{theme.intro}</p>
              <p className="mt-2 text-sm text-gray-500">Signed in as {user.email}</p>
            </div>

            <div className="sm:pt-1">
              <LogoutButton />
            </div>
          </div>
        </div>

        {role === 'customer' && <CustomerDashboard />}
        {role === 'business' && <BusinessDashboard />}
        {role === 'organization' && <OrganizationDashboard />}
        {role === 'admin' && <AdminDashboard />}
      </div>
    </main>
  )
}
import Link from 'next/link'

import { WorkspaceModule } from '@/components/workspace/workspace-module'
import { getRedemptionAvailability } from '@/lib/redemption-rules'
import { getCustomerPassAccess } from '@/lib/services/customer-pass-access-service'
import { createClient } from '@/lib/supabase/server'

import CustomerActivityContent from './customer-activity-content'
import CustomerDashboardContent from './customer-dashboard-content'
import CustomerDigitalPass from './customer-digital-pass'
import CustomerWorkspaceFrame, {
  type CustomerWorkspaceView,
} from './customer-workspace-frame'

import type {
  CustomerDashboardOffer,
  OrganizationLookup,
  PurchasedPass,
} from '@/types/customer-dashboard'

type CustomerDashboardProps = {
  customerProfileId?: string | null
  view?: CustomerWorkspaceView
}

type LegacyBusinessProfile = {
  name: string
  phone: string
  address: string
  map: string
}

type CanonicalBusinessLocation = {
  legacy_profile_id: string | null
  status: string
  name: string
  phone: string | null
  address: string | null
  latitude: number | null
  longitude: number | null
  location_source: string | null
  google_place_id: string | null
  google_business_name: string | null
  google_formatted_address: string | null
  google_phone: string | null
  google_website_url: string | null
  google_maps_url: string | null
  google_primary_category: string | null
  google_rating: number | null
  google_review_count: number | null
}

export default async function CustomerDashboard({
  customerProfileId,
  view = 'dashboard',
}: CustomerDashboardProps = {}) {
  const supabase = await createClient()
  const nowDate = new Date()
  const now = nowDate.toISOString()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const resolvedCustomerProfileId = customerProfileId?.trim() || user.id
  const passAccess = await getCustomerPassAccess(resolvedCustomerProfileId, nowDate)
  const activeEntitlement = passAccess.activeEntitlement
  const hasPurchasedPass = passAccess.hasActivePass

  const { data: purchasedPassesData } = await supabase
    .from('campaign_purchases')
    .select(`
      id,
      campaign_id,
      selected_organization_id,
      created_at,
      amount_paid,
      donation_amount,
      campaigns (
        id,
        name,
        description
      )
    `)
    .eq('user_id', resolvedCustomerProfileId)
    .order('created_at', { ascending: false })

  const purchasedPasses = (purchasedPassesData ?? []) as PurchasedPass[]
  const organizationIds = [
    ...new Set(
      purchasedPasses
        .map((purchase) => purchase.selected_organization_id)
        .filter((organizationId): organizationId is string => Boolean(organizationId))
    ),
  ]

  const { data: organizationProfiles } = organizationIds.length > 0
    ? await supabase
        .from('profiles')
        .select('id, business_name, display_name')
        .in('id', organizationIds)
    : { data: [] }

  const organizationById = new Map<string, OrganizationLookup>(
    (organizationProfiles ?? []).map((organization) => [
      organization.id,
      {
        business_name: organization.business_name,
        display_name: organization.display_name,
      },
    ])
  )

  const activePassPurchase = activeEntitlement?.purchase_id
    ? purchasedPasses.find((purchase) => purchase.id === activeEntitlement.purchase_id) ?? null
    : null

  const activePassOrganization = activePassPurchase?.selected_organization_id
    ? organizationById.get(activePassPurchase.selected_organization_id)
    : undefined

  const supportedOrganizationName =
    activePassOrganization?.display_name || activePassOrganization?.business_name || null
  const supportedCampaignName = activePassPurchase?.campaigns?.name || null

  const { data: offers } = await supabase
    .from('offers')
    .select('*')
    .eq('is_active', true)
    .or(`starts_at.is.null,starts_at.lte.${now}`)
    .or(`ends_at.is.null,ends_at.gte.${now}`)
    .order('created_at', { ascending: false })

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, business_name, phone, address, google_maps_url')

  const profileById = new Map<string, LegacyBusinessProfile>(
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

  const { data: canonicalBusinessesData } = await supabase
    .from('businesses')
    .select(`
      legacy_profile_id,
      status,
      name,
      phone,
      address,
      latitude,
      longitude,
      location_source,
      google_place_id,
      google_business_name,
      google_formatted_address,
      google_phone,
      google_website_url,
      google_maps_url,
      google_primary_category,
      google_rating,
      google_review_count
    `)

  const canonicalBusinesses =
    (canonicalBusinessesData ?? []) as unknown as CanonicalBusinessLocation[]
  const canonicalBusinessByLegacyProfileId =
    new Map<string, CanonicalBusinessLocation>()

  for (const business of canonicalBusinesses) {
    if (business.legacy_profile_id) {
      canonicalBusinessByLegacyProfileId.set(business.legacy_profile_id, business)
    }
  }

  const { data: savedOffers } = await supabase
    .from('saved_offers')
    .select('id, offer_id')
    .eq('user_id', resolvedCustomerProfileId)

  const savedOfferIds = new Set(
    (savedOffers ?? []).map((savedOffer) => savedOffer.offer_id)
  )

  const { data: redemptions } = await supabase
    .from('redemptions')
    .select('offer_id, created_at')
    .eq('user_id', resolvedCustomerProfileId)
    .order('created_at', { ascending: true })

  const redeemedOfferIds = new Set(
    (redemptions ?? []).map((redemption) => redemption.offer_id)
  )
  const redemptionDateByOfferId = new Map<string, string>()

  for (const redemption of redemptions ?? []) {
    if (redemption.offer_id && redemption.created_at) {
      redemptionDateByOfferId.set(
        redemption.offer_id,
        redemption.created_at
      )
    }
  }

  type OfferRow = NonNullable<typeof offers>[number]

  function enrichOffer(offer: OfferRow): CustomerDashboardOffer {
    const legacyBusiness = profileById.get(offer.business_id)
    const canonicalBusiness = canonicalBusinessByLegacyProfileId.get(offer.business_id)

    return {
      ...offer,
      business_name:
        canonicalBusiness?.name ||
        canonicalBusiness?.google_business_name ||
        legacyBusiness?.name ||
        'Local Business',
      phone:
        canonicalBusiness?.phone ||
        canonicalBusiness?.google_phone ||
        legacyBusiness?.phone ||
        '',
      address:
        canonicalBusiness?.address ||
        canonicalBusiness?.google_formatted_address ||
        legacyBusiness?.address ||
        '',
      google_maps_url:
        canonicalBusiness?.google_maps_url || legacyBusiness?.map || '',
      business_latitude: canonicalBusiness?.latitude ?? null,
      business_longitude: canonicalBusiness?.longitude ?? null,
      business_location_source: canonicalBusiness?.location_source ?? null,
      google_place_id: canonicalBusiness?.google_place_id ?? null,
      google_business_name: canonicalBusiness?.google_business_name ?? null,
      google_primary_category: canonicalBusiness?.google_primary_category ?? null,
      google_rating: canonicalBusiness?.google_rating ?? null,
      google_review_count: canonicalBusiness?.google_review_count ?? null,
      google_website_url: canonicalBusiness?.google_website_url ?? null,
    }
  }

  // Legacy offers without a canonical business workspace remain visible for
  // backwards compatibility. Once a canonical workspace exists, its lifecycle
  // status controls whether its offers appear to customers.
  const customerVisibleOfferRows = (offers ?? []).filter((offer) => {
    const canonicalBusiness = canonicalBusinessByLegacyProfileId.get(offer.business_id)
    return !canonicalBusiness || canonicalBusiness.status === 'active'
  })
  const activeOfferIds = new Set(customerVisibleOfferRows.map((offer) => offer.id))
  const enrichedOffers = customerVisibleOfferRows.map(enrichOffer)

  const redeemableOfferIds = new Set(
    enrichedOffers
      .filter((offer) =>
        getRedemptionAvailability({
          usageRule: offer.usage_rule,
          lastRedeemedAt: redemptionDateByOfferId.get(offer.id),
          now: nowDate,
        }).canRedeem
      )
      .map((offer) => offer.id)
  )

  const historicalOfferIds = [...redeemedOfferIds].filter(
    (offerId) => !activeOfferIds.has(offerId)
  )

  const { data: historicalOffersData } = historicalOfferIds.length > 0
    ? await supabase
        .from('offers')
        .select('*')
        .in('id', historicalOfferIds)
        .order('created_at', { ascending: false })
    : { data: [] }

  const historicalOffers = (historicalOffersData ?? []).map(enrichOffer)
  const availableOfferCount = redeemableOfferIds.size
  const totalRedemptionCount = redemptions?.length ?? 0

  const digitalPass = (
    <CustomerDigitalPass
      hasActivePass={hasPurchasedPass}
      entitlementType={activeEntitlement?.entitlement_type}
      startsAt={activeEntitlement?.starts_at}
      expiresAt={activeEntitlement?.expires_at}
      supportedOrganizationName={supportedOrganizationName}
      supportedCampaignName={supportedCampaignName}
      availableOfferCount={availableOfferCount}
    />
  )

  return (
    <CustomerWorkspaceFrame
      view={view}
      customerEmail={user.email}
      hasActivePass={hasPurchasedPass}
      availableOfferCount={availableOfferCount}
    >
      {view === 'activity' ? (
        <CustomerActivityContent
          purchasedPasses={purchasedPasses}
          organizationById={organizationById}
          enrichedOffers={enrichedOffers}
          historicalOffers={historicalOffers}
          redeemedOfferIds={redeemedOfferIds}
          redemptionDateByOfferId={redemptionDateByOfferId}
        />
      ) : view === 'deals' ? (
        <>
          <div className="mt-5 sm:mt-6">{digitalPass}</div>
          <CustomerDashboardContent
            purchasedPasses={purchasedPasses}
            organizationById={organizationById}
            enrichedOffers={enrichedOffers}
            historicalOffers={historicalOffers}
            savedOfferIds={savedOfferIds}
            redeemedOfferIds={redeemedOfferIds}
            redeemableOfferIds={redeemableOfferIds}
            redemptionDateByOfferId={redemptionDateByOfferId}
            hasPurchasedPass={hasPurchasedPass}
          />
        </>
      ) : (
        <div className="mt-5 space-y-5 sm:mt-6 sm:space-y-6">
          {digitalPass}

          <div className="grid gap-4 sm:grid-cols-3">
            <WorkspaceModule title="Saved deals" tone="blue">
              <p className="text-3xl font-black text-slate-950">{savedOfferIds.size}</p>
              <p className="mt-1 text-sm text-slate-500">Offers saved to your pass</p>
            </WorkspaceModule>
            <WorkspaceModule title="Redemptions" tone="green">
              <p className="text-3xl font-black text-slate-950">{totalRedemptionCount}</p>
              <p className="mt-1 text-sm text-slate-500">Total offer uses recorded</p>
            </WorkspaceModule>
            <WorkspaceModule title="Fundraisers supported" tone="amber">
              <p className="text-3xl font-black text-slate-950">{purchasedPasses.length}</p>
              <p className="mt-1 text-sm text-slate-500">Pass purchases recorded</p>
            </WorkspaceModule>
          </div>

          <WorkspaceModule
            title="What would you like to do?"
            description="Open a focused page instead of searching through one long dashboard."
            tone="slate"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <Link
                href="/dashboard/deals"
                className="rounded-2xl border border-blue-200 bg-blue-50 p-4 font-bold text-blue-800"
              >
                Browse and manage deals →
              </Link>
              <Link
                href="/dashboard/activity"
                className="rounded-2xl border border-green-200 bg-green-50 p-4 font-bold text-green-800"
              >
                Review savings and activity →
              </Link>
            </div>
          </WorkspaceModule>
        </div>
      )}
    </CustomerWorkspaceFrame>
  )
}

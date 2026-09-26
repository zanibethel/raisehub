import {
  applyEnvironmentScope,
  getActiveDataEnvironment,
  type EnvironmentOwnedRecord,
} from '@/lib/data-environment'
import { getRedemptionAvailability } from '@/lib/redemption-rules'
import { getCustomerPassAccess } from '@/lib/services/customer-pass-access-service'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

import CustomerActivityContent from './customer-activity-content'
import CustomerDashboardContent from './customer-dashboard-content'
import CustomerCommandCenter from './customer-command-center'
import CustomerWorkspaceFrame, {
  type CustomerWorkspaceView,
} from './customer-workspace-frame'

import type { CustomerRedemptionEvent } from './customer-redemption-history'
import type {
  CustomerDashboardOffer,
  OrganizationLookup,
  PurchasedPass,
} from '@/types/customer-dashboard'

type CustomerDashboardProps = {
  customerProfileId?: string | null
  view?: CustomerWorkspaceView
}

type LegacyBusinessProfile = EnvironmentOwnedRecord & {
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
  const environment = getActiveDataEnvironment()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const admin = createAdminClient()
  const finalizeDueRedemptionsPromise = (async () => {
    try {
      await (admin as any).rpc('finalize_due_redemptions')
    } catch (error) {
      console.error(
        'Unable to finalize due redemptions without blocking customer dashboard:',
        error
      )
    }
  })()

  const resolvedCustomerProfileId = customerProfileId?.trim() || user.id

  const passAccessPromise = getCustomerPassAccess(
    resolvedCustomerProfileId,
    nowDate
  )
  const purchasedPassesPromise = supabase
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

  const offersQuery = supabase
    .from('offers')
    .select('*')
    .eq('is_active', true)
    .or(`starts_at.is.null,starts_at.lte.${now}`)
    .or(`ends_at.is.null,ends_at.gte.${now}`)
    .order('created_at', { ascending: false })

  const profilesQuery = admin
    .from('profiles')
    .select(
      'id, business_name, display_name, phone, address, google_maps_url, is_demo, demo_group'
    )

  const canonicalBusinessesQuery = admin
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
      google_review_count,
      is_demo,
      demo_group
    `)

  const savedOffersQuery = supabase
    .from('saved_offers')
    .select('id, offer_id, is_demo, demo_group')
    .eq('user_id', resolvedCustomerProfileId)

  const [
    passAccessResult,
    purchasedPassesResult,
    offersResult,
    profilesResult,
    canonicalBusinessesResult,
    savedOffersResult,
  ] = await Promise.all([
    Promise.allSettled([passAccessPromise]),
    purchasedPassesPromise,
    applyEnvironmentScope(offersQuery, environment),
    applyEnvironmentScope(profilesQuery, environment),
    applyEnvironmentScope(canonicalBusinessesQuery, environment),
    applyEnvironmentScope(savedOffersQuery, environment),
  ])

  const passAccess =
    passAccessResult[0].status === 'fulfilled'
      ? passAccessResult[0].value
      : { activeEntitlement: null, hasActivePass: false }

  if (passAccessResult[0].status === 'rejected') {
    console.error(
      'Unable to load pass access without blocking customer dashboard:',
      passAccessResult[0].reason
    )
  }

  const activeEntitlement = passAccess.activeEntitlement
  const hasPurchasedPass = passAccess.hasActivePass
  const purchasedPasses = (purchasedPassesResult.data ?? []) as PurchasedPass[]
  const offers = offersResult.data
  const profiles = profilesResult.data
  const canonicalBusinessesData = canonicalBusinessesResult.data
  const savedOffers = savedOffersResult.data

  const organizationIds = [
    ...new Set(
      purchasedPasses
        .map((purchase) => purchase.selected_organization_id)
        .filter(
          (organizationId): organizationId is string =>
            Boolean(organizationId)
        )
    ),
  ]

  const organizationProfilesPromise =
    organizationIds.length > 0
      ? admin
          .from('profiles')
          .select('id, business_name, display_name')
          .in('id', organizationIds)
      : Promise.resolve({ data: [] })

  const profileById = new Map<string, LegacyBusinessProfile>(
    (profiles ?? []).map((profile) => [
      profile.id,
      {
        name:
          profile.display_name ||
          profile.business_name ||
          'Local Business',
        phone: profile.phone || '',
        address: profile.address || '',
        map: profile.google_maps_url || '',
        is_demo: profile.is_demo,
        demo_group: profile.demo_group,
      },
    ])
  )

  const canonicalBusinesses =
    (canonicalBusinessesData ?? []) as unknown as CanonicalBusinessLocation[]
  const canonicalBusinessByLegacyProfileId =
    new Map<string, CanonicalBusinessLocation>()

  for (const business of canonicalBusinesses) {
    if (business.legacy_profile_id) {
      canonicalBusinessByLegacyProfileId.set(
        business.legacy_profile_id,
        business
      )
    }
  }

  const savedOfferIds = new Set(
    (savedOffers ?? []).map((savedOffer) => savedOffer.offer_id)
  )

  const [organizationProfilesResult] = await Promise.all([
    organizationProfilesPromise,
    finalizeDueRedemptionsPromise,
  ])
  const organizationProfiles = organizationProfilesResult.data

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
    ? purchasedPasses.find(
        (purchase) => purchase.id === activeEntitlement.purchase_id
      ) ?? null
    : null

  const activePassOrganization = activePassPurchase?.selected_organization_id
    ? organizationById.get(activePassPurchase.selected_organization_id)
    : undefined

  const supportedOrganizationName =
    activePassOrganization?.display_name ||
    activePassOrganization?.business_name ||
    null
  const supportedCampaignName =
    activePassPurchase?.campaigns?.name || null

  const redemptionQuery = (supabase as any)
    .from('redemptions')
    .select(
      'id, offer_id, created_at, status, offer_title_snapshot, benefit_snapshot, customer_value_snapshot, usage_rule_snapshot, confirmation_method, is_demo, demo_group'
    )
    .eq('user_id', resolvedCustomerProfileId)
    .in('status', ['pending', 'confirmed', 'rejected'])
    .order('created_at', { ascending: true })

  const { data: redemptionData } = await applyEnvironmentScope(
    redemptionQuery,
    environment
  )

  const redemptionEvents = (redemptionData ?? []) as CustomerRedemptionEvent[]
  const activeRedemptions = redemptionEvents.filter(
    (redemption) =>
      redemption.status === 'pending' || redemption.status === 'confirmed'
  )
  const confirmedRedemptionEvents = redemptionEvents.filter(
    (redemption) => redemption.status === 'confirmed'
  )

  const redeemedOfferIds = new Set(
    activeRedemptions.map((redemption) => redemption.offer_id)
  )
  const redemptionDateByOfferId = new Map<string, string>()

  for (const redemption of activeRedemptions) {
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
        legacyBusiness?.name ||
        canonicalBusiness?.name ||
        canonicalBusiness?.google_business_name ||
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

  const customerVisibleOfferRows = (offers ?? []).filter((offer) => {
    const legacyBusiness = profileById.get(offer.business_id)
    const canonicalBusiness = canonicalBusinessByLegacyProfileId.get(offer.business_id)

    return Boolean(legacyBusiness || canonicalBusiness) &&
      (!canonicalBusiness || canonicalBusiness.status === 'active')
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

  const historicalOfferIds = [
    ...new Set(redemptionEvents.map((redemption) => redemption.offer_id)),
  ].filter((offerId) => !activeOfferIds.has(offerId))

  const historicalOffersQuery = historicalOfferIds.length > 0
    ? supabase
        .from('offers')
        .select('*')
        .in('id', historicalOfferIds)
        .order('created_at', { ascending: false })
    : null

  const { data: historicalOffersData } = historicalOffersQuery
    ? await applyEnvironmentScope(historicalOffersQuery, environment)
    : { data: [] }

  const historicalOffers = (historicalOffersData ?? []).map(enrichOffer)
  const availableOfferCount = redeemableOfferIds.size
  const totalRedemptionCount = activeRedemptions.length

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
          redemptionEvents={redemptionEvents}
          confirmedRedemptionEvents={confirmedRedemptionEvents}
        />
      ) : view === 'deals' ? (
        <CustomerDashboardContent
          purchasedPasses={purchasedPasses}
          organizationById={organizationById}
          enrichedOffers={enrichedOffers}
          historicalOffers={historicalOffers}
          savedOfferIds={savedOfferIds}
          redeemedOfferIds={redeemedOfferIds}
          redemptionEvents={redemptionEvents}
          confirmedRedemptionEvents={confirmedRedemptionEvents}
          redeemableOfferIds={redeemableOfferIds}
          redemptionDateByOfferId={redemptionDateByOfferId}
          hasPurchasedPass={hasPurchasedPass}
        />
      ) : (
        <CustomerCommandCenter
          customerEmail={user.email}
          hasActivePass={hasPurchasedPass}
          availableOfferCount={availableOfferCount}
          savedOfferCount={savedOfferIds.size}
          totalRedemptionCount={totalRedemptionCount}
          supportedOrganizationName={supportedOrganizationName}
          supportedCampaignName={supportedCampaignName}
          expiresAt={activeEntitlement?.expires_at}
          enrichedOffers={enrichedOffers}
          purchasedPasses={purchasedPasses}
          organizationById={organizationById}
        />
      )}
    </CustomerWorkspaceFrame>
  )
}

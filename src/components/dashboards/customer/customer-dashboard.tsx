import { getCustomerPassAccess } from '@/lib/services/customer-pass-access-service'
import { createClient } from '@/lib/supabase/server'

import CustomerDashboardContent from './customer-dashboard-content'
import CustomerDigitalPass from './customer-digital-pass'

import type {
  CustomerDashboardOffer,
  OrganizationLookup,
  PurchasedPass,
} from '@/types/customer-dashboard'

// =============================================================================
// Types
// =============================================================================

type CustomerDashboardProps = {
  /**
   * Customer profile ID associated with an already-authorized preview or
   * workspace selection.
   *
   * The calling route must verify access before supplying this value. When
   * omitted, the existing customer dashboard behavior uses the authenticated
   * user's ID.
   */
  customerProfileId?: string | null
}

type LegacyBusinessProfile = {
  name: string
  phone: string
  address: string
  map: string
}

type CanonicalBusinessLocation = {
  legacy_profile_id: string | null
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

// =============================================================================
// Customer dashboard loader
// =============================================================================

export default async function CustomerDashboard({
  customerProfileId,
}: CustomerDashboardProps = {}) {
  const supabase = await createClient()
  const nowDate = new Date()
  const now = nowDate.toISOString()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const resolvedCustomerProfileId =
    customerProfileId?.trim() || user.id

  const passAccess =
    await getCustomerPassAccess(
      resolvedCustomerProfileId,
      nowDate
    )

  const activeEntitlement =
    passAccess.activeEntitlement

  const hasPurchasedPass =
    passAccess.hasActivePass

  // ===========================================================================
  // Purchased fundraiser passes
  // ===========================================================================

  const { data: purchasedPassesData } =
    await supabase
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
      .eq(
        'user_id',
        resolvedCustomerProfileId
      )
      .order('created_at', {
        ascending: false,
      })

  const purchasedPasses =
    (purchasedPassesData ??
      []) as PurchasedPass[]

  const organizationIds = [
    ...new Set(
      purchasedPasses
        .map(
          (purchase) =>
            purchase.selected_organization_id
        )
        .filter(
          (
            organizationId
          ): organizationId is string =>
            Boolean(organizationId)
        )
    ),
  ]

  const { data: organizationProfiles } =
    organizationIds.length > 0
      ? await supabase
          .from('profiles')
          .select(
            'id, business_name, display_name'
          )
          .in('id', organizationIds)
      : { data: [] }

  const organizationById = new Map<
    string,
    OrganizationLookup
  >(
    (organizationProfiles ?? []).map(
      (organization) => [
        organization.id,
        {
          business_name:
            organization.business_name,
          display_name:
            organization.display_name,
        },
      ]
    )
  )

  // ===========================================================================
  // Active pass support details
  // ===========================================================================

  const activePassPurchase =
    activeEntitlement?.purchase_id
      ? purchasedPasses.find(
          (purchase) =>
            purchase.id ===
            activeEntitlement.purchase_id
        ) ?? null
      : null

  const activePassOrganization =
    activePassPurchase
      ?.selected_organization_id
      ? organizationById.get(
          activePassPurchase
            .selected_organization_id
        )
      : undefined

  const supportedOrganizationName =
    activePassOrganization?.display_name ||
    activePassOrganization?.business_name ||
    null

  const supportedCampaignName =
    activePassPurchase?.campaigns?.name ||
    null

  // ===========================================================================
  // Active offers
  // ===========================================================================

  const { data: offers } = await supabase
    .from('offers')
    .select('*')
    .eq('is_active', true)
    .or(
      `starts_at.is.null,starts_at.lte.${now}`
    )
    .or(
      `ends_at.is.null,ends_at.gte.${now}`
    )
    .order('created_at', {
      ascending: false,
    })

  const activeOfferIds = new Set(
    (offers ?? []).map(
      (offer) => offer.id
    )
  )

  // ===========================================================================
  // Legacy business profiles
  // ===========================================================================

  const { data: profiles } = await supabase
    .from('profiles')
    .select(
      'id, business_name, phone, address, google_maps_url'
    )

  const profileById = new Map<
    string,
    LegacyBusinessProfile
  >(
    (profiles ?? []).map((profile) => [
      profile.id,
      {
        name:
          profile.business_name ||
          'Local Business',
        phone: profile.phone || '',
        address: profile.address || '',
        map:
          profile.google_maps_url || '',
      },
    ])
  )

  // ===========================================================================
  // Canonical business locations
  // ===========================================================================

  const { data: canonicalBusinessesData } =
    await supabase
      .from('businesses')
      .select(`
        legacy_profile_id,
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
      .eq('status', 'active')

  const canonicalBusinesses =
    (canonicalBusinessesData ??
      []) as unknown as CanonicalBusinessLocation[]

  const canonicalBusinessByLegacyProfileId =
    new Map<
      string,
      CanonicalBusinessLocation
    >()

  for (const business of canonicalBusinesses) {
    if (!business.legacy_profile_id) {
      continue
    }

    canonicalBusinessByLegacyProfileId.set(
      business.legacy_profile_id,
      business
    )
  }

  // ===========================================================================
  // Saved offers
  // ===========================================================================

  const { data: savedOffers } =
    await supabase
      .from('saved_offers')
      .select('id, offer_id')
      .eq(
        'user_id',
        resolvedCustomerProfileId
      )

  const savedOfferIds = new Set(
    (savedOffers ?? []).map(
      (savedOffer) =>
        savedOffer.offer_id
    )
  )

  // ===========================================================================
  // Redemptions
  // ===========================================================================

  const { data: redemptions } =
    await supabase
      .from('redemptions')
      .select('offer_id, created_at')
      .eq(
        'user_id',
        resolvedCustomerProfileId
      )

  const redeemedOfferIds = new Set(
    (redemptions ?? []).map(
      (redemption) =>
        redemption.offer_id
    )
  )

  const redemptionDateByOfferId =
    new Map(
      (redemptions ?? []).map(
        (redemption) => [
          redemption.offer_id,
          redemption.created_at,
        ]
      )
    )

  // ===========================================================================
  // Historical redeemed offers
  // ===========================================================================

  const historicalOfferIds = [
    ...redeemedOfferIds,
  ].filter(
    (offerId) =>
      !activeOfferIds.has(offerId)
  )

  const { data: historicalOffersData } =
    historicalOfferIds.length > 0
      ? await supabase
          .from('offers')
          .select('*')
          .in('id', historicalOfferIds)
          .order('created_at', {
            ascending: false,
          })
      : { data: [] }

  // ===========================================================================
  // Offer enrichment
  // ===========================================================================

  type OfferRow =
    NonNullable<typeof offers>[number]

  function enrichOffer(
    offer: OfferRow
  ): CustomerDashboardOffer {
    const legacyBusiness =
      profileById.get(
        offer.business_id
      )

    const canonicalBusiness =
      canonicalBusinessByLegacyProfileId.get(
        offer.business_id
      )

    const businessName =
      canonicalBusiness?.name ||
      canonicalBusiness
        ?.google_business_name ||
      legacyBusiness?.name ||
      'Local Business'

    const phone =
      canonicalBusiness?.phone ||
      canonicalBusiness?.google_phone ||
      legacyBusiness?.phone ||
      ''

    const address =
      canonicalBusiness?.address ||
      canonicalBusiness
        ?.google_formatted_address ||
      legacyBusiness?.address ||
      ''

    const googleMapsUrl =
      canonicalBusiness?.google_maps_url ||
      legacyBusiness?.map ||
      ''

    return {
      ...offer,
      business_name: businessName,
      phone,
      address,
      google_maps_url: googleMapsUrl,
      business_latitude:
        canonicalBusiness?.latitude ??
        null,
      business_longitude:
        canonicalBusiness?.longitude ??
        null,
      business_location_source:
        canonicalBusiness
          ?.location_source ??
        null,
      google_place_id:
        canonicalBusiness
          ?.google_place_id ??
        null,
      google_business_name:
        canonicalBusiness
          ?.google_business_name ??
        null,
      google_primary_category:
        canonicalBusiness
          ?.google_primary_category ??
        null,
      google_rating:
        canonicalBusiness?.google_rating ??
        null,
      google_review_count:
        canonicalBusiness
          ?.google_review_count ??
        null,
      google_website_url:
        canonicalBusiness
          ?.google_website_url ??
        null,
    }
  }

  const enrichedOffers =
    (offers ?? []).map(
      enrichOffer
    )

  const historicalOffers =
    (historicalOffersData ?? []).map(
      enrichOffer
    )

  // ===========================================================================
  // Render
  // ===========================================================================

  return (
    <>
      <div className="mt-8">
        <CustomerDigitalPass
          hasActivePass={hasPurchasedPass}
          entitlementType={
            activeEntitlement?.entitlement_type
          }
          startsAt={
            activeEntitlement?.starts_at
          }
          expiresAt={
            activeEntitlement?.expires_at
          }
          supportedOrganizationName={
            supportedOrganizationName
          }
          supportedCampaignName={
            supportedCampaignName
          }
        />
      </div>

      <CustomerDashboardContent
        purchasedPasses={
          purchasedPasses
        }
        organizationById={
          organizationById
        }
        enrichedOffers={
          enrichedOffers
        }
        historicalOffers={
          historicalOffers
        }
        savedOfferIds={savedOfferIds}
        redeemedOfferIds={
          redeemedOfferIds
        }
        redemptionDateByOfferId={
          redemptionDateByOfferId
        }
        hasPurchasedPass={
          hasPurchasedPass
        }
      />
    </>
  )
}
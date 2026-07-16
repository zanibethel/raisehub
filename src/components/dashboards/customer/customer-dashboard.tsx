import { getCustomerPassAccess } from '@/lib/services/customer-pass-access-service'
import { createClient } from '@/lib/supabase/server'
import CustomerDashboardContent from './customer-dashboard-content'

import type {
  CustomerDashboardOffer,
  OrganizationLookup,
  PurchasedPass,
} from '@/types/customer-dashboard'

// =============================================================================
// Customer dashboard loader
// =============================================================================

export default async function CustomerDashboard() {
  const supabase = await createClient()
  const nowDate = new Date()
  const now = nowDate.toISOString()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const passAccess = await getCustomerPassAccess(user.id, nowDate)
  const hasPurchasedPass = passAccess.hasActivePass

  // ===========================================================================
  // Purchased fundraiser passes
  // ===========================================================================

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
        description,
        pass_price
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const purchasedPasses =
    (purchasedPassesData ?? []) as PurchasedPass[]

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

  const { data: organizationProfiles } =
    organizationIds.length > 0
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

  // ===========================================================================
  // Active offers
  // ===========================================================================

  const { data: offers } = await supabase
    .from('offers')
    .select('*')
    .eq('is_active', true)
    .or(`starts_at.is.null,starts_at.lte.${now}`)
    .or(`ends_at.is.null,ends_at.gte.${now}`)
    .order('created_at', { ascending: false })

  // ===========================================================================
  // Business profiles
  // ===========================================================================

  const { data: profiles } = await supabase
    .from('profiles')
    .select(
      'id, business_name, phone, address, google_maps_url'
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

  // ===========================================================================
  // Saved offers
  // ===========================================================================

  const { data: savedOffers } = await supabase
    .from('saved_offers')
    .select('id, offer_id')
    .eq('user_id', user.id)

  const savedOfferIds = new Set(
    (savedOffers ?? []).map((savedOffer) => savedOffer.offer_id)
  )

  // ===========================================================================
  // Redemptions
  // ===========================================================================

  const { data: redemptions } = await supabase
    .from('redemptions')
    .select('offer_id, created_at')
    .eq('user_id', user.id)

  const redeemedOfferIds = new Set(
    (redemptions ?? []).map(
      (redemption) => redemption.offer_id
    )
  )

  const redemptionDateByOfferId = new Map(
    (redemptions ?? []).map((redemption) => [
      redemption.offer_id,
      redemption.created_at,
    ])
  )

  // ===========================================================================
  // Enriched offers
  // ===========================================================================

  const enrichedOffers = (offers ?? []).map((offer) => {
    const business = profileById.get(offer.business_id)

    return {
      ...offer,
      business_name: business?.name || 'Local Business',
      phone: business?.phone || '',
      address: business?.address || '',
      google_maps_url: business?.map || '',
    }
  }) as CustomerDashboardOffer[]

  // ===========================================================================
  // Render
  // ===========================================================================

  return (
    <CustomerDashboardContent
      purchasedPasses={purchasedPasses}
      organizationById={organizationById}
      enrichedOffers={enrichedOffers}
      savedOfferIds={savedOfferIds}
      redeemedOfferIds={redeemedOfferIds}
      redemptionDateByOfferId={redemptionDateByOfferId}
      hasPurchasedPass={hasPurchasedPass}
    />
  )
}

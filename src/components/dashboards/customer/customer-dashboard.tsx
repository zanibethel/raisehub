import Link from 'next/link'
import { getCustomerPassAccess } from '@/lib/services/customer-pass-access-service'
import { createClient } from '@/lib/supabase/server'
import CustomerDashboardContent from './customer-dashboard-content'

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

// =============================================================================
// Display helpers
// =============================================================================

function formatEntitlementType(value: string): string {
  return value
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
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

  const passAccess = await getCustomerPassAccess(
    resolvedCustomerProfileId,
    nowDate
  )
  const activeEntitlement = passAccess.activeEntitlement
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
    .eq('user_id', resolvedCustomerProfileId)
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
    .eq('user_id', resolvedCustomerProfileId)

  const savedOfferIds = new Set(
    (savedOffers ?? []).map((savedOffer) => savedOffer.offer_id)
  )

  // ===========================================================================
  // Redemptions
  // ===========================================================================

  const { data: redemptions } = await supabase
    .from('redemptions')
    .select('offer_id, created_at')
    .eq('user_id', resolvedCustomerProfileId)

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
    <>
      <section className="mt-8 rounded-3xl border border-green-100 bg-gradient-to-br from-green-50 via-white to-blue-50 p-6 shadow-xl sm:p-8">
        {activeEntitlement ? (
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-green-700">
                Active RaiseHub Pass
              </p>

              <h2 className="mt-2 text-2xl font-bold text-gray-900">
                Your local deals are unlocked
              </h2>

              <p className="mt-2 text-sm text-gray-600">
                Access type:{' '}
                <span className="font-semibold text-gray-800">
                  {formatEntitlementType(
                    activeEntitlement.entitlement_type
                  )}
                </span>
              </p>

              <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-600">
                <p>
                  Started:{' '}
                  <span className="font-medium text-gray-800">
                    {new Date(
                      activeEntitlement.starts_at
                    ).toLocaleDateString()}
                  </span>
                </p>

                <p>
                  Expires:{' '}
                  <span className="font-medium text-gray-800">
                    {activeEntitlement.expires_at
                      ? new Date(
                          activeEntitlement.expires_at
                        ).toLocaleDateString()
                      : 'No expiration date'}
                  </span>
                </p>
              </div>
            </div>

            <div className="flex shrink-0 flex-col gap-3">
              <Link
                href="/offers"
                className="inline-flex items-center justify-center rounded-xl bg-green-600 px-5 py-3 text-sm font-semibold text-white hover:bg-green-700"
              >
                Browse Local Deals
              </Link>

              <Link
                href="/campaigns"
                className="inline-flex items-center justify-center rounded-xl border border-blue-200 bg-white px-5 py-3 text-sm font-semibold text-blue-700 hover:bg-blue-50"
              >
                Support Another Fundraiser
              </Link>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-yellow-700">
                No Active RaiseHub Pass
              </p>

              <h2 className="mt-2 text-2xl font-bold text-gray-900">
                Choose a fundraiser to unlock local deals
              </h2>

              <p className="mt-2 max-w-2xl text-sm text-gray-600">
                Your previous support history remains below, but an active pass
                is required to view full offer details and add deals to My Pass.
              </p>
            </div>

            <Link
              href="/campaigns"
              className="inline-flex shrink-0 items-center justify-center rounded-xl bg-yellow-500 px-5 py-3 text-sm font-semibold text-white hover:bg-yellow-600"
            >
              Choose a Fundraiser
            </Link>
          </div>
        )}
      </section>

      <CustomerDashboardContent
        purchasedPasses={purchasedPasses}
        organizationById={organizationById}
        enrichedOffers={enrichedOffers}
        savedOfferIds={savedOfferIds}
        redeemedOfferIds={redeemedOfferIds}
        redemptionDateByOfferId={redemptionDateByOfferId}
        hasPurchasedPass={hasPurchasedPass}
      />
    </>
  )
}

import { createClient } from '@/lib/supabase/server'
import CustomerDashboardContent from './customer-dashboard-content'

export default async function CustomerDashboard() {
  const supabase = await createClient()
  const now = new Date().toISOString()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  // =========================================
  // 🎟️ PURCHASED PASSES
  // =========================================

  const { data: purchasedPasses } = await supabase
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

  const organizationIds = [
    ...new Set(
      (purchasedPasses ?? [])
        .map((pass) => pass.selected_organization_id)
        .filter(Boolean)
    ),
  ]

  const { data: organizationProfiles } =
    organizationIds.length > 0
      ? await supabase
          .from('profiles')
          .select('id,business_name,display_name')
          .in('id', organizationIds)
      : { data: [] }

  const organizationById = new Map(
    (organizationProfiles ?? []).map((organization) => [
      organization.id,
      organization,
    ])
  )

  // =========================================
  // 🎁 OFFERS
  // =========================================

  const { data: offers } = await supabase
    .from('offers')
    .select('*')
    .eq('is_active', true)
    .or(`starts_at.is.null,starts_at.lte.${now}`)
    .or(`ends_at.is.null,ends_at.gte.${now}`)
    .order('created_at', { ascending: false })

  const { data: profiles } = await supabase
    .from('profiles')
    .select(
      'id,business_name,phone,address,google_maps_url'
    )

  const { data: savedOffers } = await supabase
    .from('saved_offers')
    .select('id,offer_id')
    .eq('user_id', user.id)

  const { data: redemptions } = await supabase
    .from('redemptions')
    .select('offer_id,created_at')
    .eq('user_id', user.id)

  return (
    <CustomerDashboardContent
      purchasedPasses={purchasedPasses ?? []}
      organizationById={organizationById}
      offers={offers ?? []}
      profiles={profiles ?? []}
      savedOffers={savedOffers ?? []}
      redemptions={redemptions ?? []}
    />
  )
}
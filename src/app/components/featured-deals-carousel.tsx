import { createClient } from '@/lib/supabase/server'
import FeaturedDealsCarouselClient from './featured-deals-carousel-client'

type Profile = {
  id: string
  business_name: string | null
  display_name: string | null
  logo_url: string | null
}

export default async function FeaturedDealsCarousel() {
  const supabase = await createClient()
  const now = new Date().toISOString()

  // =========================================
  // 📦 FETCH ACTIVE OFFERS
  // =========================================
  const { data: offers } = await supabase
    .from('offers')
    .select('id, title, discount, description, starts_at, ends_at, business_id')
    .or(`starts_at.is.null,starts_at.lte.${now}`)
    .or(`ends_at.is.null,ends_at.gte.${now}`)
    .order('created_at', { ascending: false })
    .limit(12)

  if (!offers || offers.length === 0) return null

  // =========================================
  // 🏪 FETCH BUSINESS PROFILES FOR OFFERS
  // =========================================
  const businessIds = [...new Set(offers.map((offer) => offer.business_id))]

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, business_name, display_name, logo_url')
    .in('id', businessIds)

  const profileById = Object.fromEntries(
    (profiles ?? []).map((profile: Profile) => [profile.id, profile])
  )

  return (
    <FeaturedDealsCarouselClient
      offers={offers}
      profileById={profileById}
    />
  )
}
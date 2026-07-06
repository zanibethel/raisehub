import { createClient } from '@/lib/supabase/server'
import FeaturedDealsCarouselClient from './featured-deals-carousel-client'
import { isDemoMode } from '@/lib/app-mode'

type Profile = {
  id: string
  business_name: string | null
  display_name: string | null
  logo_url: string | null
}

// =========================================
// 🎭 DEMO SAMPLE OFFERS
// Shown only when app mode is demo AND the real
// Supabase query returns no active offers. Production
// behavior is unaffected — this data is never used
// unless isDemoMode() is true.
// =========================================
const DEMO_SAMPLE_PROFILES: Record<string, Profile> = {
  'demo-business-1': {
    id: 'demo-business-1',
    business_name: 'Maple Street Coffee Co.',
    display_name: 'Maple Street Coffee Co.',
    logo_url: null,
  },
  'demo-business-2': {
    id: 'demo-business-2',
    business_name: 'Riverside Pizza Kitchen',
    display_name: 'Riverside Pizza Kitchen',
    logo_url: null,
  },
  'demo-business-3': {
    id: 'demo-business-3',
    business_name: 'Bright Smiles Family Dentistry',
    display_name: 'Bright Smiles Family Dentistry',
    logo_url: null,
  },
}

const DEMO_SAMPLE_OFFERS = [
  {
    id: 'demo-offer-1',
    title: 'Buy One Latte, Get One Free',
    discount: 'BOGO',
    description: 'Treat a friend on us — valid any time, any size.',
    starts_at: null,
    ends_at: null,
    business_id: 'demo-business-1',
  },
  {
    id: 'demo-offer-2',
    title: '20% Off Any Large Pizza',
    discount: '20% off',
    description: 'Perfect for family night or a team celebration.',
    starts_at: null,
    ends_at: null,
    business_id: 'demo-business-2',
  },
  {
    id: 'demo-offer-3',
    title: 'Free Teeth Whitening with New Patient Exam',
    discount: 'Free add-on',
    description: 'New patients only — includes full exam and cleaning.',
    starts_at: null,
    ends_at: null,
    business_id: 'demo-business-3',
  },
]

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
    .eq('is_active', true)

  const hasRealOffers = !!offers && offers.length > 0

  // Demo fallback only applies when real data is empty AND
  // the app is running in demo mode. In production (the
  // default), this branch is never taken — behavior is
  // identical to before this change.
  if (!hasRealOffers && isDemoMode()) {
    return (
      <FeaturedDealsCarouselClient
        offers={DEMO_SAMPLE_OFFERS}
        profileById={DEMO_SAMPLE_PROFILES}
      />
    )
  }

  if (!hasRealOffers) return null

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
import { createClient } from '@/lib/supabase/server'
import LogoCarouselClient from './logo-carousel-client'
import { isDemoMode } from '@/lib/app-mode'

// =========================================
// 🎭 DEMO SAMPLE PARTNERS
// Shown only when app mode is demo AND the real
// Supabase query returns no partners. Production
// behavior is unaffected — this array is never
// used unless isDemoMode() is true.
// =========================================
const DEMO_SAMPLE_PARTNERS = [
  {
    id: 'demo-partner-1',
    business_name: 'Maple Street Coffee Co.',
    display_name: 'Maple Street Coffee Co.',
    logo_url: null,
    website_url: null,
    role: 'business',
    phone: null,
    address: null,
    google_maps_url: null,
  },
  {
    id: 'demo-partner-2',
    business_name: 'Riverside Pizza Kitchen',
    display_name: 'Riverside Pizza Kitchen',
    logo_url: null,
    website_url: null,
    role: 'business',
    phone: null,
    address: null,
    google_maps_url: null,
  },
  {
    id: 'demo-partner-3',
    business_name: 'Lakeview Youth Soccer Club',
    display_name: 'Lakeview Youth Soccer Club',
    logo_url: null,
    website_url: null,
    role: 'organization',
    phone: null,
    address: null,
    google_maps_url: null,
  },
  {
    id: 'demo-partner-4',
    business_name: 'Bright Smiles Family Dentistry',
    display_name: 'Bright Smiles Family Dentistry',
    logo_url: null,
    website_url: null,
    role: 'business',
    phone: null,
    address: null,
    google_maps_url: null,
  },
]

export default async function LogoCarousel() {
  const supabase = await createClient()

  const { data: partners } = await supabase
    .from('profiles')
    .select(
      'id, business_name, display_name, logo_url, website_url, role, phone, address, google_maps_url'
    )
    .or('role.eq.business,role.eq.organization')
    .limit(20)

  const hasRealPartners = !!partners && partners.length > 0

  // Demo fallback only applies when real data is empty AND
  // the app is running in demo mode. In production (the
  // default), this branch is never taken — behavior is
  // identical to before this change.
  if (!hasRealPartners && isDemoMode()) {
    return <LogoCarouselClient partners={DEMO_SAMPLE_PARTNERS} />
  }

  if (!hasRealPartners) return null

  return <LogoCarouselClient partners={partners} />
}
import { createClient } from '@/lib/supabase/server'
import LogoCarouselClient from './logo-carousel-client'
import { isDemoMode } from '@/lib/app-mode'

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

  const { data: partners, error } = await supabase
    .from('profiles')
    .select(
      'id, business_name, display_name, logo_url, website_url, role, phone, address, google_maps_url'
    )
    .eq('role', 'business')
    .limit(20)

  if (error) return null

  const validBusinessPartners =
    partners?.filter(
      (partner) =>
        partner.role === 'business' &&
        Boolean(
          partner.business_name?.trim() ||
            partner.display_name?.trim()
        )
    ) ?? []

  if (
    validBusinessPartners.length === 0 &&
    isDemoMode()
  ) {
    return (
      <LogoCarouselClient
        partners={DEMO_SAMPLE_PARTNERS}
      />
    )
  }

  if (validBusinessPartners.length === 0) {
    return null
  }

  return (
    <LogoCarouselClient
      partners={validBusinessPartners}
    />
  )
}

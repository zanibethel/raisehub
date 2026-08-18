import LogoCarouselClient from './logo-carousel-client'
import { isDemoMode } from '@/lib/app-mode'
import { getPublicPartnerProfiles } from '@/lib/repositories/public-partner-profile-repository'

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
  const demoMode = isDemoMode()
  const { profiles: partners, error } = await getPublicPartnerProfiles([], {
    role: 'business',
  })

  // No IDs means the helper deliberately returns no rows; the homepage carousel
  // needs a bounded list, so load the presentation-safe partner rows directly
  // through the server-only admin client below.
  const { createAdminClient } = await import('@/lib/supabase/admin')
  const admin = createAdminClient()
  const { data: partnerRows, error: partnerError } = await admin
    .from('profiles')
    .select(
      'id, business_name, display_name, logo_url, website_url, role, phone, address, google_maps_url'
    )
    .eq('role', 'business')
    .eq('is_demo', demoMode)
    .limit(20)

  if (error || partnerError) return null

  const validBusinessPartners =
    partnerRows?.filter(
      (partner) =>
        partner.role === 'business' &&
        Boolean(
          partner.business_name?.trim() ||
            partner.display_name?.trim()
        )
    ) ?? partners

  if (
    validBusinessPartners.length === 0 &&
    demoMode
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

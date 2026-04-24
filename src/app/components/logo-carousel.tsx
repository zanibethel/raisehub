import { createClient } from '@/lib/supabase/server'
import LogoCarouselClient from './logo-carousel-client'

export default async function LogoCarousel() {
  const supabase = await createClient()

  const { data: partners } = await supabase
    .from('profiles')
    .select(
      'id, business_name, display_name, logo_url, website_url, role, phone, address, google_maps_url'
    )
    .or('role.eq.business,role.eq.organization')
    .limit(20)

  if (!partners || partners.length === 0) return null

  return <LogoCarouselClient partners={partners} />
}
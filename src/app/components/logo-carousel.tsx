import LogoCarouselClient from './logo-carousel-client'
import { getPublicPartnerProfiles } from '@/lib/repositories/public-partner-profile-repository'

export default async function LogoCarousel() {
  const { profiles: partners, error } = await getPublicPartnerProfiles(null, {
    role: 'business',
    limit: 20,
  })

  if (error) return null

  const validBusinessPartners = partners.filter(
    (partner) =>
      partner.role === 'business' &&
      Boolean(partner.business_name?.trim() || partner.display_name?.trim())
  )

  if (validBusinessPartners.length === 0) return null

  return <LogoCarouselClient partners={validBusinessPartners} />
}

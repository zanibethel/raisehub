import LogoCarouselClient from './logo-carousel-client'
import { getPublicBusinessDirectory } from '@/lib/repositories/public-business-directory-repository'

export default async function LogoCarousel() {
  const { businesses, error } = await getPublicBusinessDirectory({
    limit: 20,
  })

  if (error || businesses.length === 0) return null

  return (
    <LogoCarouselClient
      partners={businesses.map((business) => business.profile)}
    />
  )
}

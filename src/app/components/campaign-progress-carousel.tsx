import CampaignProgressCarouselClient from './campaign-progress-carousel-client'
import { getPublicSellableCampaigns } from '@/lib/repositories/public-campaign-repository'

export const dynamic = 'force-dynamic'

export default async function CampaignProgressCarousel() {
  const { campaigns, error } =
    await getPublicSellableCampaigns()

  if (error || campaigns.length === 0) {
    return null
  }

  return (
    <CampaignProgressCarouselClient
      campaigns={campaigns.slice(0, 10)}
    />
  )
}

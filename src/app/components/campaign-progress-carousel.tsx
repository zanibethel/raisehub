import CampaignProgressCarouselClient from './campaign-progress-carousel-client'
import { isDemoMode } from '@/lib/app-mode'
import { getSellableCampaigns } from '@/lib/repositories/campaign-repository'
import type { SelectableCampaignCard } from '@/lib/types/campaigns'

export const dynamic = 'force-dynamic'

const DEMO_SAMPLE_CAMPAIGNS: SelectableCampaignCard[] = [
  {
    id: 'demo-campaign-1',
    organizationId: null,
    organizationLegacyProfileId: 'demo-org-1',
    name: 'Lakeview Elementary Fall Fundraiser',
    organizationName: 'Lakeview Elementary',
    imageUrl: null,
    amountRaised: 3250,
    goalAmount: 5000,
    goalPercentage: 65,
    amountRemaining: 1750,
    endsAt: '2026-09-01T00:00:00.000Z',
    daysRemaining: 45,
    createdAt: '2026-06-01T00:00:00.000Z',
  },
  {
    id: 'demo-campaign-2',
    organizationId: null,
    organizationLegacyProfileId: 'demo-org-2',
    name: 'Lakeview Youth Soccer Club — New Uniforms',
    organizationName: 'Lakeview Youth Soccer Club',
    imageUrl: null,
    amountRaised: 1140,
    goalAmount: 3000,
    goalPercentage: 38,
    amountRemaining: 1860,
    endsAt: '2026-09-14T00:00:00.000Z',
    daysRemaining: 58,
    createdAt: '2026-06-10T00:00:00.000Z',
  },
  {
    id: 'demo-campaign-3',
    organizationId: null,
    organizationLegacyProfileId: 'demo-org-3',
    name: 'Riverside Middle School Band Trip',
    organizationName: 'Riverside Middle School',
    imageUrl: null,
    amountRaised: 7120,
    goalAmount: 8000,
    goalPercentage: 89,
    amountRemaining: 880,
    endsAt: '2026-08-15T00:00:00.000Z',
    daysRemaining: 28,
    createdAt: '2026-05-15T00:00:00.000Z',
  },
]

export default async function CampaignProgressCarousel() {
  const { campaigns, error } = await getSellableCampaigns()

  if (error) {
    return null
  }

  const hasRealCampaigns = campaigns.length > 0

  if (!hasRealCampaigns && isDemoMode()) {
    return <CampaignProgressCarouselClient campaigns={DEMO_SAMPLE_CAMPAIGNS} />
  }

  if (!hasRealCampaigns) {
    return null
  }

  return (
    <CampaignProgressCarouselClient
      campaigns={campaigns.slice(0, 10)}
    />
  )
}

import { Suspense } from 'react'

import SignupForm from './signup-form'

import { getSellableCampaigns } from '@/lib/repositories/campaign-repository'
import { getOrganizationPricingLocations } from '@/lib/services/organization-pricing-location-service'
import { resolveEffectivePricing } from '@/lib/services/pricing-resolution-service'

export const dynamic = 'force-dynamic'

export default async function SignupPage() {
  const { campaigns, error } =
    await getSellableCampaigns()

  const {
    locationsByOrganizationId,
  } = error
    ? {
        locationsByOrganizationId: new Map(),
      }
    : await getOrganizationPricingLocations(
        campaigns.map(
          (campaign) => campaign.organizationId
        )
      )

  const pricedCampaigns = error
    ? []
    : await Promise.all(
        campaigns.map(async (campaign) => {
          const organizationLocation =
            campaign.organizationId
              ? locationsByOrganizationId.get(
                  campaign.organizationId
                )
              : null

          const pricing =
            await resolveEffectivePricing({
              campaignId: campaign.id,
              organizationId:
                campaign.organizationId,
              townName:
                organizationLocation?.townName ??
                null,
              stateCode:
                organizationLocation?.stateCode ??
                null,
            })

          return {
            ...campaign,
            passPrice: pricing.passPrice,
          }
        })
      )

  return (
    <main className="min-h-screen bg-[#F0F6FF] p-5 sm:p-8">
      <Suspense
        fallback={
          <div className="mx-auto max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-md">
            <p className="text-sm text-gray-600">
              Loading signup...
            </p>
          </div>
        }
      >
        <SignupForm
          campaigns={pricedCampaigns}
        />
      </Suspense>
    </main>
  )
}
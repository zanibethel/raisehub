'use client'

import CustomerPassesSection from './sections/customer-passes-section'
import CustomerRedemptionHistorySection from './sections/customer-redemption-history-section'
import CustomerSavingsSection from './sections/customer-savings-section'

import type { CustomerDashboardOffer, OrganizationLookup, PurchasedPass } from '@/types/customer-dashboard'

type Props = {
  purchasedPasses: PurchasedPass[]
  organizationById: Map<string, OrganizationLookup>
  enrichedOffers: CustomerDashboardOffer[]
  historicalOffers: CustomerDashboardOffer[]
  redeemedOfferIds: Set<string>
  confirmedRedeemedOfferIds: Set<string>
  redemptionDateByOfferId: Map<string, string>
}

export default function CustomerActivityContent({
  purchasedPasses,
  organizationById,
  enrichedOffers,
  historicalOffers,
  confirmedRedeemedOfferIds,
  redemptionDateByOfferId,
}: Props) {
  const customerHistoryOffers = [
    ...new Map(
      [...enrichedOffers, ...historicalOffers].map((offer) => [offer.id, offer])
    ).values(),
  ]

  return (
    <div className="mt-5 space-y-5 sm:mt-6 sm:space-y-6">
      <div id="customer-savings" className="scroll-mt-24">
        <CustomerSavingsSection
          enrichedOffers={customerHistoryOffers}
          redeemedOfferIds={confirmedRedeemedOfferIds}
        />
      </div>

      <div id="redemption-history" className="scroll-mt-24">
        <CustomerRedemptionHistorySection
          enrichedOffers={customerHistoryOffers}
          redemptionDateByOfferId={redemptionDateByOfferId}
        />
      </div>

      <div id="support-history" className="scroll-mt-24">
        <CustomerPassesSection
          purchasedPasses={purchasedPasses}
          organizationById={organizationById}
        />
      </div>
    </div>
  )
}

import CustomerAvailableDealsSection from './sections/customer-available-deals-section'
import CustomerPassesSection from './sections/customer-passes-section'
import CustomerSavedDealsSection from './sections/customer-saved-deals-section'

type Props = {
  purchasedPasses: any[]
  organizationById: Map<string, any>

  enrichedOffers: any[]

  savedOfferIds: Set<string>
  redeemedOfferIds: Set<string>
  redemptionDateByOfferId: Map<string, string>

  hasPurchasedPass: boolean
}

export default function CustomerDashboardContent({
  purchasedPasses,
  organizationById,

  enrichedOffers,

  savedOfferIds,
  redeemedOfferIds,
  redemptionDateByOfferId,

  hasPurchasedPass,
}: Props) {
  return (
    <div className="mt-8 space-y-8">
      <CustomerPassesSection
        purchasedPasses={purchasedPasses}
        organizationById={organizationById}
      />

      <CustomerSavedDealsSection
        enrichedOffers={enrichedOffers}
        savedOfferIds={savedOfferIds}
        redeemedOfferIds={redeemedOfferIds}
        redemptionDateByOfferId={redemptionDateByOfferId}
        savedOffersCount={savedOfferIds.size}
      />

      <CustomerAvailableDealsSection
        hasPurchasedPass={hasPurchasedPass}
        enrichedOffers={enrichedOffers}
        savedOfferIds={savedOfferIds}
      />
    </div>
  )
}
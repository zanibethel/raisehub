import CustomerAvailableDealsSection from './sections/customer-available-deals-section'
import CustomerPassesSection from './sections/customer-passes-section'
import CustomerSavedDealsSection from './sections/customer-saved-deals-section'

// =============================================================================
// Infer section prop types
// =============================================================================

type PassesProps = React.ComponentProps<typeof CustomerPassesSection>

type SavedDealsProps = React.ComponentProps<
  typeof CustomerSavedDealsSection
>

type AvailableDealsProps = React.ComponentProps<
  typeof CustomerAvailableDealsSection
>

// =============================================================================
// Component Props
// =============================================================================

type Props = {
  purchasedPasses: PassesProps['purchasedPasses']
  organizationById: PassesProps['organizationById']

  // Use the richer Available Deals offer type.
  enrichedOffers: AvailableDealsProps['enrichedOffers']

  savedOfferIds: SavedDealsProps['savedOfferIds']
  redeemedOfferIds: SavedDealsProps['redeemedOfferIds']
  redemptionDateByOfferId:
    SavedDealsProps['redemptionDateByOfferId']

  hasPurchasedPass: AvailableDealsProps['hasPurchasedPass']
}

// =============================================================================
// Component
// =============================================================================

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
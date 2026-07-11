'use client'

import BusinessOfferCard, {
  type BusinessOffer,
  type OfferRedemption,
} from '@/app/components/business-offer-card'

// =============================================================================
// Types
// =============================================================================

type OfferGridProps = {
  offers: BusinessOffer[]
  redemptionCountByOfferId: Record<string, number>
  redemptionsByOfferId: Record<string, OfferRedemption[]>
  profileEmailById: Record<string, string>
  onBoost: () => void
}

// =============================================================================
// Helpers
// =============================================================================

function isOfferExpired(offer: BusinessOffer) {
  return Boolean(
    offer.ends_at && new Date(offer.ends_at).getTime() < Date.now()
  )
}

function sortOffers(
  offers: BusinessOffer[],
  redemptionCountByOfferId: Record<string, number>
) {
  return [...offers].sort((a, b) => {
    const aActive = a.is_active !== false && !isOfferExpired(a)
    const bActive = b.is_active !== false && !isOfferExpired(b)

    if (aActive !== bActive) {
      return aActive ? -1 : 1
    }

    const aCount = redemptionCountByOfferId[a.id] ?? 0
    const bCount = redemptionCountByOfferId[b.id] ?? 0

    return bCount - aCount
  })
}

// =============================================================================
// Component
// =============================================================================

export default function OfferGrid({
  offers,
  redemptionCountByOfferId,
  redemptionsByOfferId,
  profileEmailById,
  onBoost,
}: OfferGridProps) {
  const sortedOffers = sortOffers(
    offers,
    redemptionCountByOfferId
  )

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {sortedOffers.map((offer) => {
        const redemptionCount =
          redemptionCountByOfferId[offer.id] ?? 0

        return (
          <BusinessOfferCard
            key={offer.id}
            offer={offer}
            redemptionCount={redemptionCount}
            redemptions={redemptionsByOfferId[offer.id] ?? []}
            profileEmailById={profileEmailById}
            onBoost={onBoost}
          />
        )
      })}
    </div>
  )
}
'use client'

import { useState } from 'react'
import AddOfferForm from './add-offer-form'
import BusinessProfileCard from './business-profile-card'
import RedemptionReport from './redemption-report'
import UpgradePlanModal from './upgrade-plan-modal'

type Offer = {
  id: string
  title: string | null
  description: string | null
  discount: string | null
  starts_at: string | null
  ends_at: string | null
}

type Redemption = {
  user_id: string
  created_at: string
}

type BusinessDashboardContentProps = {
  profile: {
    business_name: string | null
    phone: string | null
    address: string | null
    google_maps_url: string | null
  } | null
  offers: Offer[]
  totalRedemptions: number
  activeOffersCount: number
  activeOfferLimit: number
  hasReachedLimit: boolean
  topOfferTitle: string
  topOfferCount: number
  redemptionCountByOfferId: Record<string, number>
  redemptionsByOfferId: Record<string, Redemption[]>
  profileEmailById: Record<string, string>
}

export default function BusinessDashboardContent({
  profile,
  offers,
  totalRedemptions,
  activeOffersCount,
  activeOfferLimit,
  hasReachedLimit,
  topOfferTitle,
  topOfferCount,
  redemptionCountByOfferId,
  redemptionsByOfferId,
  profileEmailById,
}: BusinessDashboardContentProps) {
  const [isUpgradeOpen, setIsUpgradeOpen] = useState(false)

  return (
    <div className="mt-8 space-y-8">
      <BusinessProfileCard
        businessName={profile?.business_name ?? ''}
        phone={profile?.phone ?? ''}
        address={profile?.address ?? ''}
        googleMapsUrl={profile?.google_maps_url ?? ''}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-green-100 bg-white/90 p-6 shadow-xl backdrop-blur">
          <p className="text-sm text-gray-500">Total Redemptions</p>
          <p className="mt-2 text-2xl font-bold text-green-700">
            {totalRedemptions}
          </p>
        </div>

        <div className="rounded-2xl border border-green-100 bg-white/90 p-6 shadow-xl backdrop-blur">
          <p className="text-sm text-gray-500">Active Offers</p>
          <p className="mt-2 text-2xl font-bold text-green-700">
            {activeOffersCount} / {activeOfferLimit}
          </p>
        </div>

        <div className="rounded-2xl border border-green-100 bg-white/90 p-6 shadow-xl backdrop-blur">
          <p className="text-sm text-gray-500">Top Offer</p>
          <p className="mt-2 text-lg font-semibold text-green-700">
            {topOfferTitle || 'No data yet'}
          </p>
          <p className="text-sm text-gray-500">{topOfferCount} uses</p>
        </div>
      </div>

      <div>
        <h2 className="mb-4 text-xl font-semibold text-green-700">
          My Offers
        </h2>

        {offers.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-3">
            {[...offers]
              .sort((a, b) => {
                const aCount = redemptionCountByOfferId[a.id] ?? 0
                const bCount = redemptionCountByOfferId[b.id] ?? 0
                return bCount - aCount
              })
              .map((offer) => (
                <div
                  key={offer.id}
                  className="rounded-2xl border border-green-100 bg-white/90 p-6 shadow-xl backdrop-blur"
                >
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-lg font-semibold text-green-700">
                      {offer.title}
                    </h3>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsUpgradeOpen(true)}
                        className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-medium text-yellow-800 hover:bg-yellow-200"
                      >
                        Boost Offer
                      </button>

                      {offer.ends_at && new Date(offer.ends_at) < new Date() ? (
                        <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-600">
                          Expired
                        </span>
                      ) : (
                        <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-600">
                          Active
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="mt-1 text-sm text-gray-500">
                    {offer.discount}
                  </p>

                  <p className="mt-2 text-sm text-gray-600">
                    {offer.description}
                  </p>

                  <div className="mt-4 space-y-1 text-xs text-gray-500">
                    <p>
                      Starts:{' '}
                      {offer.starts_at
                        ? new Date(offer.starts_at).toLocaleDateString()
                        : '—'}
                    </p>
                    <p>
                      Ends:{' '}
                      {offer.ends_at
                        ? new Date(offer.ends_at).toLocaleDateString()
                        : '—'}
                    </p>
                  </div>

                  <RedemptionReport
                    offerId={offer.id}
                    redemptionCount={redemptionCountByOfferId[offer.id] ?? 0}
                    redemptions={redemptionsByOfferId[offer.id] ?? []}
                    profileEmailById={profileEmailById}
                  />
                </div>
              ))}
          </div>
        ) : (
          <p className="text-gray-500">
            No offers yet. Create your first one above.
          </p>
        )}
      </div>

      {hasReachedLimit ? (
        <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-6 text-center">
          <p className="text-sm font-medium text-yellow-800">
            You’ve reached your free limit of {activeOfferLimit} active offers.
          </p>
          <p className="mt-2 text-sm text-yellow-700">
            Upgrade your plan to add more offers and boost your visibility.
          </p>

          <button
            type="button"
            onClick={() => setIsUpgradeOpen(true)}
            className="mt-4 rounded-lg bg-yellow-600 px-4 py-2 text-sm font-medium text-white hover:bg-yellow-700"
          >
            Upgrade Plan
          </button>
        </div>
      ) : (
        <AddOfferForm />
      )}

      <UpgradePlanModal
        isOpen={isUpgradeOpen}
        onClose={() => setIsUpgradeOpen(false)}
      />
    </div>
  )
}
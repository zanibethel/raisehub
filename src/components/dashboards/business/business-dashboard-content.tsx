'use client'

import { useState } from 'react'

import BusinessProfileCard from '@/app/components/business-profile-card'
import UpgradePlanModal from '@/app/components/upgrade-plan-modal'
import AttentionCenter from '@/components/dashboard/attention-center'
import { getDashboardAlerts } from '@/lib/rules/dashboard-alerts'
import { getOfferStatus } from '@/lib/rules/offer-status'

import BusinessDashboardCreateOffer from './business-dashboard-create-offer'
import BusinessDashboardQuickActions from './business-dashboard-quick-actions'
import BusinessDashboardSnapshot from './business-dashboard-snapshot'
import BusinessDashboardOffersSection from './offers/offers-section'

import type {
  BusinessOffer,
  OfferRedemption,
} from '@/app/components/business-offer-card'

// =============================================================================
// Types
// =============================================================================

type BusinessProfile = {
  business_name: string | null
  phone: string | null
  address: string | null
  google_maps_url: string | null
  logo_url?: string | null
  website_url?: string | null
  display_name?: string | null
}

type BusinessDashboardContentProps = {
  profile: BusinessProfile | null
  offers: BusinessOffer[]
  totalRedemptions: number
  activeOffersCount: number
  activeOfferLimit: number
  hasReachedLimit: boolean
  topOfferTitle: string
  topOfferCount: number
  redemptionCountByOfferId: Record<string, number>
  redemptionsByOfferId: Record<string, OfferRedemption[]>
  profileEmailById: Record<string, string>
}

// =============================================================================
// Component
// =============================================================================

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

  const offerStatuses = offers.map((offer) =>
    getOfferStatus({
      startsAt: offer.starts_at,
      endsAt: offer.ends_at,
      isActive: offer.is_active,
    })
  )

  const pausedOffersCount = offerStatuses.filter(
    (status) => status.status === 'paused'
  ).length

  const expiringSoonCount = offerStatuses.filter(
    (status) => status.status === 'expiring-soon'
  ).length

  const profileComplete = Boolean(
    profile?.business_name &&
      profile?.phone &&
      profile?.address &&
      profile?.logo_url
  )

  const dashboardAlerts = getDashboardAlerts({
    activeOffers: activeOffersCount,
    pausedOffers: pausedOffersCount,
    expiringSoon: expiringSoonCount,
    reviewRecommended: 0,
    profileComplete,
  })

  return (
    <div className="mt-8 space-y-10">
      <BusinessProfileCard
        businessName={profile?.business_name ?? ''}
        phone={profile?.phone ?? ''}
        address={profile?.address ?? ''}
        googleMapsUrl={profile?.google_maps_url ?? ''}
        logoUrl={profile?.logo_url ?? ''}
        websiteUrl={profile?.website_url ?? ''}
        displayName={profile?.display_name ?? ''}
      />

      <AttentionCenter alerts={dashboardAlerts} />

      <BusinessDashboardSnapshot
        activeOffersCount={activeOffersCount}
        activeOfferLimit={activeOfferLimit}
        totalRedemptions={totalRedemptions}
        topOfferTitle={topOfferTitle}
        topOfferCount={topOfferCount}
        publishedOffersCount={offers.length}
      />

      <BusinessDashboardCreateOffer
        activeOffersCount={activeOffersCount}
        activeOfferLimit={activeOfferLimit}
        hasReachedLimit={hasReachedLimit}
        onViewUpgrade={() => setIsUpgradeOpen(true)}
      />

      <BusinessDashboardQuickActions
        hasReachedLimit={hasReachedLimit}
      />

      <BusinessDashboardOffersSection
        offers={offers}
        hasReachedLimit={hasReachedLimit}
        redemptionCountByOfferId={redemptionCountByOfferId}
        redemptionsByOfferId={redemptionsByOfferId}
        profileEmailById={profileEmailById}
        onBoost={() => setIsUpgradeOpen(true)}
      />

      <UpgradePlanModal
        isOpen={isUpgradeOpen}
        onClose={() => setIsUpgradeOpen(false)}
      />
    </div>
  )
}
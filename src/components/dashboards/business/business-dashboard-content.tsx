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
import BusinessNotificationCenter from './business-notification-center'
import BusinessDashboardOffersSection from './offers/offers-section'

import type {
  BusinessOffer,
  OfferRedemption,
} from '@/app/components/business-offer-card'
import type {
  BusinessNotification,
} from './business-notification-center'

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
  businessLegacyProfileId?: string | null
  profile: BusinessProfile | null
  offers: BusinessOffer[]
  totalRedemptions: number
  activeOffersCount: number
  activeOfferLimit: number
  hasReachedLimit: boolean
  topOfferTitle: string
  topOfferCount: number
  redemptionCountByOfferId: Record<string, number>
  redemptionsByOfferId: Record<
    string,
    OfferRedemption[]
  >
  profileEmailById: Record<string, string>
}

// =============================================================================
// Notification helpers
// =============================================================================

function buildBusinessNotifications({
  profileComplete,
  activeOffersCount,
  pausedOffersCount,
  expiringSoonCount,
  hasReachedLimit,
  activeOfferLimit,
  totalRedemptions,
  topOfferTitle,
  topOfferCount,
}: {
  profileComplete: boolean
  activeOffersCount: number
  pausedOffersCount: number
  expiringSoonCount: number
  hasReachedLimit: boolean
  activeOfferLimit: number
  totalRedemptions: number
  topOfferTitle: string
  topOfferCount: number
}): BusinessNotification[] {
  const notifications: BusinessNotification[] = []

  if (!profileComplete) {
    notifications.push({
      id: 'complete-business-profile',
      title: 'Complete your business profile',
      description:
        'Add the business name, phone number, address, and logo so customers can recognize and trust this business.',
      tone: 'warning',
      href: '#business-profile',
      actionLabel: 'Complete profile',
    })
  }

  if (activeOffersCount === 0) {
    notifications.push({
      id: 'publish-first-offer',
      title: 'Publish an active offer',
      description:
        'This business does not currently have an active offer. Create or reactivate an offer so supporters can begin sharing it.',
      tone: 'danger',
      href: '#create-offer',
      actionLabel: 'Create an offer',
    })
  }

  if (expiringSoonCount > 0) {
    notifications.push({
      id: 'offers-expiring-soon',
      title:
        expiringSoonCount === 1
          ? 'One offer is expiring soon'
          : `${expiringSoonCount} offers are expiring soon`,
      description:
        'Review the expiration dates and extend any offers you want supporters and customers to keep using.',
      tone: 'warning',
      href: '#business-offers',
      actionLabel: 'Review offers',
    })
  }

  if (pausedOffersCount > 0) {
    notifications.push({
      id: 'paused-offers',
      title:
        pausedOffersCount === 1
          ? 'One offer is paused'
          : `${pausedOffersCount} offers are paused`,
      description:
        'Paused offers are not available to customers. Review them and reactivate any offer that should be visible.',
      tone: 'info',
      href: '#business-offers',
      actionLabel: 'Review paused offers',
    })
  }

  if (hasReachedLimit) {
    notifications.push({
      id: 'active-offer-limit',
      title: 'Active offer limit reached',
      description:
        `This business is using all ${activeOfferLimit} active offer slots. Pause an existing offer or review upgrade options before publishing another.`,
      tone: 'info',
      href: '#business-offers',
      actionLabel: 'Manage active offers',
    })
  }

  if (
    totalRedemptions > 0 &&
    topOfferTitle &&
    topOfferCount > 0
  ) {
    notifications.push({
      id: 'top-performing-offer',
      title: `${topOfferTitle} is leading redemptions`,
      description:
        `${topOfferCount} ${
          topOfferCount === 1
            ? 'redemption has'
            : 'redemptions have'
        } been recorded for this offer. Consider using its structure as a guide for future offers.`,
      tone: 'success',
      href: '#business-performance',
      actionLabel: 'View performance',
    })
  }

  return notifications
}

// =============================================================================
// Component
// =============================================================================

export default function BusinessDashboardContent({
  businessLegacyProfileId,
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
  const [
    isUpgradeOpen,
    setIsUpgradeOpen,
  ] = useState(false)

  const offerStatuses = offers.map(
    (offer) =>
      getOfferStatus({
        startsAt: offer.starts_at,
        endsAt: offer.ends_at,
        isActive: offer.is_active,
      })
  )

  const pausedOffersCount =
    offerStatuses.filter(
      (status) =>
        status.status === 'paused'
    ).length

  const expiringSoonCount =
    offerStatuses.filter(
      (status) =>
        status.status ===
        'expiring-soon'
    ).length

  const profileComplete = Boolean(
    profile?.business_name &&
      profile?.phone &&
      profile?.address &&
      profile?.logo_url
  )

  const dashboardAlerts =
    getDashboardAlerts({
      activeOffers:
        activeOffersCount,
      pausedOffers:
        pausedOffersCount,
      expiringSoon:
        expiringSoonCount,
      reviewRecommended: 0,
      profileComplete,
    })

  const businessNotifications =
    buildBusinessNotifications({
      profileComplete,
      activeOffersCount,
      pausedOffersCount,
      expiringSoonCount,
      hasReachedLimit,
      activeOfferLimit,
      totalRedemptions,
      topOfferTitle,
      topOfferCount,
    })

  return (
    <div className="mt-8 space-y-10">
      <section
        id="business-profile"
        className="scroll-mt-6"
      >
        <BusinessProfileCard
          businessLegacyProfileId={
            businessLegacyProfileId
          }
          businessName={
            profile?.business_name ?? ''
          }
          phone={profile?.phone ?? ''}
          address={
            profile?.address ?? ''
          }
          googleMapsUrl={
            profile?.google_maps_url ??
            ''
          }
          logoUrl={
            profile?.logo_url ?? ''
          }
          websiteUrl={
            profile?.website_url ?? ''
          }
          displayName={
            profile?.display_name ?? ''
          }
        />
      </section>

      <AttentionCenter
        alerts={dashboardAlerts}
      />

      <BusinessNotificationCenter
        notifications={
          businessNotifications
        }
      />

      <section
        id="business-performance"
        className="scroll-mt-6"
      >
        <BusinessDashboardSnapshot
          activeOffersCount={
            activeOffersCount
          }
          activeOfferLimit={
            activeOfferLimit
          }
          totalRedemptions={
            totalRedemptions
          }
          topOfferTitle={
            topOfferTitle
          }
          topOfferCount={
            topOfferCount
          }
          publishedOffersCount={
            offers.length
          }
        />
      </section>

      <section
        id="create-offer"
        className="scroll-mt-6"
      >
        <BusinessDashboardCreateOffer
          activeOffersCount={
            activeOffersCount
          }
          activeOfferLimit={
            activeOfferLimit
          }
          hasReachedLimit={
            hasReachedLimit
          }
          onViewUpgrade={() =>
            setIsUpgradeOpen(true)
          }
        />
      </section>

      <BusinessDashboardQuickActions
        hasReachedLimit={
          hasReachedLimit
        }
      />

      <section
        id="business-offers"
        className="scroll-mt-6"
      >
        <BusinessDashboardOffersSection
          offers={offers}
          hasReachedLimit={
            hasReachedLimit
          }
          redemptionCountByOfferId={
            redemptionCountByOfferId
          }
          redemptionsByOfferId={
            redemptionsByOfferId
          }
          profileEmailById={
            profileEmailById
          }
          onBoost={() =>
            setIsUpgradeOpen(true)
          }
        />
      </section>

      <UpgradePlanModal
        isOpen={isUpgradeOpen}
        onClose={() =>
          setIsUpgradeOpen(false)
        }
      />
    </div>
  )
}
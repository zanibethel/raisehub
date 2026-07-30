'use client'

import Link from 'next/link'
import { useState } from 'react'

import UpgradePlanModal from '@/app/components/upgrade-plan-modal'
import {
  WorkspaceMetricStrip,
  WorkspaceRecommendedActions,
} from '@/components/workspace/workspace-shell'
import { getOfferStatus } from '@/lib/rules/offer-status'

import BusinessDashboardCreateOffer from './business-dashboard-create-offer'
import BusinessDashboardQuickActions from './business-dashboard-quick-actions'
import BusinessDashboardSnapshot from './business-dashboard-snapshot'
import BusinessLifecycleBanner from './business-lifecycle-banner'
import BusinessDashboardOffersSection from './offers/offers-section'
import BusinessRedemptionSettingsSection from './sections/business-redemption-settings-section'

import type {
  BusinessOffer,
  OfferRedemption,
} from '@/app/components/business-offer-card'
import type { BusinessExportRow } from './business-export-tools'
import type { BusinessNotification } from './business-notification-center'

type BusinessProfile = {
  business_name: string | null
  phone: string | null
  address: string | null
  google_maps_url: string | null
  logo_url?: string | null
  website_url?: string | null
  display_name?: string | null
  redemption_method?: string | null
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
  viewCount: number
  clickCount: number
  conversionRate: string
  businessId: string | null
  businessStatus: string
  archivedAt: string | null
  archiveReason: string | null
  restoreRequestedAt: string | null
}

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
        'Create or reactivate an offer so supporters can begin sharing it.',
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
        'Review expiration dates and extend the offers customers should keep using.',
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
        'Review paused offers and reactivate any that should be available to customers.',
      tone: 'info',
      href: '#business-offers',
      actionLabel: 'Review paused offers',
    })
  }

  if (hasReachedLimit) {
    notifications.push({
      id: 'active-offer-limit',
      title: 'Active offer limit reached',
      description: `All ${activeOfferLimit} active offer slots are in use. Pause an offer or review upgrade options before publishing another.`,
      tone: 'info',
      href: '#business-offers',
      actionLabel: 'Manage active offers',
    })
  } else if (activeOffersCount < activeOfferLimit) {
    notifications.push({
      id: 'available-offer-capacity',
      title: 'You have room for more offers',
      description: 'Add another strong offer to give customers more reasons to visit.',
      tone: 'info',
      href: '#create-offer',
      actionLabel: 'Create an offer',
    })
  }

  if (totalRedemptions > 0 && topOfferTitle && topOfferCount > 0) {
    notifications.push({
      id: 'top-performing-offer',
      title: `${topOfferTitle} is leading redemptions`,
      description: `${topOfferCount} ${
        topOfferCount === 1 ? 'use has' : 'uses have'
      } been recorded for this offer.`,
      tone: 'success',
      href: '#business-performance',
      actionLabel: 'View performance',
    })
  }

  return notifications
}

function formatExportDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function buildBusinessExportRows({
  offers,
  redemptionsByOfferId,
  profileEmailById,
}: {
  offers: BusinessOffer[]
  redemptionsByOfferId: Record<string, OfferRedemption[]>
  profileEmailById: Record<string, string>
}): BusinessExportRow[] {
  return offers.flatMap((offer) => {
    const offerStatus = getOfferStatus({
      startsAt: offer.starts_at,
      endsAt: offer.ends_at,
      isActive: offer.is_active,
    })
    const offerRedemptions = redemptionsByOfferId[offer.id] ?? []

    return offerRedemptions.map((redemption) => ({
      offerTitle: offer.title?.trim() || 'Untitled offer',
      offerStatus: offerStatus.label,
      customerEmail:
        profileEmailById[redemption.user_id] || 'Email unavailable',
      redeemedAt: formatExportDate(redemption.created_at),
    }))
  })
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
  viewCount,
  clickCount,
  conversionRate,
  businessId,
  businessStatus,
  archivedAt,
  archiveReason,
  restoreRequestedAt,
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
  const publicOfferId =
    offers.find((offer, index) => {
      const status = offerStatuses[index]?.status
      return status === 'active' || status === 'expiring-soon'
    })?.id ?? null

  const profileComplete = Boolean(
    profile?.business_name &&
      profile?.phone &&
      profile?.address &&
      profile?.logo_url
  )

  const businessNotifications = buildBusinessNotifications({
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

  const recommendedActions = businessNotifications
    .filter((notification) => notification.tone !== 'success')
    .slice(0, 3)
    .map((notification) => ({
      id: notification.id,
      title: notification.title,
      description: notification.description,
      href: notification.href ?? '/dashboard',
      label: notification.actionLabel,
      tone:
        notification.tone === 'warning'
          ? ('amber' as const)
          : notification.tone === 'danger'
            ? ('blue' as const)
            : ('green' as const),
    }))

  const businessExportRows = buildBusinessExportRows({
    offers,
    redemptionsByOfferId,
    profileEmailById,
  })

  return (
    <div className="mt-5 space-y-5 sm:mt-6 sm:space-y-6">
      {businessId ? (
        <BusinessLifecycleBanner
          businessId={businessId}
          status={businessStatus}
          archivedAt={archivedAt}
          archiveReason={archiveReason}
          restoreRequestedAt={restoreRequestedAt}
        />
      ) : null}

      <WorkspaceMetricStrip
        title="Customer activity"
        metrics={[
          { label: 'Views', value: viewCount, tone: 'blue' },
          { label: 'Clicks', value: clickCount, tone: 'green' },
          {
            label: 'Click rate',
            value: `${conversionRate}%`,
            description: 'Clicks divided by views',
            tone: 'amber',
          },
        ]}
        action={
          <Link
            href="#business-performance"
            className="text-sm font-bold text-green-700 hover:text-green-800"
          >
            View details →
          </Link>
        }
      />

      <WorkspaceRecommendedActions actions={recommendedActions} />

      <section id="business-offers" className="scroll-mt-24">
        <BusinessDashboardOffersSection
          offers={offers}
          hasReachedLimit={hasReachedLimit}
          redemptionCountByOfferId={redemptionCountByOfferId}
          redemptionsByOfferId={redemptionsByOfferId}
          profileEmailById={profileEmailById}
          exportRows={businessExportRows}
          businessName={profile?.business_name}
          onBoost={() => setIsUpgradeOpen(true)}
        />
      </section>

      <section id="business-performance" className="scroll-mt-24">
        <BusinessDashboardSnapshot
          activeOffersCount={activeOffersCount}
          activeOfferLimit={activeOfferLimit}
          totalRedemptions={totalRedemptions}
          topOfferTitle={topOfferTitle}
          topOfferCount={topOfferCount}
          publishedOffersCount={offers.length}
        />
      </section>

      <BusinessDashboardQuickActions
        hasReachedLimit={hasReachedLimit}
        publicOfferId={publicOfferId}
      />

      <section id="business-redemption-settings" className="scroll-mt-24">
        <BusinessRedemptionSettingsSection
          redemptionMethod={profile?.redemption_method}
        />
      </section>

      <section id="create-offer" className="scroll-mt-24">
        <BusinessDashboardCreateOffer
          activeOffersCount={activeOffersCount}
          activeOfferLimit={activeOfferLimit}
          hasReachedLimit={hasReachedLimit}
          onViewUpgrade={() => setIsUpgradeOpen(true)}
        />
      </section>

      <UpgradePlanModal
        isOpen={isUpgradeOpen}
        onClose={() => setIsUpgradeOpen(false)}
      />
    </div>
  )
}
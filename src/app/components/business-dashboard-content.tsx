'use client'

import { useState } from 'react'
import Link from 'next/link'
import BusinessProfileCard from './business-profile-card'
import RedemptionReport from './redemption-report'
import UpgradePlanModal from './upgrade-plan-modal'
import DeactivateOfferButton from './deactivate-offer-button'
import EmptyState from '@/components/dashboard/empty-state'
import InsightCard from '@/components/dashboard/insight-card'
import MetricCard from '@/components/dashboard/metric-card'
import QuickActionCard from '@/components/dashboard/quick-action-card'
import SectionHeader from '@/components/dashboard/section-header'
import StatusBadge from '@/components/dashboard/status-badge'

// =============================================================================
// Types
// =============================================================================

type Offer = {
  id: string
  title: string | null
  description: string | null
  discount: string | null
  starts_at: string | null
  ends_at: string | null
  is_active?: boolean | null
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
    logo_url?: string | null
    website_url?: string | null
    display_name?: string | null
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

// =============================================================================
// Helpers
// =============================================================================

function isOfferExpired(offer: Offer) {
  return Boolean(
    offer.ends_at && new Date(offer.ends_at).getTime() < Date.now()
  )
}

function getOfferStatus(offer: Offer) {
  if (isOfferExpired(offer)) {
    return {
      label: 'Expired',
      status: 'warning' as const,
    }
  }

  if (offer.is_active === false) {
    return {
      label: 'Paused',
      status: 'paused' as const,
    }
  }

  return {
    label: 'Active',
    status: 'active' as const,
  }
}

// =============================================================================
// Dashboard
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

  const remainingOfferSlots = Math.max(
    activeOfferLimit - activeOffersCount,
    0
  )

  const sortedOffers = [...offers].sort((a, b) => {
    const aActive = a.is_active !== false && !isOfferExpired(a)
    const bActive = b.is_active !== false && !isOfferExpired(b)

    if (aActive !== bActive) {
      return aActive ? -1 : 1
    }

    const aCount = redemptionCountByOfferId[a.id] ?? 0
    const bCount = redemptionCountByOfferId[b.id] ?? 0

    return bCount - aCount
  })

  return (
    <div className="mt-8 space-y-10">
      {/* =====================================================================
          Business profile
      ===================================================================== */}

      <BusinessProfileCard
        businessName={profile?.business_name ?? ''}
        phone={profile?.phone ?? ''}
        address={profile?.address ?? ''}
        googleMapsUrl={profile?.google_maps_url ?? ''}
        logoUrl={profile?.logo_url ?? ''}
        websiteUrl={profile?.website_url ?? ''}
        displayName={profile?.display_name ?? ''}
      />

      {/* =====================================================================
          Snapshot
      ===================================================================== */}

      <section>
        <SectionHeader
          title="Business Snapshot"
          description="A quick view of your active offers and member activity."
        />

        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label="Active Offers"
            value={`${activeOffersCount} / ${activeOfferLimit}`}
            description={
              remainingOfferSlots > 0
                ? `${remainingOfferSlots} free offer slot${
                    remainingOfferSlots === 1 ? '' : 's'
                  } remaining`
                : 'Free active-offer limit reached'
            }
            tone="green"
          />

          <MetricCard
            label="Total Redemptions"
            value={totalRedemptions}
            description="Verified uses across all of your offers"
            tone="blue"
          />

          <MetricCard
            label="Top Offer"
            value={topOfferTitle || 'No data yet'}
            description={`${topOfferCount} redemption${
              topOfferCount === 1 ? '' : 's'
            }`}
            tone="yellow"
          />

          <MetricCard
            label="Published Offers"
            value={offers.length}
            description="Includes active, paused, and expired offers"
            tone="slate"
          />
        </div>
      </section>

      {/* =====================================================================
          Create-offer prompt
      ===================================================================== */}

      {!hasReachedLimit ? (
        <section>
          <InsightCard
            title={
              activeOffersCount === 0
                ? 'Create your first exclusive offer'
                : `You can publish ${
                    activeOfferLimit - activeOffersCount
                  } more free offer${
                    activeOfferLimit - activeOffersCount === 1 ? '' : 's'
                  }`
            }
            description={
              activeOffersCount === 0
                ? 'Use the guided RaiseHub wizard to choose a business goal, review tailored ideas, protect your margins, and publish a members-only offer.'
                : 'A broader mix of strong exclusive offers gives members more reasons to visit your business and increases the value of every fundraiser pass.'
            }
            recommendation={
              activeOffersCount === 0
                ? 'Start with one high-perceived-value offer that costs relatively little to fulfill.'
                : 'Create an offer aimed at a different customer goal than your existing promotions.'
            }
            tone="green"
          />

          <div className="mt-4">
            <Link
              href="/dashboard/offers/new"
              className="inline-flex w-full items-center justify-center rounded-xl bg-green-600 px-6 py-4 font-bold text-white shadow-md transition hover:bg-green-700 sm:w-auto"
            >
              {activeOffersCount === 0
                ? 'Create My First Offer'
                : 'Create Another Exclusive Offer'}
            </Link>
          </div>
        </section>
      ) : (
        <section className="rounded-2xl border border-yellow-200 bg-yellow-50 p-6">
          <h2 className="font-bold text-yellow-900">
            You are using all {activeOfferLimit} free active offers
          </h2>

          <p className="mt-2 text-sm leading-6 text-yellow-800">
            You can pause an existing offer to create another one. Paid plans
            will later support additional active offers, priority placement, and
            AI marketing credits.
          </p>

          <button
            type="button"
            onClick={() => setIsUpgradeOpen(true)}
            className="mt-4 rounded-xl bg-yellow-600 px-5 py-3 text-sm font-semibold text-white hover:bg-yellow-700"
          >
            View Future Upgrade Options
          </button>
        </section>
      )}

      {/* =====================================================================
          Quick actions
      ===================================================================== */}

      <section>
        <SectionHeader
          title="Quick Actions"
          description="Manage the most important parts of your Community Partner account."
        />

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <QuickActionCard
            title="Create an Offer"
            description="Build a high-value, RaiseHub-exclusive promotion using tailored recommendations."
            href="/dashboard/offers/new"
            label={
              hasReachedLimit
                ? 'Review Offer Limit'
                : 'Open Offer Wizard'
            }
            tone="green"
          />

          <QuickActionCard
            title="View Public Profile"
            description="See how members and organizations experience your business."
            href="/businesses"
            label="View Businesses"
            tone="blue"
          />

          <QuickActionCard
            title="Review Redemptions"
            description="See which exclusive offers members are using most often."
            href="#my-offers"
            label="View Offer Reports"
            tone="yellow"
          />
        </div>
      </section>

      {/* =====================================================================
          Offer management
      ===================================================================== */}

      <section id="my-offers" className="scroll-mt-8">
        <SectionHeader
          title="My Offers"
          description="Review performance, public visibility, dates, and redemption activity."
          action={
            !hasReachedLimit ? (
              <Link
                href="/dashboard/offers/new"
                className="inline-flex rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Add Offer
              </Link>
            ) : null
          }
        />

        <div className="mt-5">
          {sortedOffers.length > 0 ? (
            <div className="grid gap-5 lg:grid-cols-2">
              {sortedOffers.map((offer) => {
                const offerStatus = getOfferStatus(offer)
                const redemptionCount =
                  redemptionCountByOfferId[offer.id] ?? 0

                return (
                  <article
                    key={offer.id}
                    className="rounded-2xl border border-green-100 bg-white p-6 shadow-sm"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">
                          {offer.title || 'Untitled offer'}
                        </h3>

                        <p className="mt-1 font-semibold text-green-700">
                          {offer.discount || 'Member benefit not entered'}
                        </p>
                      </div>

                      <StatusBadge
                        label={offerStatus.label}
                        status={offerStatus.status}
                      />
                    </div>

                    <p className="mt-4 text-sm leading-6 text-gray-600">
                      {offer.description || 'No description entered.'}
                    </p>

                    <div className="mt-5 grid gap-3 sm:grid-cols-3">
                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
                          Redemptions
                        </p>

                        <p className="mt-1 text-xl font-bold text-gray-900">
                          {redemptionCount}
                        </p>
                      </div>

                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
                          Starts
                        </p>

                        <p className="mt-1 text-sm font-semibold text-gray-800">
                          {offer.starts_at
                            ? new Date(
                                offer.starts_at
                              ).toLocaleDateString()
                            : 'Immediately'}
                        </p>
                      </div>

                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
                          Ends
                        </p>

                        <p className="mt-1 text-sm font-semibold text-gray-800">
                          {offer.ends_at
                            ? new Date(offer.ends_at).toLocaleDateString()
                            : 'No end date'}
                        </p>
                      </div>
                    </div>

                    <RedemptionReport
                      offerId={offer.id}
                      redemptionCount={redemptionCount}
                      redemptions={
                        redemptionsByOfferId[offer.id] ?? []
                      }
                      profileEmailById={profileEmailById}
                    />

                    <div className="mt-5 flex flex-wrap gap-2">
                      <Link
                        href={`/offers/${offer.id}`}
                        target="_blank"
                        className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100"
                      >
                        View Public Offer
                      </Link>

                      <button
                        type="button"
                        onClick={() => setIsUpgradeOpen(true)}
                        className="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-2 text-sm font-semibold text-yellow-800 hover:bg-yellow-100"
                      >
                        Boost Offer
                      </button>
                    </div>

                    {offer.is_active !== false &&
                    !isOfferExpired(offer) ? (
                      <div className="mt-4">
                        <DeactivateOfferButton
                          offerId={offer.id}
                          offerTitle={offer.title}
                        />
                      </div>
                    ) : null}
                  </article>
                )
              })}
            </div>
          ) : (
            <EmptyState
              title="No offers published yet"
              description="Create your first members-only offer using the guided wizard. RaiseHub will help balance customer value, exclusivity, and business sustainability."
              actionLabel="Create My First Offer"
              actionHref="/dashboard/offers/new"
            />
          )}
        </div>
      </section>

      <UpgradePlanModal
        isOpen={isUpgradeOpen}
        onClose={() => setIsUpgradeOpen(false)}
      />
    </div>
  )
}

'use client'

import Link from 'next/link'

import EmptyState from '@/components/dashboard/empty-state'
import SectionHeader from '@/components/dashboard/section-header'

import OfferGrid from './offer-grid'

import type {
  BusinessOffer,
  OfferRedemption,
} from '@/app/components/business-offer-card'

type Props = {
  offers: BusinessOffer[]
  hasReachedLimit: boolean

  redemptionCountByOfferId: Record<string, number>
  redemptionsByOfferId: Record<string, OfferRedemption[]>
  profileEmailById: Record<string, string>

  onBoost: () => void
}

export default function BusinessDashboardOffersSection({
  offers,
  hasReachedLimit,
  redemptionCountByOfferId,
  redemptionsByOfferId,
  profileEmailById,
  onBoost,
}: Props) {
  return (
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
        {offers.length > 0 ? (
          <OfferGrid
            offers={offers}
            redemptionCountByOfferId={redemptionCountByOfferId}
            redemptionsByOfferId={redemptionsByOfferId}
            profileEmailById={profileEmailById}
            onBoost={onBoost}
          />
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
  )
}
'use client'

import Link from 'next/link'

import EmptyState from '@/components/dashboard/empty-state'
import SectionHeader from '@/components/dashboard/section-header'

import BusinessExportTools from '../business-export-tools'
import OfferGrid from './offer-grid'

import type {
  BusinessOffer,
  OfferRedemption,
} from '@/app/components/business-offer-card'
import type { BusinessExportRow } from '../business-export-tools'

type Props = {
  offers: BusinessOffer[]
  hasReachedLimit: boolean
  redemptionCountByOfferId: Record<string, number>
  redemptionsByOfferId: Record<string, OfferRedemption[]>
  profileEmailById: Record<string, string>
  exportRows: BusinessExportRow[]
  businessName?: string | null
  onBoost: () => void
  showExport?: boolean
}

export default function BusinessDashboardOffersSection({
  offers,
  hasReachedLimit,
  redemptionCountByOfferId,
  redemptionsByOfferId,
  profileEmailById,
  exportRows,
  businessName,
  onBoost,
  showExport = true,
}: Props) {
  const canExport = showExport && exportRows.length > 0

  return (
    <section id="my-offers" className="scroll-mt-8">
      <SectionHeader
        title="My Offers"
        description="Create, edit, pause, and review the offers available to customers."
        action={
          <div className="flex items-start gap-2">
            {canExport ? (
              <BusinessExportTools
                rows={exportRows}
                businessName={businessName}
              />
            ) : null}
            {!hasReachedLimit ? (
              <Link
                href="/dashboard/offers/new"
                className="inline-flex min-h-10 rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700"
              >
                Add Offer
              </Link>
            ) : null}
          </div>
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

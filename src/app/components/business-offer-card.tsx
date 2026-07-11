import Link from 'next/link'
import DeactivateOfferButton from './deactivate-offer-button'
import ReactivateOfferButton from './reactivate-offer-button'
import RedemptionReport from './redemption-report'
import OfferHealthCard from '@/components/dashboard/offer-health-card'
import StatusBadge from '@/components/dashboard/status-badge'
import { calculateOfferHealth } from '@/lib/rules/offer-health'
import {
  getOfferStatus,
  type OfferStatus,
} from '@/lib/rules/offer-status'

// =============================================================================
// Types
// =============================================================================

export type BusinessOffer = {
  id: string
  title: string | null
  description: string | null
  discount: string | null
  starts_at: string | null
  ends_at: string | null
  is_active?: boolean | null
}

export type OfferRedemption = {
  user_id: string
  created_at: string
}

type BusinessOfferCardProps = {
  offer: BusinessOffer
  redemptionCount: number
  redemptions: OfferRedemption[]
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

function getStatusBadgeStatus(status: OfferStatus) {
  switch (status) {
    case 'active':
      return 'active' as const

    case 'expiring-soon':
      return 'warning' as const

    case 'paused':
      return 'paused' as const

    case 'expired':
      return 'expired' as const

    case 'scheduled':
    case 'archived':
      return 'pending' as const
  }
}

function getOfferCardClasses(status: OfferStatus) {
  switch (status) {
    case 'active':
      return 'border-green-200 bg-green-50'

    case 'expiring-soon':
      return 'border-yellow-200 bg-yellow-50'

    case 'paused':
      return 'border-rose-200 bg-rose-50'

    case 'expired':
      return 'border-red-200 bg-red-50'

    case 'scheduled':
      return 'border-blue-200 bg-blue-50'

    case 'archived':
      return 'border-slate-200 bg-slate-50'
  }
}

// =============================================================================
// Component
// =============================================================================

export default function BusinessOfferCard({
  offer,
  redemptionCount,
  redemptions,
  profileEmailById,
  onBoost,
}: BusinessOfferCardProps) {
  const offerStatus = getOfferStatus({
    startsAt: offer.starts_at,
    endsAt: offer.ends_at,
    isActive: offer.is_active,
  })

  const offerHealth = calculateOfferHealth({
    hasTitle: Boolean(offer.title?.trim()),
    hasDescription: Boolean(offer.description?.trim()),
    hasDiscount: Boolean(offer.discount?.trim()),
    redemptionCount,
    isPaused: offerStatus.status === 'paused',
    isExpired: offerStatus.status === 'expired',
  })

  return (
    <article
      className={`rounded-2xl border p-6 shadow-sm ${getOfferCardClasses(
        offerStatus.status
      )}`}
    >
      {/* ===================================================================
          Offer heading
      =================================================================== */}

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
          status={getStatusBadgeStatus(offerStatus.status)}
        />
      </div>

      <p className="mt-3 text-sm font-medium text-gray-700">
        {offerStatus.description}
      </p>

      <p className="mt-4 text-sm leading-6 text-gray-600">
        {offer.description || 'No description entered.'}
      </p>

      {/* ===================================================================
          Offer health
      =================================================================== */}

      <div className="mt-5">
        <OfferHealthCard health={offerHealth} compact />
      </div>

      {/* ===================================================================
          Offer metrics
      =================================================================== */}

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
              ? new Date(offer.starts_at).toLocaleDateString()
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

      {/* ===================================================================
          Redemption report
      =================================================================== */}

      <RedemptionReport
        offerId={offer.id}
        redemptionCount={redemptionCount}
        redemptions={redemptions}
        profileEmailById={profileEmailById}
      />

      {/* ===================================================================
          Offer actions
      =================================================================== */}

      <div className="mt-5 flex flex-wrap gap-2">
        <Link
          href={`/dashboard/offers/${offer.id}/edit`}
          className="rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm font-semibold text-green-700 hover:bg-green-100"
        >
          Edit Offer
        </Link>

        <Link
          href={`/offers/${offer.id}`}
          target="_blank"
          className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100"
        >
          View Public Offer
        </Link>

        <button
          type="button"
          onClick={onBoost}
          className="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-2 text-sm font-semibold text-yellow-800 hover:bg-yellow-100"
        >
          Boost Offer
        </button>
      </div>

      <div className="mt-4">
        {offer.is_active !== false && !isOfferExpired(offer) ? (
          <DeactivateOfferButton
            offerId={offer.id}
            offerTitle={offer.title}
          />
        ) : offer.is_active === false && !isOfferExpired(offer) ? (
          <ReactivateOfferButton
            offerId={offer.id}
            offerTitle={offer.title}
          />
        ) : (
          <p className="text-sm text-gray-500">
            This offer has expired. Edit its dates before resuming it.
          </p>
        )}
      </div>
    </article>
  )
}
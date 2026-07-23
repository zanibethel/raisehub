'use client'

import { useState } from 'react'
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

type Effectiveness = {
  label: string
  score: number | null
  explanation: string
  tone: string
}

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

function getActiveDays(startsAt: string | null) {
  if (!startsAt) return 0

  const start = new Date(startsAt).getTime()
  if (Number.isNaN(start) || start > Date.now()) return 0

  return Math.max(1, Math.floor((Date.now() - start) / 86_400_000) + 1)
}

function getEffectiveness(
  offer: BusinessOffer,
  redemptionCount: number,
  status: OfferStatus
): Effectiveness {
  if (status === 'scheduled') {
    return {
      label: 'Not started',
      score: null,
      explanation: 'Performance begins tracking when the offer becomes active.',
      tone: 'text-blue-700',
    }
  }

  const activeDays = getActiveDays(offer.starts_at)

  if (activeDays < 7 && redemptionCount < 3) {
    return {
      label: 'Too new to rate',
      score: null,
      explanation: `${activeDays || 1} day${activeDays === 1 ? '' : 's'} active · ${redemptionCount} redemption${redemptionCount === 1 ? '' : 's'}`,
      tone: 'text-slate-700',
    }
  }

  const redemptionsPerWeek = (redemptionCount / Math.max(activeDays, 1)) * 7
  let score = Math.min(100, Math.round(redemptionsPerWeek * 18 + 25))

  if (status === 'paused') score = Math.max(0, score - 15)
  if (status === 'expired') score = Math.max(0, score - 25)
  if (status === 'expiring-soon') score = Math.max(0, score - 5)

  if (score >= 75) {
    return {
      label: 'Strong',
      score,
      explanation: `${redemptionsPerWeek.toFixed(1)} redemptions per week across ${activeDays} active days.`,
      tone: 'text-green-700',
    }
  }

  if (score >= 50) {
    return {
      label: 'Moderate',
      score,
      explanation: `${redemptionsPerWeek.toFixed(1)} redemptions per week across ${activeDays} active days.`,
      tone: 'text-yellow-700',
    }
  }

  return {
    label: 'Needs attention',
    score,
    explanation: `${redemptionsPerWeek.toFixed(1)} redemptions per week across ${activeDays} active days.`,
    tone: 'text-rose-700',
  }
}

export default function BusinessOfferCard({
  offer,
  redemptionCount,
  redemptions,
  profileEmailById,
  onBoost,
}: BusinessOfferCardProps) {
  const [expanded, setExpanded] = useState(false)

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

  const effectiveness = getEffectiveness(
    offer,
    redemptionCount,
    offerStatus.status
  )

  return (
    <article
      className={`rounded-2xl border p-4 shadow-sm sm:p-5 ${getOfferCardClasses(
        offerStatus.status
      )}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="line-clamp-2 text-base font-bold text-gray-900 sm:text-lg">
            {offer.title || 'Untitled offer'}
          </h3>
          <p className="mt-1 line-clamp-2 text-sm font-semibold text-green-700">
            {offer.discount || 'Member benefit not entered'}
          </p>
        </div>

        <StatusBadge
          label={offerStatus.label}
          status={getStatusBadgeStatus(offerStatus.status)}
        />
      </div>

      <div className="mt-4 rounded-xl border border-white/80 bg-white/70 p-3">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-gray-500">
          Customer view
        </p>
        <p className="mt-2 line-clamp-3 text-sm leading-6 text-gray-700">
          {offer.description || 'No customer description entered.'}
        </p>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-white/75 p-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500">
            Effectiveness
          </p>
          <p className={`mt-1 text-sm font-bold ${effectiveness.tone}`}>
            {effectiveness.score === null
              ? effectiveness.label
              : `${effectiveness.score}/100`}
          </p>
        </div>

        <div className="rounded-xl bg-white/75 p-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500">
            Redemptions
          </p>
          <p className="mt-1 text-lg font-bold text-gray-900">
            {redemptionCount}
          </p>
        </div>

        <div className="rounded-xl bg-white/75 p-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500">
            Active age
          </p>
          <p className="mt-1 text-sm font-bold text-gray-900">
            {getActiveDays(offer.starts_at)}d
          </p>
        </div>
      </div>

      <p className="mt-3 text-xs leading-5 text-gray-600">
        {effectiveness.explanation}
      </p>

      <button
        type="button"
        onClick={() => setExpanded((current) => !current)}
        aria-expanded={expanded}
        className="mt-4 flex min-h-11 w-full items-center justify-center rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-bold text-gray-800 transition hover:border-blue-300 hover:text-blue-700"
      >
        {expanded ? 'Hide offer details' : 'Expand details and actions'}
      </button>

      {expanded ? (
        <div className="mt-5 border-t border-gray-200 pt-5">
          <p className="text-sm font-medium text-gray-700">
            {offerStatus.description}
          </p>

          <div className="mt-4">
            <OfferHealthCard health={offerHealth} compact />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-white/75 p-3">
              <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
                Starts
              </p>
              <p className="mt-1 text-sm font-semibold text-gray-800">
                {offer.starts_at
                  ? new Date(offer.starts_at).toLocaleDateString()
                  : 'Immediately'}
              </p>
            </div>

            <div className="rounded-xl bg-white/75 p-3">
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
            redemptions={redemptions}
            profileEmailById={profileEmailById}
          />

          <div className="mt-5 grid grid-cols-2 gap-2">
            <Link
              href={`/dashboard/offers/${offer.id}/edit`}
              className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-center text-sm font-semibold text-green-700 hover:bg-green-100"
            >
              Edit
            </Link>

            <Link
              href={`/offers/${offer.id}`}
              target="_blank"
              className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-center text-sm font-semibold text-blue-700 hover:bg-blue-100"
            >
              Public view
            </Link>

            <button
              type="button"
              onClick={onBoost}
              className="rounded-lg border border-yellow-200 bg-yellow-50 px-3 py-2 text-sm font-semibold text-yellow-800 hover:bg-yellow-100"
            >
              Boost
            </button>

            <div>
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
                <p className="text-xs text-gray-500">
                  Edit dates to resume.
                </p>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </article>
  )
}

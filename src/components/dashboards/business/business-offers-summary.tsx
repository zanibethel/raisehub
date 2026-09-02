'use client'

import Link from 'next/link'

import type { BusinessOffer } from '@/app/components/business-offer-card'
import { WorkspaceModule, WorkspaceModuleEmpty } from '@/components/workspace/workspace-module'
import { getOfferStatus } from '@/lib/rules/offer-status'

type Props = {
  offers: BusinessOffer[]
  redemptionCountByOfferId: Record<string, number>
}

function OffersIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
      <path d="M20 12 12 20 4 12V4h8Z" />
      <circle cx="9" cy="9" r="1" />
    </svg>
  )
}

export default function BusinessOffersSummary({ offers, redemptionCountByOfferId }: Props) {
  const statuses = offers.map((offer) => ({
    offer,
    status: getOfferStatus({
      startsAt: offer.starts_at,
      endsAt: offer.ends_at,
      isActive: offer.is_active,
    }),
  }))

  const counts = statuses.reduce(
    (result, item) => {
      const key = item.status.status
      if (key === 'active' || key === 'expiring-soon') result.active += 1
      else if (key === 'paused') result.paused += 1
      else if (key === 'expired') result.expired += 1
      else result.other += 1
      return result
    },
    { active: 0, paused: 0, expired: 0, other: 0 }
  )

  const preview = statuses
    .filter((item) => item.status.status === 'active' || item.status.status === 'expiring-soon')
    .slice(0, 2)

  const secondaryCount = counts.paused + counts.other + counts.expired

  return (
    <WorkspaceModule
      id="active-offers"
      title="Active offers"
      eyebrow="Work"
      icon={<OffersIcon />}
      tone="green"
      action={(
        <Link href="/dashboard/offers" className="text-sm font-bold text-green-700">
          Manage
        </Link>
      )}
      emptyState={(
        <WorkspaceModuleEmpty
          title="No active offers yet"
          description="Create an offer to give customers a reason to visit your business."
          action={(
            <Link href="#create-offer" className="rounded-xl bg-green-600 px-4 py-2 text-sm font-bold text-white">
              Create offer
            </Link>
          )}
        />
      )}
    >
      {preview.length > 0 ? (
        <>
          <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
            <span className="rounded-full border border-green-200 bg-green-50 px-2.5 py-1 text-green-700">{counts.active} active</span>
            {secondaryCount > 0 ? (
              <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-slate-600">{secondaryCount} other</span>
            ) : null}
          </div>

          <div className="mt-3 divide-y divide-slate-100 rounded-2xl border border-slate-200">
            {preview.map(({ offer, status }) => (
              <div key={offer.id} className="flex items-start gap-3 p-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-50 text-base font-black text-green-700">
                  {offer.title?.trim().slice(0, 1).toUpperCase() || 'O'}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start gap-x-2 gap-y-1">
                    <p className="min-w-0 flex-1 text-sm font-bold leading-5 text-slate-950 sm:text-base">
                      {offer.title || 'Untitled offer'}
                    </p>
                    <span className="shrink-0 rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-bold text-green-700">{status.label}</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500 sm:text-sm">
                    {redemptionCountByOfferId[offer.id] ?? 0} redemptions
                  </p>
                </div>
                <span className="mt-1 text-lg text-slate-400">›</span>
              </div>
            ))}
          </div>
        </>
      ) : null}
    </WorkspaceModule>
  )
}

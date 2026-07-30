'use client'

import Link from 'next/link'

import type { BusinessOffer } from '@/app/components/business-offer-card'
import { getOfferStatus } from '@/lib/rules/offer-status'

type Props = {
  offers: BusinessOffer[]
  redemptionCountByOfferId: Record<string, number>
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

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-black text-slate-950">Active offers</h2>
        <Link href="#full-offer-management" className="text-sm font-bold text-green-700">
          Manage offers
        </Link>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold">
        <span className="rounded-full border border-green-200 bg-green-50 px-3 py-1 text-green-700">Active {counts.active}</span>
        <span className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-rose-700">Paused {counts.paused}</span>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-600">Other {counts.other}</span>
        <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-slate-500">Expired {counts.expired}</span>
      </div>

      <div className="mt-4 divide-y divide-slate-100 rounded-2xl border border-slate-200">
        {preview.length > 0 ? preview.map(({ offer, status }) => (
          <div key={offer.id} className="flex items-center gap-3 p-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-green-50 text-lg font-black text-green-700">
              {offer.title?.trim().slice(0, 1).toUpperCase() || 'O'}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate font-bold text-slate-950">{offer.title || 'Untitled offer'}</p>
                <span className="shrink-0 rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-bold text-green-700">{status.label}</span>
              </div>
              <p className="mt-1 text-sm text-slate-500">
                {redemptionCountByOfferId[offer.id] ?? 0} redemptions
              </p>
            </div>
            <span className="text-xl text-slate-400">›</span>
          </div>
        )) : (
          <div className="p-4 text-sm text-slate-500">No active offers yet.</div>
        )}
      </div>
    </section>
  )
}

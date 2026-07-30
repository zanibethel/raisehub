'use client'

import Link from 'next/link'
import type { ComponentProps } from 'react'

import BusinessDashboardContent from './business-dashboard-content'
import BusinessOffersSummary from './business-offers-summary'

type Props = ComponentProps<typeof BusinessDashboardContent>

export default function BusinessCommandCenter(props: Props) {
  const profileComplete = Boolean(
    props.profile?.business_name &&
      props.profile?.phone &&
      props.profile?.address &&
      props.profile?.logo_url
  )

  const actions = [
    !profileComplete
      ? {
          title: 'Complete your business profile',
          description: 'Add the missing details customers need to recognize your business.',
          href: '#business-profile',
        }
      : null,
    props.activeOffersCount < props.activeOfferLimit
      ? {
          title: 'You have room for more offers',
          description: 'Add another strong offer to give customers more reasons to visit.',
          href: '#create-offer',
        }
      : null,
    !props.profile?.redemption_method
      ? {
          title: 'Set up a redemption method',
          description: 'Choose how customers will redeem offers at your business.',
          href: '#business-redemption-settings',
        }
      : null,
  ].filter(Boolean) as { title: string; description: string; href: string }[]

  return (
    <div className="mt-4 space-y-4 sm:mt-5 sm:space-y-5">
      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-black text-slate-950">Customer activity</h2>
          <Link href="#full-business-tools" className="text-sm font-bold text-green-700">
            View details
          </Link>
        </div>
        <div className="mt-4 grid grid-cols-3 divide-x divide-slate-200">
          <div className="px-2 text-center">
            <p className="text-xs font-bold text-blue-700">Views</p>
            <p className="mt-1 text-2xl font-black text-slate-950">{props.viewCount}</p>
          </div>
          <div className="px-2 text-center">
            <p className="text-xs font-bold text-green-700">Clicks</p>
            <p className="mt-1 text-2xl font-black text-slate-950">{props.clickCount}</p>
          </div>
          <div className="px-2 text-center">
            <p className="text-xs font-bold text-amber-700">Click rate</p>
            <p className="mt-1 text-2xl font-black text-slate-950">{props.conversionRate}%</p>
          </div>
        </div>
      </section>

      {actions.length > 0 ? (
        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-rose-700">Needs your attention</p>
              <h2 className="mt-1 text-xl font-black text-slate-950">Recommended actions</h2>
            </div>
            <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-black text-rose-700">
              {actions.length} {actions.length === 1 ? 'item' : 'items'}
            </span>
          </div>
          <div className="mt-4 divide-y divide-slate-100 rounded-2xl border border-slate-200">
            {actions.slice(0, 3).map((action) => (
              <Link key={action.title} href={action.href} className="flex items-center gap-3 p-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 font-black text-white">→</span>
                <span className="min-w-0 flex-1">
                  <span className="block font-bold text-slate-950">{action.title}</span>
                  <span className="mt-0.5 block text-sm leading-5 text-slate-500">{action.description}</span>
                </span>
                <span className="text-xl text-slate-400">›</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <BusinessOffersSummary
        offers={props.offers}
        redemptionCountByOfferId={props.redemptionCountByOfferId}
      />

      <details id="full-business-tools" className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <summary className="cursor-pointer list-none p-4 text-center font-bold text-green-700 sm:p-5">
          Open full business tools
        </summary>
        <div id="full-offer-management" className="border-t border-slate-200 p-4 sm:p-5">
          <BusinessDashboardContent {...props} />
        </div>
      </details>
    </div>
  )
}

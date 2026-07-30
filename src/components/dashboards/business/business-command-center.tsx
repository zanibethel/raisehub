'use client'

import Link from 'next/link'
import type { ComponentProps } from 'react'

import BusinessDashboardContent from './business-dashboard-content'
import BusinessOffersSummary from './business-offers-summary'
import { WorkspaceModule } from '@/components/workspace/workspace-module'

type Props = ComponentProps<typeof BusinessDashboardContent>

function ActivityIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5"><path d="M4 20V10" /><path d="M10 20V4" /><path d="M16 20v-7" /><path d="M22 20H2" /></svg>
}

function AttentionIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5"><path d="M12 3 2.8 19h18.4L12 3Z" /><path d="M12 9v4" /><path d="M12 17h.01" /></svg>
}

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
          href: '/dashboard/offers#business-profile',
        }
      : null,
    props.activeOffersCount < props.activeOfferLimit
      ? {
          title: 'You have room for more offers',
          description: 'Add another strong offer to give customers more reasons to visit.',
          href: '/dashboard/offers#create-offer',
        }
      : null,
    !props.profile?.redemption_method
      ? {
          title: 'Set up a redemption method',
          description: 'Choose how customers will redeem offers at your business.',
          href: '/dashboard/offers#business-redemption-settings',
        }
      : null,
  ].filter(Boolean) as { title: string; description: string; href: string }[]

  return (
    <div className="mt-4 space-y-4 sm:mt-5 sm:space-y-5">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start">
        <WorkspaceModule
          title="Customer activity"
          eyebrow="Today’s snapshot"
          icon={<ActivityIcon />}
          tone="blue"
          action={<Link href="/dashboard/reports" className="text-sm font-bold text-green-700">View reports</Link>}
        >
          <div className="grid grid-cols-3 divide-x divide-slate-200">
            <div className="px-2 text-center"><p className="text-xs font-bold text-blue-700">Views</p><p className="mt-1 text-2xl font-black text-slate-950">{props.viewCount}</p></div>
            <div className="px-2 text-center"><p className="text-xs font-bold text-green-700">Clicks</p><p className="mt-1 text-2xl font-black text-slate-950">{props.clickCount}</p></div>
            <div className="px-2 text-center"><p className="text-xs font-bold text-amber-700">Click rate</p><p className="mt-1 text-2xl font-black text-slate-950">{props.conversionRate}%</p></div>
          </div>
        </WorkspaceModule>

        {actions.length > 0 ? (
          <WorkspaceModule
            title="Recommended actions"
            eyebrow="Needs your attention"
            icon={<AttentionIcon />}
            tone="rose"
            badge={<span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-black text-rose-700">{actions.length} {actions.length === 1 ? 'item' : 'items'}</span>}
          >
            <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200">
              {actions.slice(0, 3).map((action) => (
                <Link key={action.title} href={action.href} className="flex items-center gap-3 p-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 font-black text-white">→</span>
                  <span className="min-w-0 flex-1"><span className="block font-bold text-slate-950">{action.title}</span><span className="mt-0.5 block text-sm leading-5 text-slate-500">{action.description}</span></span>
                  <span className="text-xl text-slate-400">›</span>
                </Link>
              ))}
            </div>
          </WorkspaceModule>
        ) : null}
      </div>

      <BusinessOffersSummary
        offers={props.offers}
        redemptionCountByOfferId={props.redemptionCountByOfferId}
      />
    </div>
  )
}

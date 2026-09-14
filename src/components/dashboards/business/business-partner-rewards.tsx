'use client'

import Link from 'next/link'

import type { PartnerRewardsSummary } from '@/lib/repositories/partner-rewards-repository'
import { PARTNER_POINTS_DISCLOSURE } from '@/lib/rewards/partner-rewards'

type ProfileState = {
  business_name?: string | null
  phone?: string | null
  address?: string | null
  logo_url?: string | null
}

type RewardsProps = {
  summary: PartnerRewardsSummary
  profile: ProfileState | null
  activeOffersCount: number
}

function formatPoints(value: number) {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(value)
}

function formatPercent(value: number | null) {
  if (value === null) return 'Calculating as the network grows'
  return `${(value * 100).toFixed(2)}%`
}

function profileIsComplete(profile: ProfileState | null) {
  return Boolean(
    profile?.business_name && profile.phone && profile.address && profile.logo_url
  )
}

export function PartnerRewardsDashboardCard({ summary }: { summary: PartnerRewardsSummary }) {
  return (
    <Link
      href="/dashboard/rewards"
      className="block rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-green-50 p-4 shadow-sm transition hover:border-amber-300 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-700">Partner Rewards</p>
          <p className="mt-1 text-3xl font-black text-slate-950">{formatPoints(summary.totalPoints)} points</p>
          <p className="mt-1 text-sm text-slate-600">{summary.period?.label ?? 'Current quarter'}</p>
        </div>
        <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-black text-white">
          {summary.period?.label ?? 'Rewards'}
        </span>
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-500">
        Points determine your share of the quarterly Partner Rewards Pool. They do not have a fixed cash value.
      </p>
      <div className="mt-3 flex items-center justify-between text-sm font-bold text-green-700">
        <span>View Rewards Center</span>
        <span aria-hidden="true">→</span>
      </div>
    </Link>
  )
}

export default function BusinessPartnerRewardsCenter({
  summary,
  profile,
  activeOffersCount,
}: RewardsProps) {
  const completeProfile = profileIsComplete(profile)
  const earningSteps = [
    {
      title: 'Complete your business profile',
      description: 'Complete the required public business details to qualify for setup points.',
      complete: completeProfile,
      points: 100,
      href: '/dashboard/offers#business-profile',
    },
    {
      title: 'Apply for business verification',
      description: 'Verification will unlock quarterly Partner Rewards eligibility when that workflow is activated.',
      complete: false,
      points: 200,
      href: '#verification-coming-soon',
    },
    {
      title: 'Keep quality offers active',
      description: activeOffersCount > 0
        ? `${activeOffersCount} active ${activeOffersCount === 1 ? 'offer is' : 'offers are'} currently helping build your rewards opportunity.`
        : 'Add an active customer offer. Higher-quality offers will earn at a stronger daily weight.',
      complete: activeOffersCount > 0,
      points: null,
      href: '/dashboard/offers',
    },
    {
      title: 'Refer another local business',
      description: 'Qualified referrals will earn milestone points as the referred business completes onboarding and verification.',
      complete: false,
      points: 500,
      href: '#referrals-coming-soon',
    },
  ]

  return (
    <div className="mt-4 space-y-4 sm:mt-5 sm:space-y-5">
      <section className="rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-green-50 p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-700">Current earning period</p>
            <h2 className="mt-1 text-3xl font-black text-slate-950">{summary.period?.label ?? 'Partner Rewards'}</h2>
            {summary.period ? (
              <p className="mt-1 text-sm text-slate-500">
                {new Date(summary.period.starts_at).toLocaleDateString()} – {new Date(summary.period.ends_at).toLocaleDateString()}
              </p>
            ) : null}
          </div>
          <div className="rounded-2xl bg-slate-950 px-5 py-3 text-white">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-300">Points so far</p>
            <p className="text-3xl font-black">{formatPoints(summary.totalPoints)}</p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-black uppercase tracking-wide text-slate-500">Eligible</p>
            <p className="mt-1 text-2xl font-black text-green-700">{formatPoints(summary.eligiblePoints)}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-black uppercase tracking-wide text-slate-500">Pending</p>
            <p className="mt-1 text-2xl font-black text-amber-700">{formatPoints(summary.pendingPoints)}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-black uppercase tracking-wide text-slate-500">Current pool share</p>
            <p className="mt-1 text-lg font-black text-slate-950">{formatPercent(summary.currentShare)}</p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-blue-200 bg-blue-50 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-700 font-black text-white">i</span>
          <div>
            <h3 className="font-black text-slate-950">Points are not dollars</h3>
            <p className="mt-1 text-sm leading-6 text-slate-700">{PARTNER_POINTS_DISCLOSURE}</p>
            <details className="mt-2">
              <summary className="cursor-pointer text-sm font-black text-blue-700">Learn how Partner Rewards work</summary>
              <div className="mt-3 rounded-xl border border-blue-200 bg-white p-3 text-sm leading-6 text-slate-700">
                <p><strong>Your eligible points ÷ all eligible Partner Points = your percentage of that quarter’s rewards pool.</strong></p>
                <p className="mt-2">The pool changes with qualifying RaiseHub platform performance, so a Partner Point never has a guaranteed fixed cash value.</p>
              </div>
            </details>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-green-700">What should I do next?</p>
            <h3 className="mt-1 text-xl font-black text-slate-950">Ways to earn more</h3>
          </div>
          <span className="text-sm font-bold text-slate-500">{summary.period?.label ?? 'Current quarter'}</span>
        </div>

        <div className="mt-4 divide-y divide-slate-100 rounded-2xl border border-slate-200">
          {earningSteps.map((step) => (
            <Link key={step.title} href={step.href} className="flex items-start gap-3 p-4">
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-black ${step.complete ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                {step.complete ? '✓' : '+'}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-black text-slate-950">{step.title}</span>
                  {step.points ? <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-black text-amber-800">up to +{step.points}</span> : null}
                </span>
                <span className="mt-1 block text-sm leading-5 text-slate-500">{step.description}</span>
              </span>
              <span className="text-lg text-slate-400" aria-hidden="true">›</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <h3 className="text-xl font-black text-slate-950">Recent points activity</h3>
        {summary.recentEvents.length > 0 ? (
          <div className="mt-3 divide-y divide-slate-100">
            {summary.recentEvents.map((event) => (
              <div key={event.id} className="flex items-center justify-between gap-4 py-3">
                <div>
                  <p className="font-bold text-slate-900">{event.event_type.replaceAll('_', ' ')}</p>
                  <p className="text-xs text-slate-500">{new Date(event.created_at).toLocaleString()} · {event.eligibility_status}</p>
                </div>
                <span className="font-black text-green-700">{event.points > 0 ? '+' : ''}{formatPoints(event.points)}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm leading-6 text-slate-600">
            Your Rewards Center is ready. Point events will appear here as earning rules are connected to profile completion, offer activity, redemptions, verification, and referrals.
          </div>
        )}
      </section>
    </div>
  )
}

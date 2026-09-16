'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

import type {
  PartnerRewardMarketplaceItem,
  PartnerRewardQuarterHistoryItem,
  PartnerRewardRedemption,
  PartnerRewardsSummary,
} from '@/lib/repositories/partner-rewards-repository'
import { PARTNER_POINTS_DISCLOSURE } from '@/lib/rewards/partner-rewards'
import { redeemPartnerRewardAction } from './business-partner-rewards-actions'

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
  businessId: string | null
}

function formatPoints(value: number) {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(value)
}

function formatPercent(value: number | null) {
  if (value === null) return 'Calculating as the network grows'
  return `${(value * 100).toFixed(2)}%`
}

function formatMoney(cents: number) {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100)
}

function formatDate(value: string | null) {
  if (!value) return 'No expiration'
  return new Date(value).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function payoutStatusLabel(status: PartnerRewardQuarterHistoryItem['payoutStatus']) {
  if (status === 'pending') return 'Processing'
  if (status === 'submitted') return 'Transferred to Stripe'
  if (status === 'paid') return 'Paid'
  if (status === 'failed') return 'Needs attention'
  if (status === 'reversed') return 'Reversed'
  return 'Awaiting payout'
}

function payoutStatusClass(status: PartnerRewardQuarterHistoryItem['payoutStatus']) {
  if (status === 'submitted' || status === 'paid') return 'bg-green-100 text-green-800'
  if (status === 'failed' || status === 'reversed') return 'bg-rose-100 text-rose-800'
  if (status === 'pending') return 'bg-amber-100 text-amber-800'
  return 'bg-slate-100 text-slate-700'
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

function MarketplaceItemCard({
  item,
  eligiblePoints,
  pending,
  activeRedemption,
  onRedeem,
}: {
  item: PartnerRewardMarketplaceItem
  eligiblePoints: number
  pending: boolean
  activeRedemption: PartnerRewardRedemption | null
  onRedeem: (item: PartnerRewardMarketplaceItem) => void
}) {
  const canAfford = eligiblePoints >= item.point_cost
  const pointsNeeded = Math.max(0, item.point_cost - eligiblePoints)
  const isActive = Boolean(activeRedemption)

  return (
    <div className={`rounded-2xl border p-4 ${isActive ? 'border-green-200 bg-green-50/60' : item.is_active ? 'border-amber-200 bg-amber-50/40' : 'border-slate-200 bg-slate-50'}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-black text-slate-950">{item.name}</p>
          <p className="mt-1 text-sm leading-5 text-slate-600">{item.description}</p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-black ${isActive ? 'bg-green-100 text-green-800' : item.is_active ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-600'}`}>
          {isActive ? 'Active' : item.is_active ? `${formatPoints(item.point_cost)} pts` : 'Coming soon'}
        </span>
      </div>

      {item.duration_days ? (
        <p className="mt-2 text-xs font-bold text-slate-500">Benefit lasts {item.duration_days} days.</p>
      ) : null}

      {isActive ? (
        <div className="mt-4 rounded-xl border border-green-200 bg-white px-3 py-2 text-center text-xs font-black text-green-800">
          Active until {formatDate(activeRedemption?.ends_at ?? null)}
        </div>
      ) : item.is_active ? (
        <button
          type="button"
          disabled={!canAfford || pending}
          onClick={() => onRedeem(item)}
          className="mt-4 inline-flex min-h-10 w-full items-center justify-center rounded-xl bg-slate-950 px-4 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {pending
            ? 'Applying reward…'
            : canAfford
              ? `Use ${formatPoints(item.point_cost)} points`
              : `Earn ${formatPoints(pointsNeeded)} more points`}
        </button>
      ) : (
        <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-white px-3 py-2 text-center text-xs font-bold text-slate-500">
          We’ll enable this when the related promotion experience is live.
        </div>
      )}
    </div>
  )
}

export default function BusinessPartnerRewardsCenter({
  summary,
  profile,
  activeOffersCount,
  businessId,
}: RewardsProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)
  const completeProfile = profileIsComplete(profile)

  function redeem(item: PartnerRewardMarketplaceItem) {
    if (!businessId || isPending || !item.is_active) return

    const confirmed = window.confirm(
      `Use ${formatPoints(item.point_cost)} Partner Points for ${item.name}?\n\nSpent points will no longer count toward your share of this quarter’s Partner Rewards Pool.`
    )
    if (!confirmed) return

    setMessage(null)
    startTransition(async () => {
      const result = await redeemPartnerRewardAction(businessId, item.code)
      if (!result.success) {
        setMessage({ tone: 'error', text: result.error })
        return
      }

      setMessage({
        tone: 'success',
        text: `${item.name} activated. You have ${formatPoints(result.remainingEligiblePoints)} eligible points remaining.`,
      })
      router.refresh()
    })
  }

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

  const marketplaceItems = summary.marketplaceItems
  const marketplaceNameById = Object.fromEntries(
    marketplaceItems.map((item) => [item.id, item.name])
  )
  const activeRedemptionByItemId = new Map(
    summary.activeRedemptions.map((redemption) => [redemption.marketplace_item_id, redemption])
  )

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
                <p className="mt-2"><strong>Using points now is a tradeoff:</strong> points redeemed for RaiseHub benefits are removed from your eligible quarter total and no longer increase your quarter-end pool share.</p>
              </div>
            </details>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-green-700">Cash rewards</p>
            <h3 className="mt-1 text-xl font-black text-slate-950">Quarter history</h3>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
              Final cash awards appear after a quarter closes. “Transferred to Stripe” means RaiseHub moved the award into your connected Stripe balance; it does not mean a bank deposit has already cleared.
            </p>
          </div>
        </div>

        {summary.quarterHistory.length > 0 ? (
          <div className="mt-4 divide-y divide-slate-100 rounded-2xl border border-slate-200">
            {summary.quarterHistory.map((item) => (
              <div key={item.awardId} className="grid gap-3 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-black text-slate-950">{item.periodLabel}</p>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-black ${payoutStatusClass(item.payoutStatus)}`}>
                      {payoutStatusLabel(item.payoutStatus)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">
                    {formatPoints(item.eligiblePoints)} eligible points
                    {item.finalShareFraction === null ? '' : ` · ${(item.finalShareFraction * 100).toFixed(2)}% final share`}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">Finalized {formatDate(item.finalizedAt)}</p>
                  {item.failureMessage && (item.payoutStatus === 'failed' || item.payoutStatus === 'reversed') ? (
                    <p className="mt-2 text-xs font-bold text-rose-700">{item.failureMessage}</p>
                  ) : null}
                </div>
                <div className="sm:text-right">
                  <p className="text-xs font-black uppercase tracking-wide text-slate-500">Final award</p>
                  <p className="mt-1 text-2xl font-black text-slate-950">{formatMoney(item.awardCents)}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm leading-6 text-slate-600">
            Your finalized quarter awards and payout status will appear here after a Partner Rewards quarter closes.
          </div>
        )}
      </section>

      {message ? (
        <div className={`rounded-2xl border p-4 text-sm font-bold ${message.tone === 'success' ? 'border-green-200 bg-green-50 text-green-800' : 'border-rose-200 bg-rose-50 text-rose-800'}`}>
          {message.text}
        </div>
      ) : null}

      <section className="rounded-2xl border border-amber-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-amber-700">Grow now</p>
            <h3 className="mt-1 text-xl font-black text-slate-950">Use your Partner Points</h3>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
              Exchange eligible points for temporary RaiseHub benefits instead of keeping every point for the quarter-end reward pool.
            </p>
          </div>
          <span className="rounded-full bg-green-50 px-3 py-1 text-sm font-black text-green-700">
            {formatPoints(summary.eligiblePoints)} available
          </span>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {marketplaceItems.map((item) => (
            <MarketplaceItemCard
              key={item.id}
              item={item}
              eligiblePoints={summary.eligiblePoints}
              pending={isPending}
              activeRedemption={activeRedemptionByItemId.get(item.id) ?? null}
              onRedeem={redeem}
            />
          ))}
        </div>
      </section>

      {summary.activeRedemptions.length > 0 ? (
        <section className="rounded-2xl border border-green-200 bg-green-50 p-4 shadow-sm sm:p-5">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-green-700">Active benefits</p>
          <h3 className="mt-1 text-xl font-black text-slate-950">Rewards currently working for you</h3>
          <div className="mt-3 divide-y divide-green-100 rounded-2xl border border-green-200 bg-white">
            {summary.activeRedemptions.map((redemption) => (
              <div key={redemption.id} className="flex items-center justify-between gap-4 p-4">
                <div>
                  <p className="font-black text-slate-950">{marketplaceNameById[redemption.marketplace_item_id] ?? 'Partner Reward'}</p>
                  <p className="mt-1 text-xs text-slate-500">Activated {formatDate(redemption.starts_at)} · Ends {formatDate(redemption.ends_at)}</p>
                </div>
                <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-black text-green-800">Active</span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

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
                <span className={`font-black ${event.points >= 0 ? 'text-green-700' : 'text-amber-700'}`}>{event.points > 0 ? '+' : ''}{formatPoints(event.points)}</span>
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

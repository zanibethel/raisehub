import Link from 'next/link'
import type { ReactNode } from 'react'

import type { PlatformMetrics } from '@/lib/repositories/platform-analytics-repository'
import { getOwnerOperationalHealth } from '@/lib/repositories/owner-operational-health-repository'
import type { PartnerRewardsQuarterReport } from '@/lib/services/partner-rewards-quarter-report-service'
import { createAdminClient } from '@/lib/supabase/admin'

type Props = {
  platformMetrics?: PlatformMetrics | null
  rewardsReport?: PartnerRewardsQuarterReport | null
}

function money(cents: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(Number(cents ?? 0) / 100)
}

function SearchIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6"><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></svg>
}

function ReviewIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6"><path d="M4 5h16v14H4z" /><path d="M8 9h8M8 13h5" /><path d="m15 17 2 2 4-4" /></svg>
}

function VerifyIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6"><path d="M12 3 4 7v5c0 5 3.4 8.2 8 9 4.6-.8 8-4 8-9V7l-8-4Z" /><path d="m9 12 2 2 4-4" /></svg>
}

function SupportIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6"><path d="M4 5h16v11H8l-4 4z" /><path d="M8 9h8M8 13h5" /></svg>
}

function QuickAction({
  href,
  title,
  tone,
  icon,
}: {
  href: string
  title: string
  tone: 'blue' | 'violet' | 'green' | 'amber'
  icon: ReactNode
}) {
  const toneClasses = {
    blue: 'bg-blue-100 text-blue-700',
    violet: 'bg-violet-100 text-violet-700',
    green: 'bg-green-100 text-green-700',
    amber: 'bg-amber-100 text-amber-700',
  }[tone]

  return (
    <Link
      href={href}
      className="flex min-h-28 flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white px-2 py-3 text-center shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <span className={`flex h-11 w-11 items-center justify-center rounded-2xl ${toneClasses}`}>
        {icon}
      </span>
      <span className="mt-2 text-xs font-black leading-4 text-slate-800 sm:text-sm">{title}</span>
    </Link>
  )
}

function AttentionRow({
  href,
  title,
  description,
  count,
  tone,
}: {
  href: string
  title: string
  description: string
  count: number
  tone: 'rose' | 'amber' | 'blue' | 'green'
}) {
  const toneClasses = {
    rose: 'bg-rose-50 text-rose-700',
    amber: 'bg-amber-50 text-amber-700',
    blue: 'bg-blue-50 text-blue-700',
    green: 'bg-green-50 text-green-700',
  }[tone]

  return (
    <Link href={href} className="flex items-center gap-3 py-3.5">
      <span className={`flex h-10 min-w-10 shrink-0 items-center justify-center rounded-2xl px-2 text-sm font-black ${toneClasses}`}>
        {count}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-black text-slate-950">{title}</span>
        <span className="mt-0.5 block text-xs leading-5 text-slate-500">{description}</span>
      </span>
      <span aria-hidden="true" className="shrink-0 text-xl text-slate-400">›</span>
    </Link>
  )
}

export default async function OwnerCommandCenter({
  platformMetrics = null,
  rewardsReport = null,
}: Props) {
  const admin = createAdminClient() as any

  const [
    productionBusinessesResult,
    pendingVerificationsResult,
    campaignReviewsResult,
    supportResult,
    health,
  ] = await Promise.all([
    admin
      .from('businesses')
      .select('id')
      .eq('is_demo', false)
      .is('demo_group', null)
      .eq('status', 'active'),
    admin
      .from('business_verifications')
      .select('business_id')
      .eq('status', 'pending'),
    admin
      .from('campaigns')
      .select('id', { count: 'exact', head: true })
      .eq('is_demo', false)
      .is('demo_group', null)
      .in('review_status', ['pending', 'changes_requested', 'rejected', 'suspended']),
    admin
      .from('support_requests')
      .select('id', { count: 'exact', head: true })
      .in('status', ['open', 'in_progress']),
    getOwnerOperationalHealth(),
  ])

  const productionBusinessIds = new Set(
    (productionBusinessesResult.data ?? []).map((business: { id: string }) => business.id)
  )
  const pendingVerificationCount = (pendingVerificationsResult.data ?? []).filter(
    (verification: { business_id: string }) => productionBusinessIds.has(verification.business_id)
  ).length
  const campaignReviewCount = Number(campaignReviewsResult.count ?? 0)
  const supportCount = Number(supportResult.count ?? 0)
  const healthCount =
    health.failedWebhooks24h +
    health.staleProcessingWebhooks +
    health.failedCheckouts24h +
    health.failedPayouts24h
  const totalAttention =
    pendingVerificationCount + campaignReviewCount + supportCount + healthCount

  const metrics = {
    businesses: platformMetrics?.businessCount ?? 0,
    organizations: platformMetrics?.organizationCount ?? 0,
    campaigns: platformMetrics?.activeCampaignCount ?? 0,
    offers: platformMetrics?.activeOfferCount ?? 0,
  }

  return (
    <div className="-mx-3 -mt-4 pb-2 sm:mx-0 sm:mt-0">
      <section className="relative overflow-hidden bg-slate-950 px-5 py-8 text-white sm:rounded-3xl sm:px-8 sm:py-10">
        <span className="absolute -right-12 -top-12 h-44 w-44 rounded-full bg-blue-500/20" />
        <span className="absolute -bottom-20 right-12 h-56 w-56 rounded-full bg-violet-500/15" />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/90 to-blue-950/65" />

        <div className="relative z-10 flex items-end gap-4">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white text-xl font-black text-slate-950 shadow-lg">
            RH
          </span>
          <div className="min-w-0">
            <p className="text-sm font-bold text-blue-200">RaiseHub Owner Console</p>
            <h1 className="mt-1 text-2xl font-black leading-tight sm:text-3xl">Platform command center</h1>
            <p className="mt-1 text-sm text-white/80">
              {totalAttention > 0
                ? `${totalAttention} operational item${totalAttention === 1 ? '' : 's'} currently need attention.`
                : 'Core operational queues are clear.'}
            </p>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-4 divide-x divide-slate-200 border-b border-slate-200 bg-white px-2 py-4 shadow-sm sm:mt-4 sm:rounded-2xl sm:border sm:px-5">
        <div className="min-w-0 px-1 text-center">
          <p className="truncate text-xl font-black text-slate-950 sm:text-2xl">{metrics.businesses.toLocaleString()}</p>
          <p className="mt-1 text-[10px] font-bold leading-4 text-slate-500 sm:text-[11px]">Businesses</p>
        </div>
        <div className="min-w-0 px-1 text-center">
          <p className="truncate text-xl font-black text-slate-950 sm:text-2xl">{metrics.organizations.toLocaleString()}</p>
          <p className="mt-1 text-[10px] font-bold leading-4 text-slate-500 sm:text-[11px]">Organizations</p>
        </div>
        <div className="min-w-0 px-1 text-center">
          <p className="truncate text-xl font-black text-slate-950 sm:text-2xl">{metrics.campaigns.toLocaleString()}</p>
          <p className="mt-1 text-[10px] font-bold leading-4 text-slate-500 sm:text-[11px]">Campaigns</p>
        </div>
        <div className="min-w-0 px-1 text-center">
          <p className="truncate text-xl font-black text-slate-950 sm:text-2xl">{metrics.offers.toLocaleString()}</p>
          <p className="mt-1 text-[10px] font-bold leading-4 text-slate-500 sm:text-[11px]">Offers</p>
        </div>
      </section>

      <div className="space-y-7 px-3 pt-6 sm:px-0">
        <section>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-700">Operate RaiseHub</p>
          <h2 className="mt-1 text-xl font-black text-slate-950">Quick Actions</h2>
          <div className="mt-3 grid grid-cols-4 gap-2.5">
            <QuickAction href="/dashboard/owner/support" title="Find Account" tone="blue" icon={<SearchIcon />} />
            <QuickAction href="/dashboard/owner/campaign-reviews" title="Campaign Reviews" tone="violet" icon={<ReviewIcon />} />
            <QuickAction href="/dashboard/owner/business-verifications" title="Verify Business" tone="green" icon={<VerifyIcon />} />
            <QuickAction href="/dashboard/owner/support/requests" title="Support Queue" tone="amber" icon={<SupportIcon />} />
          </div>
        </section>

        <section>
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-rose-700">Needs attention</p>
              <h2 className="mt-1 text-xl font-black text-slate-950">Operational queues</h2>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-black ${
              totalAttention > 0 ? 'bg-rose-100 text-rose-700' : 'bg-green-100 text-green-700'
            }`}>
              {totalAttention}
            </span>
          </div>

          <div className="mt-3 divide-y divide-slate-200 border-y border-slate-200">
            <AttentionRow
              href="/dashboard/owner/business-verifications"
              title="Business Verification"
              description={pendingVerificationCount > 0 ? 'Production businesses are waiting for Owner review.' : 'No production business verifications are waiting.'}
              count={pendingVerificationCount}
              tone={pendingVerificationCount > 0 ? 'rose' : 'green'}
            />
            <AttentionRow
              href="/dashboard/owner/campaign-reviews"
              title="Campaign reviews"
              description={campaignReviewCount > 0 ? 'Campaigns have review states requiring Owner attention.' : 'Campaign review queue is clear.'}
              count={campaignReviewCount}
              tone={campaignReviewCount > 0 ? 'amber' : 'green'}
            />
            <AttentionRow
              href="/dashboard/owner/support/requests"
              title="Support requests"
              description={supportCount > 0 ? 'Open or in-progress support requests need follow-up.' : 'No open support requests.'}
              count={supportCount}
              tone={supportCount > 0 ? 'blue' : 'green'}
            />
            <AttentionRow
              href="/dashboard/owner/health"
              title="Platform health"
              description={
                healthCount > 0
                  ? 'Recent payment, checkout, webhook, or payout failures need review.'
                  : health.errors.length > 0
                    ? 'Monitoring is partially degraded; review platform health.'
                    : 'Operational monitors are currently clear.'
              }
              count={healthCount}
              tone={healthCount > 0 || health.errors.length > 0 ? 'rose' : 'green'}
            />
          </div>
        </section>

        <section>
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Platform workspaces</p>
              <h2 className="mt-1 text-xl font-black text-slate-950">Manage the platform</h2>
            </div>
            <Link href="/dashboard/owner/manage" className="text-sm font-black text-blue-700">View all →</Link>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3">
            {[
              ['Businesses', 'Offers, verification, redemptions, and profiles', '/dashboard/owner/businesses'],
              ['Organizations', 'Campaigns, sellers, payouts, and fundraising', '/dashboard/owner/organizations'],
              ['Customers', 'Passes, purchases, savings, and activity', '/dashboard/owner/customers'],
              ['Demo Center', 'Curated scenarios and role previews', '/dashboard/owner/demos'],
            ].map(([title, description, href]) => (
              <Link
                key={title}
                href={href}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-300 hover:bg-blue-50"
              >
                <span className="block text-sm font-black text-slate-950">{title}</span>
                <span className="mt-1 block text-xs leading-5 text-slate-500">{description}</span>
                <span className="mt-3 block text-xs font-black text-blue-700">Open →</span>
              </Link>
            ))}
          </div>
        </section>

        {rewardsReport ? (
          <section>
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-700">Partner Rewards</p>
                <h2 className="mt-1 text-xl font-black text-slate-950">{rewardsReport.label}</h2>
              </div>
              <Link href="/dashboard/owner/partner-rewards" className="text-sm font-black text-blue-700">Full report →</Link>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-[11px] font-black uppercase tracking-wide text-slate-500">Qualifying sales</p>
                <p className="mt-1 text-xl font-black text-slate-950">{money(rewardsReport.qualifyingSalesCents)}</p>
              </div>
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-[11px] font-black uppercase tracking-wide text-amber-700">Rewards pool</p>
                <p className="mt-1 text-xl font-black text-slate-950">{money(rewardsReport.partnerRewardsPoolCents)}</p>
              </div>
              <div className="rounded-2xl border border-green-200 bg-green-50 p-4">
                <p className="text-[11px] font-black uppercase tracking-wide text-green-700">Expected payout</p>
                <p className="mt-1 text-xl font-black text-slate-950">{money(rewardsReport.expectedDisbursementCents)}</p>
              </div>
              <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
                <p className="text-[11px] font-black uppercase tracking-wide text-blue-700">Eligible points</p>
                <p className="mt-1 text-xl font-black text-slate-950">{rewardsReport.eligiblePoints.toLocaleString()}</p>
                <p className="mt-1 text-[11px] font-bold text-slate-500">{rewardsReport.pendingPoints.toLocaleString()} pending</p>
              </div>
            </div>
          </section>
        ) : null}
      </div>
    </div>
  )
}

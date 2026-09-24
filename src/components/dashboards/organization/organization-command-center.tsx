import Link from 'next/link'
import type { ComponentProps, ReactNode } from 'react'

import OrganizationDashboardContent from './organization-dashboard-content'

type Props = ComponentProps<typeof OrganizationDashboardContent> & {
  organizationName: string
  organizationLocation: string
}

function metricValue(value: number) {
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 })
}

function formatDate(value?: string | null) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function CampaignIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6"><path d="M4 5h16v14H4z" /><path d="M8 3v4M16 3v4M8 11h8M8 15h5" /></svg>
}

function ReportIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6"><path d="M4 20V10" /><path d="M10 20V4" /><path d="M16 20v-7" /><path d="M22 20H2" /></svg>
}

function ShareIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="m8.6 10.5 6.8-4" /><path d="m8.6 13.5 6.8 4" /></svg>
}

function PlusIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6"><path d="M12 5v14M5 12h14" /></svg>
}

function QuickAction({
  href,
  title,
  tone,
  icon,
}: {
  href: string
  title: string
  tone: 'blue' | 'violet' | 'amber' | 'green'
  icon: ReactNode
}) {
  const toneClasses = {
    blue: 'bg-blue-100 text-blue-700',
    violet: 'bg-violet-100 text-violet-700',
    amber: 'bg-amber-100 text-amber-700',
    green: 'bg-green-100 text-green-700',
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

function campaignStatusLabel(status?: string | null) {
  const value = status?.trim().toLowerCase()
  if (!value) return 'Draft'
  return value.charAt(0).toUpperCase() + value.slice(1)
}

export default function OrganizationCommandCenter({
  organizationName,
  organizationLocation,
  ...props
}: Props) {
  const campaignPreview = props.campaigns.slice(0, 6)
  const recentActivity = props.campaigns.slice(0, 3)
  const activeCampaign = props.sellerCampaigns[0] ?? null
  const shareHref = activeCampaign ? `/campaigns/${activeCampaign.id}` : '/dashboard/campaigns'

  const nextSteps = [
    ...(props.activeCampaigns === 0
      ? [{
          title: 'Launch your next fundraiser',
          description: 'Create or finish a campaign so supporters can begin purchasing passes.',
          href: '/dashboard/campaigns#create-campaign',
        }]
      : []),
    ...(props.totalSellers === 0
      ? [{
          title: 'Add sellers to your roster',
          description: 'Give participants referral links and QR codes before your fundraiser launches.',
          href: '/dashboard/campaigns#organization-sellers',
        }]
      : []),
    ...(props.totalSupporters === 0 && props.activeCampaigns > 0
      ? [{
          title: 'Share your active fundraiser',
          description: 'Invite the first supporters and give sellers a clear next step.',
          href: shareHref,
        }]
      : []),
  ].slice(0, 3)

  return (
    <div className="-mx-3 -mt-4 pb-2 sm:mx-0 sm:mt-0">
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-700 via-blue-600 to-cyan-500 px-5 py-8 text-white sm:rounded-3xl sm:px-8 sm:py-10">
        <span className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10" />
        <span className="absolute -bottom-16 right-16 h-48 w-48 rounded-full bg-cyan-300/15" />
        <div className="absolute inset-0 bg-gradient-to-r from-blue-950/70 via-blue-800/55 to-transparent" />
        <div className="relative z-10 flex items-end gap-4">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-2xl font-black ring-1 ring-white/20">
            {organizationName.trim().charAt(0).toUpperCase() || 'O'}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-bold text-white/80">Welcome back,</p>
            <h1 className="mt-1 text-2xl font-black leading-tight sm:text-3xl">{organizationName}</h1>
            <p className="mt-1 text-sm text-white/85">{organizationLocation} · Keep the momentum going.</p>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-3 divide-x divide-slate-200 border-b border-slate-200 bg-white px-3 py-4 shadow-sm sm:mt-4 sm:rounded-2xl sm:border sm:px-5">
        <div className="min-w-0 px-2 text-center">
          <p className="truncate text-2xl font-black text-slate-950">${metricValue(props.totalFundsRaised)}</p>
          <p className="mt-1 text-[11px] font-bold leading-4 text-slate-500">Raised</p>
        </div>
        <div className="min-w-0 px-2 text-center">
          <p className="truncate text-2xl font-black text-slate-950">{props.totalSupporters.toLocaleString()}</p>
          <p className="mt-1 text-[11px] font-bold leading-4 text-slate-500">Supporters</p>
        </div>
        <div className="min-w-0 px-2 text-center">
          <p className="truncate text-2xl font-black text-slate-950">{props.totalCampaigns.toLocaleString()}</p>
          <p className="mt-1 text-[11px] font-bold leading-4 text-slate-500">Campaigns</p>
        </div>
      </section>

      <div className="space-y-7 px-3 pt-6 sm:px-0">
        <section>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-700">Get things done</p>
          <h2 className="mt-1 text-xl font-black text-slate-950">Quick Actions</h2>
          <div className="mt-3 grid grid-cols-4 gap-2.5">
            <QuickAction href="/dashboard/campaigns" title="Manage Campaigns" tone="blue" icon={<CampaignIcon />} />
            <QuickAction href="/dashboard/reports" title="View Reports" tone="violet" icon={<ReportIcon />} />
            <QuickAction href={shareHref} title="Share & Promote" tone="amber" icon={<ShareIcon />} />
            <QuickAction href="/dashboard/campaigns#create-campaign" title="Create Campaign" tone="green" icon={<PlusIcon />} />
          </div>
        </section>

        <section>
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-violet-700">Latest</p>
              <h2 className="mt-1 text-xl font-black text-slate-950">Recent Activity</h2>
            </div>
            <Link href="/dashboard/reports" className="text-sm font-black text-blue-700">View all →</Link>
          </div>

          {recentActivity.length > 0 ? (
            <div className="mt-3 divide-y divide-slate-200 border-y border-slate-200">
              {recentActivity.map((campaign) => {
                const campaignDetails = campaign as typeof campaign & { created_at?: string | null }
                const metrics = props.metricsByCampaign[campaign.id]
                return (
                  <Link
                    key={campaign.id}
                    href={`/dashboard/campaigns/${campaign.id}/edit`}
                    className="flex items-center gap-3 py-3.5"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                      <CampaignIcon />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-black text-slate-950">{campaign.name || 'Untitled campaign'}</span>
                      <span className="mt-0.5 block text-xs leading-5 text-slate-500">
                        {campaignStatusLabel(campaign.status)} · {metrics?.supporterCount ?? 0} supporters · ${metricValue(metrics?.amountRaised ?? 0)} raised
                      </span>
                    </span>
                    <span className="shrink-0 text-right text-xs font-bold text-slate-400">{formatDate(campaignDetails.created_at)}</span>
                  </Link>
                )
              })}
            </div>
          ) : (
            <div className="mt-3 rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-7 text-center">
              <p className="font-black text-slate-950">No campaign activity yet</p>
              <p className="mt-1 text-sm text-slate-500">Create your first fundraiser to start building activity.</p>
            </div>
          )}
        </section>

        <section>
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-green-700">Fundraising</p>
              <h2 className="mt-1 text-xl font-black text-slate-950">Your Campaigns</h2>
            </div>
            <Link href="/dashboard/campaigns" className="text-sm font-black text-blue-700">View all →</Link>
          </div>

          {campaignPreview.length > 0 ? (
            <div className="-mr-3 mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 pr-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {campaignPreview.map((campaign, index) => {
                const campaignDetails = campaign as typeof campaign & { goal_amount?: number | null }
                const metrics = props.metricsByCampaign[campaign.id]
                const goal = Math.max(Number(campaignDetails.goal_amount ?? 0), 0)
                const raised = Math.max(metrics?.amountRaised ?? 0, 0)
                const progress = goal > 0 ? Math.min((raised / goal) * 100, 100) : 0

                return (
                  <Link
                    key={campaign.id}
                    href={`/dashboard/campaigns/${campaign.id}/edit`}
                    className="min-w-[76%] snap-start overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm sm:min-w-[280px]"
                  >
                    <div className={`relative h-24 overflow-hidden ${index % 3 === 0 ? 'bg-gradient-to-br from-blue-100 via-cyan-50 to-green-100' : index % 3 === 1 ? 'bg-gradient-to-br from-violet-100 via-white to-blue-100' : 'bg-gradient-to-br from-amber-100 via-white to-green-100'}`}>
                      <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-blue-700 shadow-sm">
                        {campaignStatusLabel(campaign.status)}
                      </span>
                      <div className="absolute bottom-3 right-4 text-4xl font-black text-slate-900/10">RH</div>
                    </div>
                    <div className="p-4">
                      <h3 className="line-clamp-2 text-sm font-black leading-5 text-slate-950">{campaign.name || 'Untitled campaign'}</h3>
                      <p className="mt-1 text-xs text-slate-500">{metrics?.supporterCount ?? 0} supporters</p>
                      <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full bg-green-600" style={{ width: `${progress}%` }} />
                      </div>
                      <div className="mt-2 flex items-center justify-between text-xs">
                        <span className="font-black text-green-700">${metricValue(raised)} raised</span>
                        <span className="text-slate-500">{goal > 0 ? `of $${metricValue(goal)}` : 'No goal set'}</span>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          ) : (
            <div className="mt-3 rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-8 text-center">
              <p className="font-black text-slate-950">No campaigns yet</p>
              <p className="mt-1 text-sm text-slate-500">Create your first fundraiser to get started.</p>
              <Link href="/dashboard/campaigns#create-campaign" className="mt-4 inline-flex rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-black text-white">
                Create campaign
              </Link>
            </div>
          )}
        </section>

        {nextSteps.length > 0 ? (
          <section>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-black text-slate-950">Next steps</h2>
              <span className="rounded-full bg-rose-50 px-2.5 py-1 text-xs font-black text-rose-700">{nextSteps.length}</span>
            </div>
            <div className="mt-2 divide-y divide-slate-200 border-y border-slate-200">
              {nextSteps.map((action) => (
                <Link key={action.title} href={action.href} className="flex items-center gap-3 py-3.5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 font-black text-white">→</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-black text-slate-950">{action.title}</span>
                    <span className="mt-0.5 block text-xs leading-5 text-slate-500">{action.description}</span>
                  </span>
                  <span className="text-xl text-slate-400">›</span>
                </Link>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  )
}

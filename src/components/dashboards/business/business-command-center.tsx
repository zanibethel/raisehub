'use client'

import Link from 'next/link'
import { useEffect, useState, type ComponentProps, type ReactNode } from 'react'

import { createClient } from '@/lib/supabase/client'
import { getOfferStatus } from '@/lib/rules/offer-status'
import type { PartnerRewardsSummary } from '@/lib/repositories/partner-rewards-repository'
import BusinessDashboardContent from './business-dashboard-content'
import BusinessNotificationCenter, {
  type BusinessNotification,
  type BusinessNotificationTone,
} from './business-notification-center'

type Props = ComponentProps<typeof BusinessDashboardContent> & {
  rewardsSummary: PartnerRewardsSummary
}

type NotificationRow = {
  id: string
  severity: string
  title: string
  message: string
  action_url: string | null
  action_label: string | null
  created_at: string | null
  dismissed_at?: string | null
  expires_at?: string | null
}

function toBusinessNotificationTone(severity: string): BusinessNotificationTone {
  if (severity === 'success') return 'success'
  if (severity === 'warning') return 'warning'
  if (severity === 'error') return 'danger'
  return 'info'
}

function toBusinessNotification(row: NotificationRow): BusinessNotification {
  return {
    id: row.id,
    title: row.title,
    description: row.message,
    tone: toBusinessNotificationTone(row.severity),
    href: row.action_url ?? undefined,
    actionLabel: row.action_label ?? undefined,
    createdAt: row.created_at,
  }
}

function isActiveNotification(row: NotificationRow) {
  if (row.dismissed_at) return false
  if (!row.expires_at) return true
  return new Date(row.expires_at).getTime() > Date.now()
}

function formatPoints(value: number) {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(value)
}

function formatMoney(value: number) {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}

function ActionIcon({ children, tone }: { children: ReactNode; tone: 'green' | 'blue' | 'violet' | 'amber' }) {
  const toneClasses = {
    green: 'bg-green-100 text-green-700',
    blue: 'bg-blue-100 text-blue-700',
    violet: 'bg-violet-100 text-violet-700',
    amber: 'bg-amber-100 text-amber-700',
  }[tone]

  return (
    <span className={`flex h-11 w-11 items-center justify-center rounded-2xl ${toneClasses}`}>
      {children}
    </span>
  )
}

function TagIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6"><path d="M20 12 12 20 4 12V4h8Z" /><circle cx="9" cy="9" r="1" /></svg>
}

function StoreIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6"><path d="M4 10h16" /><path d="M5 10v9h14v-9" /><path d="m5 4-2 6h18l-2-6H5Z" /><path d="M9 14h6v5H9z" /></svg>
}

function ChartIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6"><path d="M4 20V10" /><path d="M10 20V4" /><path d="M16 20v-7" /><path d="M22 20H2" /></svg>
}

function ShareIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="m8.6 10.5 6.8-4" /><path d="m8.6 13.5 6.8 4" /></svg>
}

function WebsiteIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6"><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 9h18" /><path d="M8 4v5" /><path d="m9 15 2 2 4-4" /></svg>
}

function QuickAction({
  href,
  title,
  tone,
  icon,
}: {
  href: string
  title: string
  tone: 'green' | 'blue' | 'violet' | 'amber'
  icon: ReactNode
}) {
  return (
    <Link
      href={href}
      className="flex min-h-28 flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white px-2 py-3 text-center shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <ActionIcon tone={tone}>{icon}</ActionIcon>
      <span className="mt-2 text-xs font-black leading-4 text-slate-800 sm:text-sm">{title}</span>
    </Link>
  )
}

export default function BusinessCommandCenter({ rewardsSummary, ...props }: Props) {
  const [notifications, setNotifications] = useState<BusinessNotification[]>([])

  useEffect(() => {
    const supabase = createClient()
    let active = true
    let channel: ReturnType<typeof supabase.channel> | null = null

    async function loadNotifications() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user || !active) return

      const { data } = await supabase
        .from('notifications')
        .select(
          'id, severity, title, message, action_url, action_label, created_at, dismissed_at, expires_at'
        )
        .eq('user_id', user.id)
        .is('dismissed_at', null)
        .order('created_at', { ascending: false })
        .limit(8)

      if (!active) return

      const rows = ((data ?? []) as NotificationRow[]).filter(isActiveNotification)
      setNotifications(rows.map(toBusinessNotification))

      channel = supabase
        .channel(`business-command-notifications:${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const row = payload.new as NotificationRow
            if (!isActiveNotification(row)) return
            setNotifications((current) => [
              toBusinessNotification(row),
              ...current.filter((item) => item.id !== row.id),
            ].slice(0, 8))
          }
        )
        .subscribe()
    }

    void loadNotifications()

    return () => {
      active = false
      if (channel) void supabase.removeChannel(channel)
    }
  }, [])

  const businessName =
    props.profile?.business_name || props.profile?.display_name || 'Your Business'
  const logoUrl = props.profile?.logo_url
  const activeOffer = props.offers.find((offer) => {
    const status = getOfferStatus({
      startsAt: offer.starts_at,
      endsAt: offer.ends_at,
      isActive: offer.is_active,
    }).status
    return status === 'active' || status === 'expiring-soon'
  })
  const offerPreview = props.offers.slice(0, 6)
  const shareHref = activeOffer ? `/offers/${activeOffer.id}` : '/dashboard/offers'
  const websiteBuilderHref = props.businessId
    ? `/dashboard/business/website?business=${encodeURIComponent(props.businessId)}`
    : '/dashboard/business/website'

  const profileComplete = Boolean(
    props.profile?.business_name &&
      props.profile?.phone &&
      props.profile?.address &&
      props.profile?.logo_url
  )

  const nextSteps = [
    !profileComplete
      ? {
          title: 'Complete your business profile',
          description: 'Add the missing details customers need to recognize your business.',
          href: '/dashboard/offers#business-profile',
        }
      : null,
    props.isGrowthPlan || props.activeOffersCount < props.activeOfferLimit
      ? {
          title: props.isGrowthPlan ? 'Growth gives you room for another offer' : 'You have room for more offers',
          description: props.isGrowthPlan
            ? 'Create another focused offer whenever it supports a useful customer goal.'
            : 'Add another strong offer to give customers more reasons to visit.',
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
    <div className="-mx-3 -mt-4 pb-2 sm:mx-0 sm:mt-0">
      <section className="relative overflow-hidden bg-slate-950 px-5 py-8 text-white sm:rounded-3xl sm:px-8 sm:py-10">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            alt=""
            className="absolute inset-y-0 right-0 h-full w-3/5 scale-110 object-cover opacity-20 blur-[1px]"
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/90 to-green-950/55" />
        <div className="relative z-10 flex items-end gap-4">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="" className="h-16 w-16 shrink-0 rounded-2xl border border-white/30 bg-white object-contain shadow-lg" />
          ) : (
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-2xl font-black ring-1 ring-white/20">
              {businessName.trim().charAt(0).toUpperCase() || 'B'}
            </span>
          )}
          <div className="min-w-0">
            <p className="text-sm font-bold text-white/80">Welcome back,</p>
            <h1 className="mt-1 text-2xl font-black leading-tight sm:text-3xl">{businessName}</h1>
            <p className="mt-1 text-sm text-white/85">Thanks for supporting local fundraisers.</p>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-3 divide-x divide-slate-200 border-b border-slate-200 bg-white px-3 py-4 shadow-sm sm:mx-0 sm:mt-4 sm:rounded-2xl sm:border sm:px-5">
        <div className="min-w-0 px-2 text-center">
          <p className="truncate text-2xl font-black text-slate-950">{props.viewCount.toLocaleString()}</p>
          <p className="mt-1 text-[11px] font-bold leading-4 text-slate-500">Offer Views</p>
        </div>
        <div className="min-w-0 px-2 text-center">
          <p className="truncate text-2xl font-black text-slate-950">{props.totalRedemptions.toLocaleString()}</p>
          <p className="mt-1 text-[11px] font-bold leading-4 text-slate-500">Deal Redemptions</p>
        </div>
        <div className="min-w-0 px-2 text-center">
          <p className="truncate text-2xl font-black text-slate-950">{formatPoints(rewardsSummary.totalPoints)}</p>
          <p className="mt-1 text-[11px] font-bold leading-4 text-slate-500">Partner Points</p>
        </div>
      </section>

      <div className="space-y-7 px-3 pt-6 sm:px-0">
        <section>
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-green-700">Get things done</p>
              <h2 className="mt-1 text-xl font-black text-slate-950">Quick Actions</h2>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-5">
            <QuickAction href="/dashboard/offers#create-offer" title="Create Offer" tone="green" icon={<TagIcon />} />
            <QuickAction href="/dashboard/offers" title="Manage Offers" tone="blue" icon={<StoreIcon />} />
            <QuickAction href={websiteBuilderHref} title="Website & App Builder" tone="green" icon={<WebsiteIcon />} />
            <QuickAction href="/dashboard/reports" title="View Performance" tone="violet" icon={<ChartIcon />} />
            <QuickAction href={shareHref} title="Share Your Deals" tone="amber" icon={<ShareIcon />} />
          </div>

          <Link
            href="/dashboard/redeem"
            className="mt-3 flex min-h-12 items-center justify-between rounded-2xl bg-green-700 px-4 py-3 text-white shadow-sm transition hover:bg-green-800"
          >
            <span>
              <span className="block text-[10px] font-black uppercase tracking-[0.16em] text-green-100">Customer at checkout</span>
              <span className="mt-0.5 block text-sm font-black">Confirm a Redemption</span>
            </span>
            <span className="text-2xl" aria-hidden="true">→</span>
          </Link>
        </section>

        <section>
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-700">Work</p>
              <h2 className="mt-1 text-xl font-black text-slate-950">Your Offers</h2>
            </div>
            <Link href="/dashboard/offers" className="text-sm font-black text-blue-700">View all →</Link>
          </div>

          {offerPreview.length > 0 ? (
            <div className="-mr-3 mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 pr-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {offerPreview.map((offer, index) => {
                const status = getOfferStatus({
                  startsAt: offer.starts_at,
                  endsAt: offer.ends_at,
                  isActive: offer.is_active,
                })
                const redemptions = props.redemptionCountByOfferId[offer.id] ?? 0

                return (
                  <Link
                    key={offer.id}
                    href={`/dashboard/offers/${offer.id}/edit`}
                    className="min-w-[72%] snap-start overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm sm:min-w-[260px]"
                  >
                    <div className={`relative h-28 overflow-hidden ${index % 3 === 0 ? 'bg-gradient-to-br from-amber-100 via-orange-50 to-green-100' : index % 3 === 1 ? 'bg-gradient-to-br from-blue-100 via-slate-50 to-violet-100' : 'bg-gradient-to-br from-green-100 via-white to-amber-100'}`}>
                      <div className="absolute inset-0 flex items-center justify-center text-5xl font-black text-slate-900/10">
                        {(offer.title || 'O').trim().charAt(0).toUpperCase()}
                      </div>
                      <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-green-700 shadow-sm">
                        {status.label}
                      </span>
                    </div>
                    <div className="p-3.5">
                      <h3 className="line-clamp-2 text-sm font-black leading-5 text-slate-950">{offer.title || 'Untitled offer'}</h3>
                      <p className="mt-1 line-clamp-1 text-xs font-bold text-green-700">{offer.discount || 'Member benefit'}</p>
                      <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                        <span>{redemptions} redemption{redemptions === 1 ? '' : 's'}</span>
                        <span className="font-black text-slate-400">›</span>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          ) : (
            <div className="mt-3 rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-8 text-center">
              <p className="font-black text-slate-950">No offers yet</p>
              <p className="mt-1 text-sm text-slate-500">Create your first offer to give local supporters a reason to visit.</p>
              <Link href="/dashboard/offers#create-offer" className="mt-4 inline-flex rounded-xl bg-green-700 px-4 py-2.5 text-sm font-black text-white">
                Create offer
              </Link>
            </div>
          )}
        </section>

        <section>
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-700">Community impact</p>
              <h2 className="mt-1 text-xl font-black text-slate-950">Impact & Rewards</h2>
            </div>
            <Link href="/dashboard/rewards" className="text-sm font-black text-blue-700">View details →</Link>
          </div>

          <div className="mt-3 grid grid-cols-2 divide-x divide-slate-200 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="px-2">
              <p className="text-2xl font-black text-slate-950">{formatMoney(props.totalCustomerValueDelivered)}</p>
              <p className="mt-1 text-xs font-bold text-slate-500">Customer value delivered</p>
            </div>
            <div className="px-4">
              <p className="text-2xl font-black text-slate-950">{formatPoints(rewardsSummary.totalPoints)}</p>
              <p className="mt-1 text-xs font-bold text-slate-500">Partner Points</p>
            </div>
          </div>

          <div className="mt-3 rounded-2xl border border-green-200 bg-green-50 px-4 py-3">
            <p className="text-sm font-black text-green-900">You’re making a local difference.</p>
            <p className="mt-1 text-xs leading-5 text-green-800">
              {props.totalRedemptions > 0
                ? `${props.totalRedemptions} customer redemption${props.totalRedemptions === 1 ? ' has' : 's have'} connected supporters with your business.`
                : 'Your active offers help make local fundraising passes more valuable to supporters.'}
            </p>
          </div>
        </section>

        {notifications.length > 0 ? (
          <BusinessNotificationCenter notifications={notifications} />
        ) : null}

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

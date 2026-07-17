import Link from 'next/link'
import { redirect } from 'next/navigation'

import MetricCard from '@/components/dashboard/metric-card'
import { getOwnerPlatformAnalytics } from '@/lib/services/owner-platform-analytics-service'
import type { PlatformMetrics } from '@/lib/repositories/platform-analytics-repository'

export const metadata = {
  title: 'Analytics | RaiseHub Owner Console',
}

type AnalyticsBar = {
  label: string
  value: number
  description: string
  barClass: string
}

type AttentionRoute = {
  title: string
  description: string
  count: number
  href: string
  cardClass: string
  countClass: string
}

function SnapshotChart({
  title,
  description,
  bars,
}: {
  title: string
  description: string
  bars: AnalyticsBar[]
}) {
  const maxValue = Math.max(
    1,
    ...bars.map((bar) => bar.value)
  )

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-xl font-bold text-slate-950">
        {title}
      </h2>

      <p className="mt-2 text-sm leading-6 text-slate-600">
        {description}
      </p>

      <div className="mt-6 space-y-5">
        {bars.map((bar) => {
          const width =
            bar.value === 0
              ? 0
              : Math.max(
                  6,
                  Math.round(
                    (bar.value / maxValue) * 100
                  )
                )

          return (
            <div key={bar.label}>
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-sm font-bold text-slate-900">
                    {bar.label}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    {bar.description}
                  </p>
                </div>

                <p className="shrink-0 text-2xl font-bold text-slate-950">
                  {bar.value}
                </p>
              </div>

              <div
                className="mt-3 h-4 overflow-hidden rounded-full bg-slate-100"
                role="img"
                aria-label={`${bar.label}: ${bar.value}`}
              >
                <div
                  className={`h-full rounded-full ${bar.barClass}`}
                  style={{
                    width: `${width}%`,
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function getAttentionRoutes(
  metrics: PlatformMetrics
): AttentionRoute[] {
  return [
    {
      title: 'Incomplete business profiles',
      description:
        'Businesses missing a name, phone number, address, or logo.',
      count: metrics.incompleteBusinessCount,
      href: '/dashboard/owner/businesses',
      cardClass:
        'border-rose-200 bg-rose-50 hover:border-rose-300',
      countClass: 'bg-rose-100 text-rose-700',
    },
    {
      title: 'Offers expiring soon',
      description:
        'Active offers scheduled to end within the next seven days.',
      count: metrics.expiringOfferCount,
      href: '/dashboard/owner/businesses',
      cardClass:
        'border-amber-200 bg-amber-50 hover:border-amber-300',
      countClass: 'bg-amber-100 text-amber-800',
    },
    {
      title: 'Inactive campaigns',
      description:
        'Campaigns currently outside active fundraising status.',
      count: metrics.inactiveCampaignCount,
      href: '/dashboard/owner/organizations',
      cardClass:
        'border-blue-200 bg-blue-50 hover:border-blue-300',
      countClass: 'bg-blue-100 text-blue-700',
    },
  ]
}

export default async function OwnerAnalyticsPage() {
  const result = await getOwnerPlatformAnalytics()

  if (result.status === 'unauthenticated') {
    redirect('/login')
  }

  if (result.status === 'owner-role-required') {
    redirect('/dashboard')
  }

  return (
    <main className="min-h-screen bg-[#F0F6FF] px-4 py-6 sm:px-8 sm:py-10">
      <div className="mx-auto max-w-7xl">
        <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl sm:p-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm font-bold text-blue-700 transition hover:text-blue-900"
          >
            <span aria-hidden="true">←</span>
            Owner dashboard
          </Link>

          <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">
                Platform Intelligence
              </p>

              <h1 className="mt-2 text-3xl font-bold text-slate-950 sm:text-4xl">
                Analytics
              </h1>

              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
                Review current platform scale, active content, and operational conditions that need Owner attention.
              </p>
            </div>

            <span className="w-fit rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-600">
              Owner only
            </span>
          </div>
        </header>

        {result.status === 'metrics-lookup-failure' ? (
          <section className="mt-6 rounded-3xl border border-amber-200 bg-amber-50 p-6">
            <h2 className="text-lg font-bold text-amber-950">
              Analytics unavailable
            </h2>

            <p className="mt-2 text-sm leading-6 text-amber-900">
              RaiseHub could not load the current platform metrics. Return to the dashboard and try again after the next refresh.
            </p>
          </section>
        ) : (
          <AnalyticsWorkspace metrics={result.metrics} />
        )}
      </div>
    </main>
  )
}

function AnalyticsWorkspace({
  metrics,
}: {
  metrics: PlatformMetrics
}) {
  const attentionRoutes =
    getAttentionRoutes(metrics)

  const totalAttention =
    attentionRoutes.reduce(
      (total, route) => total + route.count,
      0
    )

  const platformBars: AnalyticsBar[] = [
    {
      label: 'Businesses',
      value: metrics.businessCount,
      description: 'Registered business accounts',
      barClass: 'bg-emerald-500',
    },
    {
      label: 'Organizations',
      value: metrics.organizationCount,
      description: 'Registered fundraising organizations',
      barClass: 'bg-blue-500',
    },
    {
      label: 'Active campaigns',
      value: metrics.activeCampaignCount,
      description: 'Campaigns currently accepting support',
      barClass: 'bg-amber-400',
    },
    {
      label: 'Active offers',
      value: metrics.activeOfferCount,
      description: 'Offers currently available to pass holders',
      barClass: 'bg-slate-700',
    },
  ]

  const attentionBars: AnalyticsBar[] = [
    {
      label: 'Incomplete businesses',
      value: metrics.incompleteBusinessCount,
      description: 'Profiles missing required setup details',
      barClass: 'bg-rose-500',
    },
    {
      label: 'Expiring offers',
      value: metrics.expiringOfferCount,
      description: 'Offers ending within seven days',
      barClass: 'bg-amber-500',
    },
    {
      label: 'Inactive campaigns',
      value: metrics.inactiveCampaignCount,
      description: 'Campaigns outside active status',
      barClass: 'bg-blue-500',
    },
  ]

  return (
    <>
      <section className="mt-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label="Businesses"
            value={metrics.businessCount}
            description="Registered business accounts"
            tone="green"
          />

          <MetricCard
            label="Organizations"
            value={metrics.organizationCount}
            description="Registered fundraising organizations"
            tone="blue"
          />

          <MetricCard
            label="Active Campaigns"
            value={metrics.activeCampaignCount}
            description="Currently running fundraising campaigns"
            tone="yellow"
          />

          <MetricCard
            label="Active Offers"
            value={metrics.activeOfferCount}
            description="Live business offers"
            tone="slate"
          />
        </div>
      </section>

      <section className="mt-6 grid gap-5 xl:grid-cols-2">
        <SnapshotChart
          title="Platform activity mix"
          description="Current account and active-content totals compared on one scale."
          bars={platformBars}
        />

        <SnapshotChart
          title="Attention distribution"
          description="Current operational conditions generating Owner follow-up."
          bars={attentionBars}
        />
      </section>

      <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-rose-700">
              Action Routes
            </p>

            <h2 className="mt-2 text-2xl font-bold text-slate-950">
              Conditions requiring review
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Open the affected management workspace directly from each condition.
            </p>
          </div>

          <span className="rounded-full bg-slate-950 px-3 py-1.5 text-sm font-bold text-white">
            {totalAttention}
          </span>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          {attentionRoutes.map((route) => (
            <Link
              key={route.title}
              href={route.href}
              className={`flex items-start justify-between gap-4 rounded-2xl border p-4 transition hover:-translate-y-0.5 hover:shadow-sm ${route.cardClass}`}
            >
              <span className="min-w-0">
                <span className="block font-bold text-slate-950">
                  {route.title}
                </span>

                <span className="mt-1 block text-sm leading-5 text-slate-700">
                  {route.description}
                </span>
              </span>

              <span
                className={`flex h-10 min-w-10 shrink-0 items-center justify-center rounded-full px-2 text-sm font-bold ${route.countClass}`}
              >
                {route.count}
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-6 rounded-3xl border border-blue-200 bg-blue-50 p-5 sm:p-6">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">
          Analytics foundation
        </p>

        <h2 className="mt-2 text-xl font-bold text-blue-950">
          Current snapshots are live
        </h2>

        <p className="mt-2 max-w-3xl text-sm leading-6 text-blue-900">
          These figures describe the platform right now. Revenue trends, purchase volume, pass growth, redemption activity, and period comparisons require stored daily analytics snapshots. That historical layer will be added without changing the dashboard’s current source of truth.
        </p>
      </section>
    </>
  )
}

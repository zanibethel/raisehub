import Link from 'next/link'

import MetricCard from '@/components/dashboard/metric-card'
import SectionHeader from '@/components/dashboard/section-header'
import type { PlatformMetrics } from '@/lib/repositories/platform-analytics-repository'

// =============================================================================
// Types
// =============================================================================

type OwnerAnalyticsSectionProps = {
  metrics: PlatformMetrics | null
}

type AttentionItem = {
  id: string
  title: string
  description: string
  count: number
  href: string
  tone: 'rose' | 'amber' | 'blue'
}

// =============================================================================
// Attention helpers
// =============================================================================

function getAttentionItems(
  metrics: PlatformMetrics
): AttentionItem[] {
  return [
    {
      id: 'incomplete-businesses',
      title: 'Businesses need setup help',
      description:
        'Profiles are missing a business name, phone number, address, or logo.',
      count: metrics.incompleteBusinessCount,
      href: '/dashboard/owner/businesses',
      tone: 'rose',
    },
    {
      id: 'expiring-offers',
      title: 'Offers expire within 7 days',
      description:
        'Review active offers that are approaching their scheduled end date.',
      count: metrics.expiringOfferCount,
      href: '/dashboard/owner/businesses',
      tone: 'amber',
    },
    {
      id: 'inactive-campaigns',
      title: 'Campaigns are not active',
      description:
        'Review draft, paused, completed, or otherwise inactive campaigns.',
      count: metrics.inactiveCampaignCount,
      href: '/dashboard/owner/organizations',
      tone: 'blue',
    },
  ].filter((item) => item.count > 0)
}

function getAttentionTone(
  tone: AttentionItem['tone']
) {
  switch (tone) {
    case 'rose':
      return {
        card: 'border-rose-200 bg-rose-50',
        count: 'bg-rose-100 text-rose-700',
        title: 'text-rose-950',
        body: 'text-rose-800',
      }

    case 'amber':
      return {
        card: 'border-amber-200 bg-amber-50',
        count: 'bg-amber-100 text-amber-800',
        title: 'text-amber-950',
        body: 'text-amber-800',
      }

    case 'blue':
    default:
      return {
        card: 'border-blue-200 bg-blue-50',
        count: 'bg-blue-100 text-blue-700',
        title: 'text-blue-950',
        body: 'text-blue-800',
      }
  }
}

// =============================================================================
// Component
// =============================================================================

export default function OwnerAnalyticsSection({
  metrics,
}: OwnerAnalyticsSectionProps) {
  if (metrics === null) {
    return (
      <section>
        <SectionHeader
          title="Platform Overview"
          description="Live totals and actionable platform signals."
        />

        <p className="mt-4 text-sm text-slate-500">
          Platform metrics could not be loaded.
        </p>
      </section>
    )
  }

  const attentionItems =
    getAttentionItems(metrics)

  const totalAttentionCount =
    attentionItems.reduce(
      (total, item) => total + item.count,
      0
    )

  return (
    <section className="space-y-8">
      <div>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-rose-700">
              Needs Attention
            </p>

            <h2 className="mt-1 text-2xl font-bold text-slate-950">
              What needs action next
            </h2>
          </div>

          <span className="rounded-full bg-slate-950 px-3 py-1.5 text-sm font-bold text-white">
            {totalAttentionCount}
          </span>
        </div>

        {attentionItems.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
            <p className="font-bold text-emerald-950">
              No immediate platform actions
            </p>

            <p className="mt-1 text-sm leading-6 text-emerald-800">
              Business setup, offer expiration, and campaign status checks are clear.
            </p>
          </div>
        ) : (
          <div className="mt-4 grid gap-3 lg:grid-cols-3">
            {attentionItems.map((item) => {
              const styles =
                getAttentionTone(item.tone)

              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={`flex items-start justify-between gap-4 rounded-2xl border p-4 transition hover:-translate-y-0.5 hover:shadow-sm ${styles.card}`}
                >
                  <span className="min-w-0">
                    <span className={`block font-bold ${styles.title}`}>
                      {item.title}
                    </span>

                    <span className={`mt-1 block text-sm leading-5 ${styles.body}`}>
                      {item.description}
                    </span>
                  </span>

                  <span className={`flex h-9 min-w-9 shrink-0 items-center justify-center rounded-full px-2 text-sm font-bold ${styles.count}`}>
                    {item.count}
                  </span>
                </Link>
              )
            })}
          </div>
        )}
      </div>

      <div>
        <SectionHeader
          title="Platform Overview"
          description="Live totals across registered accounts and active content."
        />

        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
            description="Live business offers available to customers"
            tone="slate"
          />
        </div>
      </div>
    </section>
  )
}

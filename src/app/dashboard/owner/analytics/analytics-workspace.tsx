'use client'

import Link from 'next/link'
import { useState } from 'react'

import type {
  AnalyticsEnvironment,
  PlatformAnalyticsMetrics,
  PlatformMetrics,
} from '@/lib/repositories/platform-analytics-repository'

type MetricKey = 'businesses' | 'organizations' | 'campaigns' | 'offers'

type MetricCardConfig = {
  key: MetricKey
  label: string
  value: number
  summary: string
  icon: string
  tone: 'green' | 'blue' | 'yellow' | 'slate'
  href: string
  actionLabel: string
  details: { label: string; value: number }[]
}

const toneClasses = {
  green: {
    border: 'border-emerald-200',
    surface: 'bg-emerald-50/70',
    icon: 'bg-emerald-100 text-emerald-700',
    value: 'text-emerald-700',
  },
  blue: {
    border: 'border-blue-200',
    surface: 'bg-blue-50/70',
    icon: 'bg-blue-100 text-blue-700',
    value: 'text-blue-700',
  },
  yellow: {
    border: 'border-amber-200',
    surface: 'bg-amber-50/70',
    icon: 'bg-amber-100 text-amber-700',
    value: 'text-amber-600',
  },
  slate: {
    border: 'border-slate-200',
    surface: 'bg-slate-50/70',
    icon: 'bg-slate-800 text-white',
    value: 'text-slate-900',
  },
}

function getMetricCards(
  metrics: PlatformMetrics,
  environment: AnalyticsEnvironment
): MetricCardConfig[] {
  const isDemo = environment === 'demo'

  return [
    {
      key: 'businesses',
      label: 'Businesses',
      value: metrics.businessCount,
      summary: `${metrics.incompleteBusinessCount} incomplete · ${metrics.completeBusinessCount} ready`,
      icon: '▣',
      tone: 'green',
      href: '/dashboard/owner/businesses',
      actionLabel: 'Review businesses',
      details: [
        { label: 'Complete profiles', value: metrics.completeBusinessCount },
        { label: 'Incomplete profiles', value: metrics.incompleteBusinessCount },
        { label: 'With active offers', value: metrics.businessesWithActiveOffersCount },
      ],
    },
    {
      key: 'organizations',
      label: 'Organizations',
      value: metrics.organizationCount,
      summary: `${metrics.organizationPayoutSetupCount} need payout setup`,
      icon: '◎',
      tone: 'blue',
      href: '/dashboard/owner/organizations',
      actionLabel: 'Review organizations',
      details: [
        { label: 'Registered organizations', value: metrics.organizationCount },
        { label: 'Need payout setup', value: metrics.organizationPayoutSetupCount },
        {
          label: 'Payout-ready',
          value: Math.max(0, metrics.organizationCount - metrics.organizationPayoutSetupCount),
        },
      ],
    },
    {
      key: 'campaigns',
      label: 'Active campaigns',
      value: metrics.activeCampaignCount,
      summary: isDemo
        ? 'Demo campaigns accepting support'
        : 'Campaigns accepting support',
      icon: '⚑',
      tone: 'yellow',
      href: isDemo ? '/dashboard/owner/demo' : '/dashboard/owner/organizations',
      actionLabel: isDemo ? 'Manage demo campaigns' : 'Review campaigns',
      details: [
        { label: 'Active campaigns', value: metrics.activeCampaignCount },
        { label: 'Draft campaigns', value: metrics.draftCampaignCount },
        { label: 'Outside active status', value: metrics.inactiveCampaignCount },
      ],
    },
    {
      key: 'offers',
      label: 'Active offers',
      value: metrics.activeOfferCount,
      summary: isDemo ? 'Demo offers for pass holders' : 'Live offers for pass holders',
      icon: '◇',
      tone: 'slate',
      href: '/dashboard/owner/businesses',
      actionLabel: 'Review offers',
      details: [
        { label: 'Active offers', value: metrics.activeOfferCount },
        { label: 'Expiring within 7 days', value: metrics.expiringOfferCount },
      ],
    },
  ]
}

function MetricCard({
  card,
  selected,
  onSelect,
}: {
  card: MetricCardConfig
  selected: boolean
  onSelect: () => void
}) {
  const tone = toneClasses[card.tone]

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`relative min-h-36 rounded-2xl border bg-white p-3 text-left shadow-sm transition sm:min-h-44 sm:rounded-3xl sm:p-5 ${
        selected ? `${tone.border} ring-2 ring-offset-1 ${tone.surface}` : 'border-slate-200'
      }`}
    >
      <span className="flex items-start justify-between gap-2">
        <span
          aria-hidden="true"
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold sm:h-11 sm:w-11 sm:text-xl ${tone.icon}`}
        >
          {card.icon}
        </span>
        <span className="text-lg font-bold text-slate-600" aria-hidden="true">
          {selected ? '⌃' : '›'}
        </span>
      </span>

      <span className="mt-3 block text-xs font-bold leading-tight text-slate-950 sm:text-base">
        {card.label}
      </span>
      <span className={`mt-1 block text-3xl font-black leading-none sm:text-4xl ${tone.value}`}>
        {card.value}
      </span>
      <span className="mt-2 block text-[11px] leading-4 text-slate-600 sm:text-sm sm:leading-5">
        {card.summary}
      </span>
    </button>
  )
}

function MetricDetails({ card }: { card: MetricCardConfig }) {
  const tone = toneClasses[card.tone]

  return (
    <section className={`mt-3 overflow-hidden rounded-2xl border bg-white shadow-sm sm:rounded-3xl ${tone.border}`}>
      <div className={`flex items-center justify-between gap-3 border-b px-4 py-3 sm:px-5 ${tone.surface}`}>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Details</p>
          <h2 className="mt-0.5 text-base font-black text-slate-950 sm:text-lg">{card.label}</h2>
        </div>
        <span className={`text-2xl font-black ${tone.value}`}>{card.value}</span>
      </div>

      <dl className="divide-y divide-slate-200">
        {card.details.map((detail) => (
          <div key={detail.label} className="flex items-center justify-between gap-4 px-4 py-3 sm:px-5">
            <dt className="text-sm text-slate-600">{detail.label}</dt>
            <dd className="text-sm font-bold text-slate-950">{detail.value}</dd>
          </div>
        ))}
      </dl>

      <Link
        href={card.href}
        className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm font-bold text-blue-700 hover:bg-blue-50 sm:px-5"
      >
        {card.actionLabel}
        <span aria-hidden="true">›</span>
      </Link>
    </section>
  )
}

export default function AnalyticsWorkspace({
  metrics,
}: {
  metrics: PlatformAnalyticsMetrics
}) {
  const [environment, setEnvironment] = useState<AnalyticsEnvironment>('production')
  const [expandedMetric, setExpandedMetric] = useState<MetricKey>('businesses')
  const activeMetrics = metrics[environment]
  const cards = getMetricCards(activeMetrics, environment)
  const selectedCard = cards.find((card) => card.key === expandedMetric) ?? cards[0]
  const isDemo = environment === 'demo'

  const attentionItems = isDemo
    ? [
        {
          title: 'Resettable datasets',
          description: 'Scenarios available for testing',
          count: activeMetrics.demoGroupCount,
          href: '/dashboard/owner/demo',
          tone: 'blue',
        },
        {
          title: 'Incomplete demo businesses',
          description: 'Useful for setup walkthroughs',
          count: activeMetrics.incompleteBusinessCount,
          href: '/dashboard/owner/businesses',
          tone: 'blue',
        },
        {
          title: 'Demo payout setup',
          description: 'Organizations available for payout-flow testing',
          count: activeMetrics.organizationPayoutSetupCount,
          href: '/dashboard/owner/organizations',
          tone: 'blue',
        },
      ]
    : [
        {
          title: 'Incomplete businesses',
          description: 'Profiles missing required setup details',
          count: activeMetrics.incompleteBusinessCount,
          href: '/dashboard/owner/businesses',
          tone: 'rose',
        },
        {
          title: 'Organization payout setup',
          description: 'Cannot receive campaign proceeds',
          count: activeMetrics.organizationPayoutSetupCount,
          href: '/dashboard/owner/organizations',
          tone: 'orange',
        },
        {
          title: 'Offers expiring soon',
          description: 'Offers ending within the next seven days',
          count: activeMetrics.expiringOfferCount,
          href: '/dashboard/owner/businesses',
          tone: 'amber',
        },
      ]

  return (
    <>
      <section className="mt-5 rounded-2xl border border-slate-300 bg-white p-1 shadow-sm">
        <div className="grid grid-cols-2 gap-1">
          {(['production', 'demo'] as const).map((item) => {
            const selected = environment === item
            return (
              <button
                key={item}
                type="button"
                onClick={() => {
                  setEnvironment(item)
                  setExpandedMetric(item === 'production' ? 'businesses' : 'campaigns')
                }}
                className={`rounded-xl px-3 py-3 text-sm font-bold transition sm:text-base ${
                  selected
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                {item === 'production' ? '▥ Production' : '♙ Demo'}
              </button>
            )
          })}
        </div>
      </section>

      <div
        className={`mt-3 flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-xs sm:px-4 sm:text-sm ${
          isDemo
            ? 'border-blue-200 bg-blue-50 text-blue-700'
            : 'border-emerald-200 bg-emerald-50 text-emerald-700'
        }`}
      >
        <span className="font-bold">● {isDemo ? 'Demo data' : 'Production data'}</span>
        <span className="text-right text-slate-600">
          {isDemo ? 'Sandbox records only' : 'Excludes demo records'}
        </span>
      </div>

      <section className="mt-4 grid grid-cols-2 gap-2.5 sm:mt-5 sm:gap-4 lg:grid-cols-4">
        {cards.map((card) => (
          <MetricCard
            key={card.key}
            card={card}
            selected={expandedMetric === card.key}
            onSelect={() => setExpandedMetric(card.key)}
          />
        ))}
      </section>

      <MetricDetails card={selectedCard} />

      <section className="mt-5 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4 sm:px-5">
          <h2 className="text-xl font-black text-slate-950">
            {isDemo ? 'Demo tools' : 'Needs attention'}
          </h2>
          <Link
            href={isDemo ? '/dashboard/owner/demo' : '/dashboard'}
            className="text-sm font-bold text-blue-700"
          >
            {isDemo ? 'Open demo center' : 'View all'}
          </Link>
        </div>

        <div className="divide-y divide-slate-200 px-4 sm:px-5">
          {attentionItems.map((item) => {
            const badgeClass =
              item.tone === 'rose'
                ? 'bg-rose-100 text-rose-700'
                : item.tone === 'orange'
                  ? 'bg-orange-100 text-orange-700'
                  : item.tone === 'amber'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-blue-100 text-blue-700'

            return (
              <Link
                key={item.title}
                href={item.href}
                className="flex items-center gap-3 py-3.5 hover:bg-slate-50"
              >
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-black ${badgeClass}`}
                  aria-hidden="true"
                >
                  {isDemo ? '•' : '!'}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold text-slate-950">{item.title}</span>
                  <span className="mt-0.5 block text-xs leading-5 text-slate-600 sm:text-sm">
                    {item.description}
                  </span>
                </span>
                <span className={`rounded-full px-2.5 py-1 text-sm font-bold ${badgeClass}`}>
                  {item.count}
                </span>
                <span className="text-xl text-slate-700" aria-hidden="true">›</span>
              </Link>
            )
          })}
        </div>

        {isDemo ? (
          <div className="border-t border-slate-200 p-4 sm:p-5">
            <Link
              href="/dashboard/owner/demo"
              className="flex items-center justify-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-700 hover:bg-blue-100"
            >
              ↻ Manage demo data
            </Link>
          </div>
        ) : null}
      </section>
    </>
  )
}

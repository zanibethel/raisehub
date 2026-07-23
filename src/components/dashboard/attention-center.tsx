'use client'

import Link from 'next/link'
import { useState } from 'react'
import type {
  DashboardAlert,
  DashboardAlertType,
} from '@/lib/rules/dashboard-alerts'

type AttentionCenterProps = {
  alerts: DashboardAlert[]
}

const alertStyles: Record<
  DashboardAlertType,
  {
    card: string
    badge: string
    button: string
  }
> = {
  success: {
    card: 'border-green-200 bg-green-50',
    badge: 'bg-green-100 text-green-700',
    button: 'bg-green-600 hover:bg-green-700',
  },
  info: {
    card: 'border-blue-200 bg-blue-50',
    badge: 'bg-blue-100 text-blue-700',
    button: 'bg-blue-600 hover:bg-blue-700',
  },
  warning: {
    card: 'border-yellow-200 bg-yellow-50',
    badge: 'bg-yellow-100 text-yellow-800',
    button: 'bg-yellow-600 hover:bg-yellow-700',
  },
  danger: {
    card: 'border-rose-200 bg-rose-50',
    badge: 'bg-rose-100 text-rose-700',
    button: 'bg-rose-600 hover:bg-rose-700',
  },
}

function getActionHref(alert: DashboardAlert) {
  switch (alert.id) {
    case 'offer-slots':
      return '#create-offer'
    case 'paused':
    case 'expiring':
    case 'review':
      return '#business-offers'
    case 'profile':
      return '#business-profile'
    default:
      return '/dashboard'
  }
}

function getAlertLabel(type: DashboardAlertType) {
  if (type === 'danger') return 'Action needed'
  if (type === 'warning') return 'Review'
  if (type === 'success') return 'On track'
  return 'Opportunity'
}

function AlertCard({ alert }: { alert: DashboardAlert }) {
  const styles = alertStyles[alert.type]
  const actionHref = getActionHref(alert)

  return (
    <article className={`rounded-2xl border p-5 ${styles.card}`}>
      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${styles.badge}`}>
        {getAlertLabel(alert.type)}
      </span>

      <h3 className="mt-3 text-lg font-bold text-gray-900">{alert.title}</h3>

      <p className="mt-2 text-sm leading-6 text-gray-700">{alert.description}</p>

      {alert.action ? (
        <Link
          href={actionHref}
          className={`mt-5 inline-flex rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition ${styles.button}`}
        >
          {alert.action}
        </Link>
      ) : null}
    </article>
  )
}

export default function AttentionCenter({ alerts }: AttentionCenterProps) {
  const [showAll, setShowAll] = useState(false)

  if (alerts.length === 0) {
    return (
      <section className="rounded-2xl border border-green-200 bg-green-50 p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-green-700">
              Business status
            </p>
            <h2 className="mt-1 text-lg font-bold text-green-900">
              Everything looks good
            </h2>
          </div>
          <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">
            On track
          </span>
        </div>
      </section>
    )
  }

  const primaryAlert = alerts[0]
  const remainingAlerts = alerts.slice(1)

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-rose-700">
            Needs your attention
          </p>
          <h2 className="mt-1 text-lg font-bold text-gray-950">
            Recommended actions
          </h2>
        </div>

        {alerts.length > 1 ? (
          <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-bold text-rose-700">
            {alerts.length} items
          </span>
        ) : null}
      </div>

      <div className="mt-4">
        <AlertCard alert={primaryAlert} />
      </div>

      {remainingAlerts.length > 0 ? (
        <>
          <button
            type="button"
            onClick={() => setShowAll((current) => !current)}
            className="mt-4 inline-flex w-full items-center justify-center rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-700 hover:border-blue-300 hover:text-blue-700"
            aria-expanded={showAll}
          >
            {showAll
              ? 'Hide additional actions'
              : `View ${remainingAlerts.length} more action${remainingAlerts.length === 1 ? '' : 's'}`}
          </button>

          {showAll ? (
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              {remainingAlerts.map((alert) => (
                <AlertCard key={alert.id} alert={alert} />
              ))}
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  )
}

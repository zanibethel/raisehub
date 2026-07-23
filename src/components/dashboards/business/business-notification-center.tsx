'use client'

import Link from 'next/link'
import { useState } from 'react'

export type BusinessNotificationTone =
  | 'info'
  | 'success'
  | 'warning'
  | 'danger'

export type BusinessNotification = {
  id: string
  title: string
  description: string
  tone?: BusinessNotificationTone
  href?: string
  actionLabel?: string
  createdAt?: string | null
}

type BusinessNotificationCenterProps = {
  notifications: BusinessNotification[]
  title?: string
  description?: string
}

function getToneClasses(tone: BusinessNotificationTone) {
  if (tone === 'success') {
    return {
      container: 'border-green-200 bg-green-50',
      icon: 'bg-green-100 text-green-700',
      label: 'Update',
      symbol: '✓',
    }
  }

  if (tone === 'warning') {
    return {
      container: 'border-amber-200 bg-amber-50',
      icon: 'bg-amber-100 text-amber-700',
      label: 'Attention',
      symbol: '!',
    }
  }

  if (tone === 'danger') {
    return {
      container: 'border-red-200 bg-red-50',
      icon: 'bg-red-100 text-red-700',
      label: 'Action needed',
      symbol: '×',
    }
  }

  return {
    container: 'border-blue-200 bg-blue-50',
    icon: 'bg-blue-100 text-blue-700',
    label: 'Information',
    symbol: 'i',
  }
}

function formatNotificationDate(value: string | null | undefined) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function NotificationItem({
  notification,
}: {
  notification: BusinessNotification
}) {
  const tone = notification.tone ?? 'info'
  const toneClasses = getToneClasses(tone)
  const formattedDate = formatNotificationDate(notification.createdAt)

  return (
    <article className={`rounded-2xl border p-4 ${toneClasses.container}`}>
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${toneClasses.icon}`}
        >
          {toneClasses.symbol}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                {toneClasses.label}
              </p>
              <h3 className="mt-1 font-semibold text-gray-900">
                {notification.title}
              </h3>
            </div>

            {formattedDate ? (
              <time
                dateTime={notification.createdAt ?? undefined}
                className="text-xs text-gray-500"
              >
                {formattedDate}
              </time>
            ) : null}
          </div>

          <p className="mt-2 text-sm leading-6 text-gray-700">
            {notification.description}
          </p>

          {notification.href ? (
            <Link
              href={notification.href}
              className="mt-3 inline-flex text-sm font-semibold text-blue-700 hover:text-blue-800 hover:underline"
            >
              {notification.actionLabel ?? 'View details'}
            </Link>
          ) : null}
        </div>
      </div>
    </article>
  )
}

export default function BusinessNotificationCenter({
  notifications,
  title = 'Notification Center',
  description = 'Important updates and recommended actions for this business.',
}: BusinessNotificationCenterProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <section
      aria-labelledby="business-notification-center-title"
      className="rounded-2xl border border-gray-200 bg-white/90 p-4 shadow-sm backdrop-blur sm:p-5"
    >
      <button
        type="button"
        onClick={() => setExpanded((current) => !current)}
        aria-expanded={expanded}
        className="flex w-full items-center justify-between gap-4 text-left"
      >
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
            Business updates
          </p>
          <h2
            id="business-notification-center-title"
            className="mt-1 text-lg font-bold text-gray-900"
          >
            {title}
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            {notifications.length > 0
              ? `${notifications.length} ${notifications.length === 1 ? 'update' : 'updates'} waiting`
              : 'You’re all caught up'}
          </p>
        </div>

        <span className="shrink-0 rounded-full bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700">
          {expanded ? 'Hide' : 'View'}
        </span>
      </button>

      {expanded ? (
        <div className="mt-4 border-t border-gray-100 pt-4">
          <p className="text-sm leading-6 text-gray-600">{description}</p>

          {notifications.length > 0 ? (
            <div className="mt-4 space-y-3">
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                />
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-5 text-center">
              <p className="font-semibold text-gray-900">You’re all caught up</p>
              <p className="mt-1 text-sm text-gray-600">
                New business activity and important recommendations will appear here.
              </p>
            </div>
          )}
        </div>
      ) : null}
    </section>
  )
}

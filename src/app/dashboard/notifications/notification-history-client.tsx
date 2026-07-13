'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useState, useTransition } from 'react'
import {
  markNotificationReadAction,
  dismissNotificationAction,
} from '@/app/dashboard/notification-actions'

// =========================================
// Types
// =========================================

type NotificationRow = {
  id: string
  type: string | null
  severity: string | null
  title: string | null
  message: string | null
  action_url: string | null
  action_label: string | null
  created_at: string
  read_at: string | null
  dismissed_at: string | null
  expires_at: string | null
}

type NotificationHistoryClientProps = {
  initialNotifications: NotificationRow[]
}

// =========================================
// Helpers
// =========================================

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const SEVERITY_COLORS: Record<string, string> = {
  info: 'bg-blue-500',
  success: 'bg-green-500',
  warning: 'bg-yellow-500',
  error: 'bg-red-500',
}

function getStatusLabel(n: NotificationRow): {
  label: string
  className: string
} {
  if (n.dismissed_at) {
    return { label: 'Dismissed', className: 'bg-gray-100 text-gray-600' }
  }
  if (n.expires_at && new Date(n.expires_at) < new Date()) {
    return { label: 'Expired', className: 'bg-orange-50 text-orange-600' }
  }
  if (n.read_at) {
    return { label: 'Read', className: 'bg-green-50 text-green-700' }
  }
  return { label: 'Unread', className: 'bg-blue-50 text-blue-700 font-semibold' }
}

// =========================================
// Notification History Client
// =========================================

export default function NotificationHistoryClient({
  initialNotifications,
}: NotificationHistoryClientProps) {
  const router = useRouter()
  const [notifications, setNotifications] = useState(initialNotifications)
  const [actionError, setActionError] = useState<string | null>(null)
  const [pendingActionId, setPendingActionId] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  function handleRead(id: string) {
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, read_at: new Date().toISOString() } : n
      )
    )
    setActionError(null)

    startTransition(async () => {
      const result = await markNotificationReadAction(id)
      if (result.error) {
        setActionError(result.error)
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, read_at: null } : n))
        )
      }
    })
  }

  function handleDismiss(id: string) {
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, dismissed_at: new Date().toISOString() } : n
      )
    )
    setActionError(null)

    startTransition(async () => {
      const result = await dismissNotificationAction(id)
      if (result.error) {
        setActionError(result.error)
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, dismissed_at: null } : n))
        )
      }
    })
  }

  async function handleActionNavigate(id: string, url: string) {
    if (pendingActionId) return
    setPendingActionId(id)
    setActionError(null)

    const notification = notifications.find((n) => n.id === id)
    const isUnread = notification && !notification.read_at && !notification.dismissed_at

    if (isUnread) {
      // Optimistic update
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === id ? { ...n, read_at: new Date().toISOString() } : n
        )
      )

      const result = await markNotificationReadAction(id)
      if (result.error) {
        setActionError(result.error)
        // Revert optimistic update
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, read_at: null } : n))
        )
        setPendingActionId(null)
        return
      }
    }

    router.push(url)
    setPendingActionId(null)
  }

  if (notifications.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center shadow-sm">
        <p className="text-3xl">🔔</p>
        <p className="mt-3 text-base font-medium text-gray-700">
          No notifications yet
        </p>
        <p className="mt-1 text-sm text-gray-500">
          Important updates and alerts will appear here.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-block rounded-xl bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Back to Dashboard
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {actionError ? (
        <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
          {actionError}
        </p>
      ) : null}

      {notifications.map((n) => {
        const { label, className: statusClass } = getStatusLabel(n)
        const dotColor = SEVERITY_COLORS[n.severity ?? 'info'] ?? SEVERITY_COLORS.info
        const isUnread = !n.read_at && !n.dismissed_at
        const canDismiss = !n.dismissed_at
        const isExpired = Boolean(n.expires_at && new Date(n.expires_at) < new Date())
        const actionUrl = n.action_url

        return (
          <div
            key={n.id}
            className={`rounded-2xl border p-5 shadow-sm ${
              isUnread
                ? 'border-blue-100 bg-blue-50/30'
                : n.dismissed_at
                ? 'border-gray-100 bg-gray-50'
                : 'border-gray-100 bg-white'
            }`}
          >
            <div className="flex items-start gap-4">
              <span
                className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${dotColor}`}
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-gray-900">
                    {n.title}
                  </p>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] ${statusClass}`}
                  >
                    {label}
                  </span>
                  {isExpired && !n.dismissed_at ? (
                    <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[11px] text-orange-600">
                      Expired
                    </span>
                  ) : null}
                </div>

                {n.message ? (
                  <p className="mt-1 text-sm text-gray-600">{n.message}</p>
                ) : null}

                <p className="mt-2 text-xs text-gray-400">
                  {formatDate(n.created_at)}
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  {actionUrl ? (
                    <button
                      type="button"
                      onClick={() => handleActionNavigate(n.id, actionUrl)}
                      disabled={pendingActionId === n.id}
                      className="rounded-lg bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-60"
                    >
                      {pendingActionId === n.id ? '…' : (n.action_label ?? 'Open')}
                    </button>
                  ) : null}

                  {isUnread ? (
                    <button
                      type="button"
                      onClick={() => handleRead(n.id)}
                      className="rounded-lg border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Mark read
                    </button>
                  ) : null}

                  {canDismiss ? (
                    <button
                      type="button"
                      onClick={() => handleDismiss(n.id)}
                      className="rounded-lg border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-400 hover:bg-gray-50 hover:text-gray-600"
                    >
                      Dismiss
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

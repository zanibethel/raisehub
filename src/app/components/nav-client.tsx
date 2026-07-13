'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  markNotificationReadAction,
  markAllNotificationsReadAction,
  dismissNotificationAction,
} from '@/app/dashboard/notification-actions'

// =========================================
// Types
// =========================================

type User = {
  id: string
  email?: string | null
}

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

type NavClientProps = {
  user: User | null
  isDemoMode: boolean
  isPublicDemoUser: boolean
}

// =========================================
// Helpers
// =========================================

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

const SEVERITY_COLORS: Record<string, string> = {
  info: 'bg-blue-500',
  success: 'bg-green-500',
  warning: 'bg-yellow-500',
  error: 'bg-red-500',
}

// =========================================
// Demo Launcher Modal
// =========================================

type DemoRole = 'customer' | 'business' | 'organization'

const DEMO_ROLES: {
  role: DemoRole
  title: string
  description: string
  icon: string
  color: string
}[] = [
  {
    role: 'customer',
    title: 'Customer',
    description: 'Browse local deals, save offers, and support fundraisers in your community.',
    icon: '🛍️',
    color: 'border-yellow-200 hover:border-yellow-400 hover:bg-yellow-50',
  },
  {
    role: 'business',
    title: 'Business',
    description: 'Create offers, track redemptions, and grow local visibility.',
    icon: '🏪',
    color: 'border-green-200 hover:border-green-400 hover:bg-green-50',
  },
  {
    role: 'organization',
    title: 'Organization',
    description: 'Launch fundraising campaigns powered by local business deals.',
    icon: '🏫',
    color: 'border-blue-200 hover:border-blue-400 hover:bg-blue-50',
  },
]

function DemoLauncherModal({
  onClose,
}: {
  onClose: () => void
}) {
  const router = useRouter()
  const [launching, setLaunching] = useState<DemoRole | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleLaunch(role: DemoRole) {
    setLaunching(role)
    setError(null)

    try {
      const res = await fetch('/api/demo/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
        credentials: 'same-origin',
      })

      const json = await res.json()

      if (!res.ok || json.error) {
        setError(json.error ?? 'Demo login failed. Please try again.')
        setLaunching(null)
        return
      }

      // Session cookies are now set. Navigate to dashboard.
      onClose()
      router.push('/dashboard')
    } catch {
      setError('Unable to connect. Please try again.')
      setLaunching(null)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Explore demo experiences"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 px-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl sm:p-8">
        <div className="mb-6 text-center">
          <h2 className="text-2xl font-bold text-blue-700">
            Choose Your Experience
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Explore RaiseHub as any of the following roles. No sign-up required.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-1">
          {DEMO_ROLES.map(({ role, title, description, icon, color }) => (
            <button
              key={role}
              type="button"
              disabled={launching !== null}
              onClick={() => handleLaunch(role)}
              className={`flex items-start gap-4 rounded-2xl border-2 bg-white p-5 text-left transition disabled:opacity-60 ${color}`}
            >
              <span className="text-3xl" aria-hidden="true">
                {icon}
              </span>
              <div className="flex-1">
                <p className="font-semibold text-gray-900">
                  {title}
                  {launching === role ? (
                    <span className="ml-2 text-sm font-normal text-blue-600">
                      Launching…
                    </span>
                  ) : null}
                </p>
                <p className="mt-1 text-sm text-gray-600">{description}</p>
              </div>
              <span className="mt-1 text-gray-400" aria-hidden="true">
                →
              </span>
            </button>
          ))}
        </div>

        {error ? (
          <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Close
        </button>
      </div>
    </div>
  )
}

// =========================================
// Notification Item
// =========================================

function NotificationItem({
  notification,
  onRead,
  onDismiss,
}: {
  notification: NotificationRow
  onRead: (id: string) => void
  onDismiss: (id: string) => void
}) {
  const isUnread = !notification.read_at
  const severity = notification.severity ?? 'info'
  const dotColor = SEVERITY_COLORS[severity] ?? SEVERITY_COLORS.info

  return (
    <div
      className={`rounded-xl border p-4 transition ${
        isUnread
          ? 'border-blue-100 bg-blue-50/40'
          : 'border-gray-100 bg-white'
      }`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${dotColor}`}
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-gray-900">
              {notification.title}
            </p>
            <span className="shrink-0 text-xs text-gray-400">
              {formatRelativeTime(notification.created_at)}
            </span>
          </div>
          {notification.message ? (
            <p className="mt-1 text-sm text-gray-600">{notification.message}</p>
          ) : null}

          <div className="mt-3 flex flex-wrap gap-2">
            {notification.action_url ? (
              <a
                href={notification.action_url}
                onClick={() => {
                  if (isUnread) onRead(notification.id)
                }}
                className="rounded-lg bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700"
              >
                {notification.action_label ?? 'Open'}
              </a>
            ) : null}

            {isUnread ? (
              <button
                type="button"
                onClick={() => onRead(notification.id)}
                className="rounded-lg border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                Mark read
              </button>
            ) : null}

            <button
              type="button"
              onClick={() => onDismiss(notification.id)}
              className="rounded-lg border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-400 hover:bg-gray-50 hover:text-gray-600"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// =========================================
// Notification Panel
// =========================================

function NotificationPanel({
  onClose,
}: {
  onClose: () => void
}) {
  const [notifications, setNotifications] = useState<NotificationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  useEffect(() => {
    loadNotifications()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadNotifications() {
    setLoading(true)
    setError(null)

    const supabase = createClient()
    // createClient() returns null during SSR (no browser env). These functions are
    // called only from useEffect/event handlers so null should never occur at runtime.
    if (!supabase) { setLoading(false); return }

    const { data, error: fetchError } = await supabase
      .from('notifications')
      .select(
        'id, type, severity, title, message, action_url, action_label, created_at, read_at, dismissed_at, expires_at'
      )
      .is('dismissed_at', null)
      .or('expires_at.is.null,expires_at.gt.now()')
      .order('created_at', { ascending: false })
      .limit(20)

    if (fetchError) {
      setError('Could not load notifications.')
    } else {
      setNotifications(data ?? [])
    }

    setLoading(false)
  }

  const unreadNotifications = notifications.filter((n) => !n.read_at)

  function handleRead(id: string) {
    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, read_at: new Date().toISOString() } : n
      )
    )

    startTransition(async () => {
      const result = await markNotificationReadAction(id)
      if (result.error) {
        setError(result.error)
        // Revert optimistic update
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, read_at: null } : n))
        )
      }
    })
  }

  function handleDismiss(id: string) {
    // Optimistic update - remove from list
    setNotifications((prev) => prev.filter((n) => n.id !== id))

    startTransition(async () => {
      const result = await dismissNotificationAction(id)
      if (result.error) {
        setError(result.error)
        // Reload to restore
        loadNotifications()
      }
    })
  }

  function handleMarkAllRead() {
    // Optimistic update
    const now = new Date().toISOString()
    setNotifications((prev) =>
      prev.map((n) => (n.read_at ? n : { ...n, read_at: now }))
    )

    startTransition(async () => {
      const result = await markAllNotificationsReadAction()
      if (result.error) {
        setError(result.error)
        loadNotifications()
      }
    })
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <h2 className="text-sm font-semibold text-gray-900">Notifications</h2>
        <div className="flex items-center gap-2">
          {unreadNotifications.length > 0 ? (
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="text-xs font-medium text-blue-600 hover:text-blue-700"
            >
              Mark all read
            </button>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close notifications"
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {loading ? (
          <p className="py-8 text-center text-sm text-gray-500">
            Loading…
          </p>
        ) : error ? (
          <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        ) : notifications.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-2xl">🔔</p>
            <p className="mt-2 text-sm text-gray-500">No active notifications</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((n) => (
              <NotificationItem
                key={n.id}
                notification={n}
                onRead={handleRead}
                onDismiss={handleDismiss}
              />
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-gray-100 px-4 py-3">
        <Link
          href="/dashboard/notifications"
          onClick={onClose}
          className="block text-center text-xs font-medium text-blue-600 hover:text-blue-700"
        >
          View all notifications
        </Link>
      </div>
    </div>
  )
}

// =========================================
// Notification Bell
// =========================================

function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const panelRef = useRef<HTMLDivElement | null>(null)
  const buttonRef = useRef<HTMLButtonElement | null>(null)

  async function loadCount() {
    const supabase = createClient()
    if (!supabase) return
    const now = new Date().toISOString()

    const { count } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .is('read_at', null)
      .is('dismissed_at', null)
      .or(`expires_at.is.null,expires_at.gt.${now}`)

    setUnreadCount(count ?? 0)
  }

  // Load unread count on mount
  useEffect(() => {
    loadCount()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Close on outside click
  useEffect(() => {
    if (!open) return

    function handleClick(e: MouseEvent) {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const countLabel =
    unreadCount > 99 ? '99+' : unreadCount > 0 ? String(unreadCount) : null

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label={
          unreadCount > 0
            ? `Notifications — ${unreadCount} unread`
            : 'Notifications'
        }
        aria-expanded={open}
        className="relative flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 shadow-sm transition hover:border-blue-300 hover:text-blue-600"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5"
          aria-hidden="true"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>

        {countLabel ? (
          <span
            aria-hidden="true"
            className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white"
          >
            {countLabel}
          </span>
        ) : null}
      </button>

      {/* Desktop popover / Mobile full-width panel */}
      {open ? (
        <div
          ref={panelRef}
          role="region"
          aria-label="Notifications"
          className="
            fixed inset-x-0 bottom-0 z-50 flex max-h-[80vh] flex-col overflow-hidden
            rounded-t-3xl border border-gray-200 bg-white shadow-2xl
            sm:absolute sm:inset-auto sm:right-0 sm:top-11 sm:bottom-auto
            sm:w-96 sm:max-h-[32rem] sm:rounded-2xl sm:rounded-t-2xl
          "
        >
          <NotificationPanel
            onClose={() => {
              setOpen(false)
              loadCount()
            }}
          />
        </div>
      ) : null}
    </div>
  )
}

// =========================================
// Account Menu
// =========================================

function AccountMenu({
  user,
  isPublicDemoUser,
  onOpenDemoLauncher,
}: {
  user: User
  isPublicDemoUser: boolean
  onOpenDemoLauncher: () => void
}) {
  const [open, setOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [logoutError, setLogoutError] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const buttonRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    if (!open) return

    function handleClick(e: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  async function handleLogout() {
    setLoggingOut(true)
    setLogoutError(null)

    try {
      const supabase = createClient()
      if (!supabase) throw new Error('Auth client unavailable.')
      const { error } = await supabase.auth.signOut()

      if (error) {
        setLogoutError(error.message)
        setLoggingOut(false)
        return
      }

      window.location.href = '/'
    } catch {
      setLogoutError('Sign-out failed. Please try again.')
      setLoggingOut(false)
    }
  }

  const initials = user.email?.slice(0, 2).toUpperCase() ?? '??'

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-label="Account menu"
        disabled={loggingOut}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700 transition hover:bg-blue-200 disabled:opacity-60"
      >
        {loggingOut ? '…' : initials}
      </button>

      {open ? (
        <div
          ref={menuRef}
          role="menu"
          className="absolute right-0 top-11 z-50 w-64 rounded-2xl border border-gray-200 bg-white p-2 shadow-2xl"
        >
          {/* User info */}
          <div className="border-b border-gray-100 px-3 py-3">
            <p className="text-xs font-semibold text-gray-900 truncate">
              {user.email}
            </p>
          </div>

          {/* Links */}
          <div className="mt-1 space-y-0.5">
            <Link
              href="/dashboard"
              onClick={() => setOpen(false)}
              role="menuitem"
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              Dashboard
            </Link>

            {isPublicDemoUser ? (
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false)
                  onOpenDemoLauncher()
                }}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-blue-700 hover:bg-blue-50"
              >
                Switch Demo Experience
              </button>
            ) : null}

            <div className="my-1 border-t border-gray-100" />

            <button
              type="button"
              role="menuitem"
              onClick={handleLogout}
              disabled={loggingOut}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-60"
            >
              {loggingOut ? 'Signing out…' : 'Sign out'}
            </button>

            {logoutError ? (
              <p className="px-3 text-xs text-red-600">{logoutError}</p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}

// =========================================
// Mobile Menu
// =========================================

function MobileMenu({
  user,
  isPublicDemoUser,
  onOpenDemoLauncher,
}: {
  user: User | null
  isPublicDemoUser: boolean
  onOpenDemoLauncher: () => void
}) {
  const [open, setOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  async function handleLogout() {
    setLoggingOut(true)
    const supabase = createClient()
    if (supabase) await supabase.auth.signOut()
    window.location.href = '/'
  }

  return (
    <div className="sm:hidden">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-label={open ? 'Close menu' : 'Open menu'}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700"
      >
        {open ? (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        )}
      </button>

      {open ? (
        <div className="absolute inset-x-0 top-full z-50 border-t border-gray-200 bg-white px-4 py-3 shadow-lg">
          {user ? (
            <>
              <p className="border-b border-gray-100 pb-2 text-xs text-gray-500 truncate">
                {user.email}
              </p>
              <nav className="mt-2 space-y-1">
                <Link
                  href="/dashboard"
                  onClick={() => setOpen(false)}
                  className="block rounded-xl px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Dashboard
                </Link>
                <Link
                  href="/dashboard/notifications"
                  onClick={() => setOpen(false)}
                  className="block rounded-xl px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Notifications
                </Link>
                {isPublicDemoUser ? (
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false)
                      onOpenDemoLauncher()
                    }}
                    className="block w-full rounded-xl px-3 py-2 text-left text-sm text-blue-700 hover:bg-blue-50"
                  >
                    Switch Demo Experience
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="block w-full rounded-xl px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 disabled:opacity-60"
                >
                  {loggingOut ? 'Signing out…' : 'Sign out'}
                </button>
              </nav>
            </>
          ) : (
            <nav className="space-y-1">
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="block rounded-xl px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                Login
              </Link>
              <Link
                href="/signup"
                onClick={() => setOpen(false)}
                className="block rounded-xl px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                Sign Up
              </Link>
            </nav>
          )}
        </div>
      ) : null}
    </div>
  )
}

// =========================================
// NavClient — main export
// =========================================

export default function NavClient({
  user,
  isDemoMode,
  isPublicDemoUser,
}: NavClientProps) {
  const [showDemoLauncher, setShowDemoLauncher] = useState(false)

  return (
    <>
      <div className="relative flex h-14 items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="text-xl font-bold text-blue-600">
          RaiseHub
        </Link>

        {/* Desktop right-side nav */}
        <div className="hidden items-center gap-3 sm:flex">
          {user ? (
            <>
              <Link
                href="/dashboard"
                className="rounded-xl px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-blue-600"
              >
                Dashboard
              </Link>
              <NotificationBell />
              <AccountMenu
                user={user}
                isPublicDemoUser={isPublicDemoUser}
                onOpenDemoLauncher={() => setShowDemoLauncher(true)}
              />
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-xl px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-blue-600"
              >
                Login
              </Link>
              <Link
                href="/signup"
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>

        {/* Mobile: show bell + hamburger */}
        <div className="flex items-center gap-2 sm:hidden">
          {user ? <NotificationBell /> : null}
          <MobileMenu
            user={user}
            isPublicDemoUser={isPublicDemoUser}
            onOpenDemoLauncher={() => setShowDemoLauncher(true)}
          />
        </div>
      </div>

      {isDemoMode && showDemoLauncher ? (
        <DemoLauncherModal onClose={() => setShowDemoLauncher(false)} />
      ) : null}
    </>
  )
}

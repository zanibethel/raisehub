'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'
import { createPortal } from 'react-dom'

import { createClient } from '@/lib/supabase/client'
import type { SelectableWorkspace } from '@/lib/types/identity-access'

type AuthenticatedWorkspaceHeaderProps = {
  email: string | null
  workspaceName: string
  workspaceLabel: string
  environmentLabel: string
  logoUrl?: string | null
  workspaces: SelectableWorkspace[]
  selectedWorkspaceKey?: string | null
  profileHref?: string | null
}

const WORKSPACE_PREFERENCE_COOKIE = 'raisehub-selected-workspace'
const WORKSPACE_PREFERENCE_MAX_AGE = 60 * 60 * 24 * 180

function rememberWorkspace(workspaceKey: string) {
  const secureAttribute = window.location.protocol === 'https:' ? '; Secure' : ''

  document.cookie = [
    `${WORKSPACE_PREFERENCE_COOKIE}=${encodeURIComponent(workspaceKey)}`,
    'Path=/',
    `Max-Age=${WORKSPACE_PREFERENCE_MAX_AGE}`,
    'SameSite=Lax',
    secureAttribute,
  ]
    .filter(Boolean)
    .join('; ')
}

function releaseFocusedControl() {
  const activeElement = document.activeElement
  if (activeElement instanceof HTMLElement) activeElement.blur()
}

function WorkspaceLogo({
  logoUrl,
  workspaceName,
}: {
  logoUrl?: string | null
  workspaceName: string
}) {
  const [failed, setFailed] = useState(false)
  const initial = workspaceName.trim().charAt(0).toUpperCase() || 'R'

  if (!logoUrl || failed) {
    return (
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-black text-white shadow-sm">
        {initial}
      </span>
    )
  }

  return (
    <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-white shadow-sm">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={logoUrl}
        alt=""
        onError={() => setFailed(true)}
        className="h-full w-full object-contain"
      />
    </span>
  )
}

export default function AuthenticatedWorkspaceHeader({
  email,
  workspaceName,
  workspaceLabel,
  environmentLabel,
  logoUrl,
  workspaces,
  selectedWorkspaceKey,
  profileHref,
}: AuthenticatedWorkspaceHeaderProps) {
  const router = useRouter()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [switchingWorkspaceKey, setSwitchingWorkspaceKey] = useState<string | null>(null)
  const [isSwitching, startWorkspaceTransition] = useTransition()

  const hasBusinessWorkspace = workspaces.some((workspace) => workspace.kind === 'business')
  const hasOrganizationWorkspace = workspaces.some(
    (workspace) => workspace.kind === 'organization' || workspace.kind === 'fundraising'
  )

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    function openDrawer() {
      releaseFocusedControl()
      setDrawerOpen(true)
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setDrawerOpen(false)
    }

    window.addEventListener('raisehub:open-workspace-menu', openDrawer)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('raisehub:open-workspace-menu', openDrawer)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  useEffect(() => {
    if (!drawerOpen) return

    const previousOverflow = document.body.style.overflow
    const previousOverscrollBehavior = document.body.style.overscrollBehavior

    document.body.style.overflow = 'hidden'
    document.body.style.overscrollBehavior = 'none'

    return () => {
      document.body.style.overflow = previousOverflow
      document.body.style.overscrollBehavior = previousOverscrollBehavior
    }
  }, [drawerOpen])

  function handleWorkspaceSelection(workspace: SelectableWorkspace) {
    if (isSwitching || workspace.key === selectedWorkspaceKey) return

    rememberWorkspace(workspace.key)
    setSwitchingWorkspaceKey(workspace.key)

    startWorkspaceTransition(() => {
      setDrawerOpen(false)
      router.push(workspace.href)
      router.refresh()
    })
  }

  async function handleLogout() {
    if (loggingOut) return
    setLoggingOut(true)

    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const drawer = drawerOpen ? (
    <div className="fixed inset-0 z-[300] h-[100dvh] w-full max-w-full overflow-x-hidden overscroll-none">
      <button
        type="button"
        aria-label="Close workspace menu"
        onClick={() => setDrawerOpen(false)}
        className="absolute inset-0 bg-slate-950/40 backdrop-blur-[1px]"
      />

      <section className="absolute inset-x-0 bottom-0 flex w-full max-w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl max-h-[min(78dvh,42rem)] sm:inset-y-0 sm:left-auto sm:right-0 sm:max-h-none sm:w-96 sm:rounded-none">
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Workspace menu</p>
            <p className="mt-1 truncate text-base font-black text-slate-950">{workspaceName}</p>
          </div>
          <button
            type="button"
            onClick={() => setDrawerOpen(false)}
            aria-label="Close workspace menu"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xl text-slate-700"
          >
            ×
          </button>
        </div>

        <div className="min-h-0 min-w-0 flex-1 touch-pan-y overflow-x-hidden overflow-y-auto overscroll-contain p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="min-w-0 space-y-5">
            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              <p className="text-xs font-semibold text-slate-500">Signed in as</p>
              <p className="mt-1 truncate text-sm font-bold text-slate-900">{email ?? 'RaiseHub account'}</p>
            </div>

            <nav className="min-w-0 space-y-1" aria-label="Workspace actions">
              <Link href="/dashboard" onClick={() => setDrawerOpen(false)} className="flex min-w-0 items-center justify-between rounded-xl px-4 py-3 text-sm font-bold text-slate-800 hover:bg-slate-50">
                <span className="min-w-0 truncate">Dashboard</span> <span className="ml-3 shrink-0" aria-hidden="true">›</span>
              </Link>
              <Link href="/dashboard/notifications" onClick={() => setDrawerOpen(false)} className="flex min-w-0 items-center justify-between rounded-xl px-4 py-3 text-sm font-bold text-slate-800 hover:bg-slate-50">
                <span className="min-w-0 truncate">Notifications</span> <span className="ml-3 shrink-0" aria-hidden="true">›</span>
              </Link>
              <Link href="/dashboard/business-signup-qr" onClick={() => setDrawerOpen(false)} className="flex min-w-0 items-center justify-between rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-black text-green-800 hover:bg-green-100">
                <span className="min-w-0 truncate">Business signup QR</span> <span className="ml-3 shrink-0" aria-hidden="true">▦</span>
              </Link>
              {profileHref ? (
                <Link href={profileHref} onClick={() => setDrawerOpen(false)} className="flex min-w-0 items-center justify-between rounded-xl px-4 py-3 text-sm font-bold text-slate-800 hover:bg-slate-50">
                  <span className="min-w-0 truncate">Edit profile</span> <span className="ml-3 shrink-0" aria-hidden="true">›</span>
                </Link>
              ) : null}
              <Link href="/support" onClick={() => setDrawerOpen(false)} className="flex min-w-0 items-center justify-between rounded-xl px-4 py-3 text-sm font-bold text-slate-800 hover:bg-slate-50">
                <span className="min-w-0 truncate">Help and support</span> <span className="ml-3 shrink-0" aria-hidden="true">›</span>
              </Link>
            </nav>

            {workspaces.length > 0 ? (
              <div className="min-w-0">
                <p className="px-2 text-xs font-black uppercase tracking-[0.16em] text-slate-500">Switch experience</p>
                <div className="mt-2 min-w-0 space-y-1">
                  {workspaces.map((workspace) => {
                    const current = workspace.key === selectedWorkspaceKey
                    const opening = isSwitching && workspace.key === switchingWorkspaceKey

                    return (
                      <button
                        key={workspace.key}
                        type="button"
                        onClick={() => handleWorkspaceSelection(workspace)}
                        disabled={current || isSwitching}
                        className={`flex w-full min-w-0 items-center justify-between rounded-xl px-4 py-3 text-left text-sm font-bold transition ${
                          current ? 'bg-blue-50 text-blue-700' : 'text-slate-800 hover:bg-slate-50'
                        } disabled:opacity-70`}
                      >
                        <span className="min-w-0 truncate">{workspace.name}</span>
                        <span className="ml-3 shrink-0 text-xs">{opening ? 'Opening…' : current ? 'Current' : '›'}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            ) : null}

            {!hasBusinessWorkspace || !hasOrganizationWorkspace ? (
              <div className="min-w-0">
                <p className="px-2 text-xs font-black uppercase tracking-[0.16em] text-slate-500">Add an experience</p>
                <div className="mt-2 min-w-0 space-y-1">
                  {!hasOrganizationWorkspace ? (
                    <Link href="/workspace/new/organization" onClick={() => setDrawerOpen(false)} className="flex min-w-0 items-center justify-between rounded-xl px-4 py-3 text-sm font-bold text-blue-700 hover:bg-blue-50">
                      <span className="min-w-0 truncate">Start a fundraiser</span> <span className="ml-3 shrink-0" aria-hidden="true">›</span>
                    </Link>
                  ) : null}
                  {!hasBusinessWorkspace ? (
                    <Link href="/workspace/new/business" onClick={() => setDrawerOpen(false)} className="flex min-w-0 items-center justify-between rounded-xl px-4 py-3 text-sm font-bold text-green-700 hover:bg-green-50">
                      <span className="min-w-0 truncate">Join as a business</span> <span className="ml-3 shrink-0" aria-hidden="true">›</span>
                    </Link>
                  ) : null}
                </div>
              </div>
            ) : null}

            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="w-full min-w-0 rounded-xl px-4 py-3 text-left text-sm font-bold text-red-600 hover:bg-red-50 disabled:opacity-60"
            >
              {loggingOut ? 'Signing out…' : 'Sign out'}
            </button>
          </div>
        </div>
      </section>
    </div>
  ) : null

  return (
    <>
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
        <Link href="/dashboard" className="flex min-w-0 flex-1 items-center gap-3">
          <WorkspaceLogo logoUrl={logoUrl} workspaceName={workspaceName} />

          <span className="min-w-0">
            <span className="block truncate text-base font-black text-slate-950 sm:text-lg">
              {workspaceName}
            </span>
            <span className="block truncate text-xs font-semibold text-slate-500">
              {workspaceLabel} · {environmentLabel}
            </span>
          </span>
        </Link>

        <Link
          href="/dashboard/notifications"
          aria-label="Notifications"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm hover:border-blue-300 hover:text-blue-600"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5" aria-hidden="true">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        </Link>

        <button
          type="button"
          onClick={() => {
            releaseFocusedControl()
            setDrawerOpen(true)
          }}
          aria-label="Open workspace menu"
          aria-expanded={drawerOpen}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm hover:border-blue-300 hover:text-blue-600"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5" aria-hidden="true">
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {mounted && drawer ? createPortal(drawer, document.body) : null}
    </>
  )
}

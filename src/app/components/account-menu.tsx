'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState, useTransition } from 'react'

import { createClient } from '@/lib/supabase/client'
import type {
  SelectableWorkspace,
  SelectableWorkspaceKind,
} from '@/lib/types/identity-access'

type AccountMenuProps = {
  email: string | null
  workspaces: SelectableWorkspace[]
  selectedWorkspaceKey?: string | null
}

const WORKSPACE_PREFERENCE_COOKIE = 'raisehub-selected-workspace'
const WORKSPACE_PREFERENCE_MAX_AGE = 60 * 60 * 24 * 180

function rememberWorkspace(workspaceKey: string) {
  const secureAttribute =
    window.location.protocol === 'https:' ? '; Secure' : ''

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

function WorkspaceIcon({ kind }: { kind: SelectableWorkspaceKind }) {
  const sharedProps = {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className: 'h-5 w-5',
    'aria-hidden': true,
  }

  if (kind === 'customer') {
    return (
      <svg {...sharedProps}>
        <path d="M5 7.5h14v11H5z" />
        <path d="M8 7.5V6a4 4 0 0 1 8 0v1.5" />
      </svg>
    )
  }

  if (kind === 'organization') {
    return (
      <svg {...sharedProps}>
        <path d="M4 20h16" />
        <path d="M6 20V8l6-4 6 4v12" />
        <path d="M9 20v-5h6v5" />
      </svg>
    )
  }

  if (kind === 'business') {
    return (
      <svg {...sharedProps}>
        <path d="M4 10h16" />
        <path d="M5 10V6h14v4" />
        <path d="M6 10v10h12V10" />
        <path d="M9 20v-5h6v5" />
      </svg>
    )
  }

  if (kind === 'fundraising') {
    return (
      <svg {...sharedProps}>
        <path d="M4 13V8.5A1.5 1.5 0 0 1 5.5 7H8l7-3v13l-7-3H5.5A1.5 1.5 0 0 1 4 13Z" />
        <path d="m8 14 1.5 5H7l-1.5-5" />
      </svg>
    )
  }

  return (
    <svg {...sharedProps}>
      <path d="M12 3 4.5 6v5c0 4.8 3 8.2 7.5 10 4.5-1.8 7.5-5.2 7.5-10V6L12 3Z" />
      <path d="m9.5 12 1.7 1.7 3.6-3.6" />
    </svg>
  )
}

function LoadingSpinner() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="h-4 w-4 animate-spin"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="3"
        className="opacity-25"
      />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        className="opacity-90"
      />
    </svg>
  )
}

function getSelectedWorkspace(
  workspaces: SelectableWorkspace[],
  selectedWorkspaceKey?: string | null
) {
  return (
    workspaces.find((workspace) => workspace.key === selectedWorkspaceKey) ??
    workspaces.find((workspace) => workspace.isDefault) ??
    workspaces[0] ??
    null
  )
}

export default function AccountMenu({
  email,
  workspaces,
  selectedWorkspaceKey,
}: AccountMenuProps) {
  const router = useRouter()
  const detailsRef = useRef<HTMLDetailsElement | null>(null)
  const [switchingWorkspaceKey, setSwitchingWorkspaceKey] =
    useState<string | null>(null)
  const [isSwitching, startWorkspaceTransition] = useTransition()

  const selectedWorkspace = getSelectedWorkspace(
    workspaces,
    selectedWorkspaceKey
  )
  const hasBusinessWorkspace = workspaces.some(
    (workspace) => workspace.kind === 'business'
  )
  const hasOrganizationWorkspace = workspaces.some(
    (workspace) => workspace.kind === 'organization'
  )
  const showAddExperience =
    !hasBusinessWorkspace || !hasOrganizationWorkspace

  useEffect(() => {
    if (selectedWorkspace?.key) rememberWorkspace(selectedWorkspace.key)
  }, [selectedWorkspace?.key])

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      const details = detailsRef.current
      if (
        details?.open &&
        !details.contains(event.target as Node)
      ) {
        details.open = false
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && detailsRef.current?.open) {
        detailsRef.current.open = false
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  function handleWorkspaceSelection(workspace: SelectableWorkspace) {
    if (isSwitching || workspace.key === selectedWorkspace?.key) return

    rememberWorkspace(workspace.key)
    setSwitchingWorkspaceKey(workspace.key)

    startWorkspaceTransition(() => {
      router.push(workspace.href)
      router.refresh()
    })
  }

  async function handleLogout() {
    if (detailsRef.current) detailsRef.current.open = false
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <details
      ref={detailsRef}
      className="group relative ml-0 w-full max-w-full self-stretch sm:ml-auto sm:w-fit sm:self-end"
    >
      <summary className="flex w-full min-w-0 cursor-pointer list-none items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-left shadow-sm transition hover:border-blue-300 hover:bg-blue-50 sm:w-fit sm:max-w-full">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
          {(email?.trim().charAt(0) || 'A').toUpperCase()}
        </span>
        <span className="min-w-0 flex-1 sm:flex-none">
          <span className="block max-w-full truncate text-sm font-semibold text-gray-900 sm:max-w-52">
            {isSwitching
              ? 'Switching experience…'
              : selectedWorkspace?.name ?? 'My Account'}
          </span>
          <span className="hidden max-w-52 truncate text-xs text-gray-500 sm:block">
            {email ?? 'RaiseHub account'}
          </span>
        </span>
        {isSwitching ? (
          <LoadingSpinner />
        ) : (
          <svg
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
            className="h-4 w-4 shrink-0 text-gray-500 transition group-open:rotate-180"
          >
            <path
              fillRule="evenodd"
              d="M5.22 7.22a.75.75 0 0 1 1.06 0L10 10.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 8.28a.75.75 0 0 1 0-1.06Z"
              clipRule="evenodd"
            />
          </svg>
        )}
      </summary>

      <div className="absolute left-0 right-0 z-50 mt-2 w-full max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl sm:left-auto sm:right-0 sm:w-[min(22rem,calc(100vw-2rem))]">
        <div className="border-b border-gray-100 px-4 py-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Signed in as
          </p>
          <p className="mt-1 truncate text-sm font-medium text-gray-900">
            {email ?? 'RaiseHub account'}
          </p>
        </div>

        <div className="border-b border-gray-100 px-3 py-3">
          <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
            Switch Experience
          </p>
          <div className="max-h-80 space-y-1 overflow-y-auto">
            {workspaces.map((workspace) => {
              const isCurrent = workspace.key === selectedWorkspace?.key
              const isOpening =
                isSwitching && workspace.key === switchingWorkspaceKey

              return (
                <button
                  key={workspace.key}
                  type="button"
                  onClick={() => handleWorkspaceSelection(workspace)}
                  disabled={isCurrent || isSwitching}
                  aria-current={isCurrent ? 'page' : undefined}
                  className={`flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition ${
                    isCurrent
                      ? 'bg-blue-50'
                      : 'hover:bg-blue-50 disabled:opacity-50'
                  }`}
                >
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-700">
                    <WorkspaceIcon kind={workspace.kind} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-sm font-semibold text-gray-900">
                        {workspace.name}
                      </span>
                      {isCurrent ? (
                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-700">
                          Current
                        </span>
                      ) : null}
                      {isOpening ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-700">
                          <LoadingSpinner /> Opening…
                        </span>
                      ) : null}
                    </span>
                    {workspace.subtitle ? (
                      <span className="mt-0.5 block text-xs text-gray-500">
                        {workspace.subtitle}
                      </span>
                    ) : null}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {showAddExperience ? (
          <div className="border-b border-gray-100 px-3 py-3">
            <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Add another experience
            </p>
            <div className="space-y-1">
              {!hasBusinessWorkspace ? (
                <Link
                  href="/workspace/new/business"
                  className="flex items-center justify-between rounded-xl px-3 py-3 text-sm font-semibold text-green-700 transition hover:bg-green-50"
                >
                  <span>Join RaiseHub Partners</span>
                  <span aria-hidden="true">→</span>
                </Link>
              ) : null}
              {!hasOrganizationWorkspace ? (
                <Link
                  href="/workspace/new/organization"
                  className="flex items-center justify-between rounded-xl px-3 py-3 text-sm font-semibold text-blue-700 transition hover:bg-blue-50"
                >
                  <span>Raise Funds for Your Organization</span>
                  <span aria-hidden="true">→</span>
                </Link>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className="p-3">
          <button
            type="button"
            onClick={handleLogout}
            disabled={isSwitching}
            className="w-full rounded-xl px-3 py-3 text-left text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50"
          >
            Sign out
          </button>
        </div>
      </div>
    </details>
  )
}

'use client'

import { useRouter } from 'next/navigation'
import {
  useEffect,
  useRef,
  useState,
  useTransition,
} from 'react'

import { createClient } from '@/lib/supabase/client'
import type {
  SelectableWorkspace,
  SelectableWorkspaceKind,
} from '@/lib/types/identity-access'

// =============================================================================
// Types
// =============================================================================

type AccountMenuProps = {
  email: string | null
  workspaces: SelectableWorkspace[]
  selectedWorkspaceKey?: string | null
}

type WorkspaceIconProps = {
  kind: SelectableWorkspaceKind
}

// =============================================================================
// Workspace preference
// =============================================================================

const WORKSPACE_PREFERENCE_COOKIE =
  'raisehub-selected-workspace'

const WORKSPACE_PREFERENCE_MAX_AGE =
  60 * 60 * 24 * 180

function rememberWorkspace(
  workspaceKey: string
) {
  const secureAttribute =
    window.location.protocol === 'https:'
      ? '; Secure'
      : ''

  document.cookie = [
    `${WORKSPACE_PREFERENCE_COOKIE}=${encodeURIComponent(
      workspaceKey
    )}`,
    'Path=/',
    `Max-Age=${WORKSPACE_PREFERENCE_MAX_AGE}`,
    'SameSite=Lax',
    secureAttribute,
  ]
    .filter(Boolean)
    .join('; ')
}

// =============================================================================
// Presentation helpers
// =============================================================================

function WorkspaceIcon({
  kind,
}: WorkspaceIconProps) {
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

  switch (kind) {
    case 'customer':
      return (
        <svg {...sharedProps}>
          <path d="M5 7.5h14v11H5z" />
          <path d="M8 7.5V6a4 4 0 0 1 8 0v1.5" />
          <path d="M8 11h.01" />
          <path d="M16 11h.01" />
        </svg>
      )

    case 'fundraising':
      return (
        <svg {...sharedProps}>
          <path d="M4 13V8.5a1.5 1.5 0 0 1 1.5-1.5H8l7-3v13l-7-3H5.5A1.5 1.5 0 0 1 4 13Z" />
          <path d="m8 14 1.5 5H7l-1.5-5" />
          <path d="M18 8.5a4 4 0 0 1 0 4" />
        </svg>
      )

    case 'organization':
      return (
        <svg {...sharedProps}>
          <path d="M4 20h16" />
          <path d="M6 20V8l6-4 6 4v12" />
          <path d="M9 20v-5h6v5" />
          <path d="M9 10h.01" />
          <path d="M12 10h.01" />
          <path d="M15 10h.01" />
        </svg>
      )

    case 'business':
      return (
        <svg {...sharedProps}>
          <path d="M4 10h16" />
          <path d="M5 10V6h14v4" />
          <path d="M6 10v10h12V10" />
          <path d="M9 20v-5h6v5" />
          <path d="M4 10c0 1.1.9 2 2 2s2-.9 2-2c0 1.1.9 2 2 2s2-.9 2-2c0 1.1.9 2 2 2s2-.9 2-2c0 1.1.9 2 2 2s2-.9 2-2" />
        </svg>
      )

    case 'owner':
      return (
        <svg {...sharedProps}>
          <path d="M12 3 4.5 6v5c0 4.8 3 8.2 7.5 10 4.5-1.8 7.5-5.2 7.5-10V6L12 3Z" />
          <path d="m9.5 12 1.7 1.7 3.6-3.6" />
        </svg>
      )
  }
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

function getAccountInitial(
  email: string | null
): string {
  const normalizedEmail = email?.trim()

  if (!normalizedEmail) {
    return 'A'
  }

  return normalizedEmail
    .charAt(0)
    .toUpperCase()
}

function getSelectedWorkspace(
  workspaces: SelectableWorkspace[],
  selectedWorkspaceKey?: string | null
): SelectableWorkspace | null {
  const selectedWorkspace =
    selectedWorkspaceKey
      ? workspaces.find(
          (workspace) =>
            workspace.key ===
            selectedWorkspaceKey
        )
      : null

  return (
    selectedWorkspace ??
    workspaces.find(
      (workspace) => workspace.isDefault
    ) ??
    workspaces[0] ??
    null
  )
}

// =============================================================================
// Component
// =============================================================================

export default function AccountMenu({
  email,
  workspaces,
  selectedWorkspaceKey,
}: AccountMenuProps) {
  const router = useRouter()

  const detailsRef =
    useRef<HTMLDetailsElement | null>(null)

  const [switchingWorkspaceKey, setSwitchingWorkspaceKey] =
    useState<string | null>(null)

  const [isSwitching, startWorkspaceTransition] =
    useTransition()

  const selectedWorkspace =
    getSelectedWorkspace(
      workspaces,
      selectedWorkspaceKey
    )

  const showWorkspaceSwitcher =
    workspaces.length > 1

  useEffect(() => {
    function handlePointerDown(
      event: PointerEvent
    ) {
      const details = detailsRef.current

      if (
        !details?.open ||
        details.contains(
          event.target as Node
        )
      ) {
        return
      }

      details.open = false
    }

    function handleKeyDown(
      event: KeyboardEvent
    ) {
      if (
        event.key === 'Escape' &&
        detailsRef.current?.open &&
        !isSwitching
      ) {
        detailsRef.current.open = false
      }
    }

    document.addEventListener(
      'pointerdown',
      handlePointerDown
    )

    document.addEventListener(
      'keydown',
      handleKeyDown
    )

    return () => {
      document.removeEventListener(
        'pointerdown',
        handlePointerDown
      )

      document.removeEventListener(
        'keydown',
        handleKeyDown
      )
    }
  }, [isSwitching])

  useEffect(() => {
    if (
      !isSwitching &&
      switchingWorkspaceKey !== null
    ) {
      setSwitchingWorkspaceKey(null)

      if (detailsRef.current) {
        detailsRef.current.open = false
      }
    }
  }, [
    isSwitching,
    switchingWorkspaceKey,
  ])

  function closeAccountMenu() {
    if (detailsRef.current) {
      detailsRef.current.open = false
    }
  }

  function handleWorkspaceSelection(
    workspace: SelectableWorkspace
  ) {
    if (
      isSwitching ||
      workspace.key === selectedWorkspace?.key
    ) {
      return
    }

    rememberWorkspace(workspace.key)
    setSwitchingWorkspaceKey(workspace.key)

    startWorkspaceTransition(() => {
      router.push(workspace.href)
      router.refresh()
    })
  }

  async function handleLogout() {
    closeAccountMenu()

    const supabase = createClient()

    await supabase.auth.signOut()

    window.location.href = '/login'
  }

  return (
    <details
      ref={detailsRef}
      className="group relative ml-auto w-fit self-end"
    >
      <summary
        aria-disabled={isSwitching}
        className="flex w-fit cursor-pointer list-none items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-left shadow-sm transition hover:border-blue-300 hover:bg-blue-50"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
          {getAccountInitial(email)}
        </span>

        <span className="min-w-0">
          <span className="block max-w-40 truncate text-sm font-semibold text-gray-900 sm:max-w-52">
            {isSwitching
              ? 'Switching experience…'
              : selectedWorkspace?.name ??
                'My Account'}
          </span>

          <span className="hidden max-w-52 truncate text-xs text-gray-500 sm:block">
            {email ?? 'RaiseHub account'}
          </span>
        </span>

        {isSwitching ? (
          <span className="shrink-0 text-blue-600">
            <LoadingSpinner />
          </span>
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

      <div className="absolute right-0 z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
        <div className="border-b border-gray-100 px-4 py-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Signed in as
          </p>

          <p className="mt-1 truncate text-sm font-medium text-gray-900">
            {email ?? 'RaiseHub account'}
          </p>
        </div>

        {showWorkspaceSwitcher ? (
          <div className="border-b border-gray-100 px-3 py-3">
            <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Switch Experience
            </p>

            <div className="max-h-80 space-y-1 overflow-y-auto">
              {workspaces.map((workspace) => {
                const isCurrent =
                  workspace.key ===
                  selectedWorkspace?.key

                const isOpening =
                  isSwitching &&
                  workspace.key ===
                    switchingWorkspaceKey

                return (
                  <button
                    key={workspace.key}
                    type="button"
                    onClick={() =>
                      handleWorkspaceSelection(
                        workspace
                      )
                    }
                    disabled={
                      isCurrent ||
                      isSwitching
                    }
                    aria-current={
                      isCurrent
                        ? 'page'
                        : undefined
                    }
                    className={`flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 disabled:cursor-default ${
                      isCurrent
                        ? 'bg-blue-50'
                        : isOpening
                          ? 'bg-blue-50 text-blue-700'
                          : 'hover:bg-blue-50 disabled:opacity-50'
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-700"
                    >
                      <WorkspaceIcon
                        kind={workspace.kind}
                      />
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="truncate text-sm font-semibold text-gray-900">
                          {workspace.name}
                        </span>

                        {isCurrent ? (
                          <span className="shrink-0 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-700">
                            Current
                          </span>
                        ) : null}

                        {isOpening ? (
                          <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-blue-700">
                            <LoadingSpinner />
                            Opening…
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
        ) : null}

        <div className="p-3">
          <button
            type="button"
            onClick={handleLogout}
            disabled={isSwitching}
            className="w-full rounded-xl px-3 py-3 text-left text-sm font-medium text-red-600 transition hover:bg-red-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-500 disabled:opacity-50"
          >
            Sign out
          </button>
        </div>
      </div>
    </details>
  )
}

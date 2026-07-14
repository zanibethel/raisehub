'use client'

import Link from 'next/link'

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
}

// =============================================================================
// Presentation helpers
// =============================================================================

function getWorkspaceIcon(kind: SelectableWorkspaceKind): string {
  switch (kind) {
    case 'customer':
      return '🎟️'

    case 'fundraising':
      return '📣'

    case 'organization':
      return '🏫'

    case 'business':
      return '🏪'

    case 'owner':
      return '🛠️'
  }
}

function getAccountInitial(email: string | null): string {
  const normalizedEmail = email?.trim()

  if (!normalizedEmail) {
    return 'A'
  }

  return normalizedEmail.charAt(0).toUpperCase()
}

// =============================================================================
// Component
// =============================================================================

export default function AccountMenu({
  email,
  workspaces,
}: AccountMenuProps) {
  const defaultWorkspace =
    workspaces.find((workspace) => workspace.isDefault) ??
    workspaces[0] ??
    null

  const showWorkspaceSwitcher = workspaces.length > 1

  async function handleLogout() {
    const supabase = createClient()

    await supabase.auth.signOut()

    window.location.href = '/login'
  }

  return (
    <details className="group relative">
      <summary className="flex cursor-pointer list-none items-center gap-3 rounded-xl border border-gray-200 bg-white px-3 py-2 text-left shadow-sm transition hover:border-blue-300 hover:bg-blue-50">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
          {getAccountInitial(email)}
        </span>

        <span className="hidden min-w-0 sm:block">
          <span className="block max-w-52 truncate text-sm font-semibold text-gray-900">
            {defaultWorkspace?.name ?? 'My Account'}
          </span>

          <span className="block max-w-52 truncate text-xs text-gray-500">
            {email ?? 'RaiseHub account'}
          </span>
        </span>

        <span
          aria-hidden="true"
          className="text-xs text-gray-500 transition group-open:rotate-180"
        >
          ▼
        </span>
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
              {workspaces.map((workspace) => (
                <Link
                  key={workspace.key}
                  href={workspace.href}
                  className="flex items-start gap-3 rounded-xl px-3 py-3 transition hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500"
                >
                  <span
                    aria-hidden="true"
                    className="mt-0.5 text-lg"
                  >
                    {getWorkspaceIcon(workspace.kind)}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-sm font-semibold text-gray-900">
                        {workspace.name}
                      </span>

                      {workspace.isDefault ? (
                        <span className="shrink-0 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-700">
                          Current
                        </span>
                      ) : null}
                    </span>

                    {workspace.subtitle ? (
                      <span className="mt-0.5 block text-xs text-gray-500">
                        {workspace.subtitle}
                      </span>
                    ) : null}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        ) : null}

        <div className="p-3">
          <button
            type="button"
            onClick={handleLogout}
            className="w-full rounded-xl px-3 py-3 text-left text-sm font-medium text-red-600 transition hover:bg-red-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-500"
          >
            Sign out
          </button>
        </div>
      </div>
    </details>
  )
}
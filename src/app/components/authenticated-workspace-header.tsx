'use client'

import Image from 'next/image'
import Link from 'next/link'

import AccountMenu from '@/app/components/account-menu'
import type { SelectableWorkspace } from '@/lib/types/identity-access'

type AuthenticatedWorkspaceHeaderProps = {
  email: string | null
  workspaceName: string
  workspaceLabel: string
  environmentLabel: string
  logoUrl?: string | null
  workspaces: SelectableWorkspace[]
  selectedWorkspaceKey?: string | null
}

export default function AuthenticatedWorkspaceHeader({
  email,
  workspaceName,
  workspaceLabel,
  environmentLabel,
  logoUrl,
  workspaces,
  selectedWorkspaceKey,
}: AuthenticatedWorkspaceHeaderProps) {
  const initial = workspaceName.trim().charAt(0).toUpperCase() || 'R'

  return (
    <div className="workspace-global-header mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
      <Link href="/dashboard" className="flex min-w-0 flex-1 items-center gap-3">
        {logoUrl ? (
          <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full border border-slate-200 bg-white shadow-sm">
            <Image src={logoUrl} alt="" fill sizes="44px" className="object-contain" />
          </span>
        ) : (
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-black text-white shadow-sm">
            {initial}
          </span>
        )}

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

      <div className="workspace-global-menu shrink-0">
        <AccountMenu
          email={email}
          workspaces={workspaces}
          selectedWorkspaceKey={selectedWorkspaceKey}
        />
      </div>

      <style>{`
        .workspace-global-menu details {
          width: auto !important;
          align-self: auto !important;
        }

        .workspace-global-menu summary {
          width: 2.5rem !important;
          height: 2.5rem !important;
          min-width: 2.5rem !important;
          padding: 0 !important;
          justify-content: center !important;
          border-radius: 9999px !important;
        }

        .workspace-global-menu summary > span,
        .workspace-global-menu summary > svg {
          display: none !important;
        }

        .workspace-global-menu summary::after {
          content: '☰';
          font-size: 1.25rem;
          line-height: 1;
          color: #334155;
        }

        @media (max-width: 639px) {
          .workspace-global-menu details > div {
            position: fixed !important;
            left: 0 !important;
            right: 0 !important;
            bottom: 0 !important;
            top: auto !important;
            width: 100% !important;
            max-width: none !important;
            max-height: 78vh !important;
            overflow-y: auto !important;
            margin: 0 !important;
            border-radius: 1.5rem 1.5rem 0 0 !important;
            z-index: 150 !important;
            padding-bottom: max(1rem, env(safe-area-inset-bottom));
          }
        }
      `}</style>
    </div>
  )
}

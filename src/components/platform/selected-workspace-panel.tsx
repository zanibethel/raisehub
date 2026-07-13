import Link from 'next/link'

import type {
  WorkspaceCardData,
  WorkspaceRole,
} from '@/lib/types/identity-access'

// =============================================================================
// Types
// =============================================================================

export type WorkspaceSupportMode =
  | 'workspace'
  | 'read-only'

type SelectedWorkspacePanelProps = {
  workspace: WorkspaceCardData
  mode: WorkspaceSupportMode
}

// =============================================================================
// Helpers
// =============================================================================

function getRoleLabel(role: WorkspaceRole): string {
  switch (role) {
    case 'business':
      return 'Business'

    case 'organization':
      return 'Organization'

    case 'customer':
      return 'Customer'
  }
}

function getModeLabel(mode: WorkspaceSupportMode): string {
  return mode === 'read-only'
    ? 'Read-only support'
    : 'Workspace preview'
}

function getModeClasses(mode: WorkspaceSupportMode): string {
  return mode === 'read-only'
    ? 'border-amber-200 bg-amber-50 text-amber-800'
    : 'border-blue-200 bg-blue-50 text-blue-700'
}

// =============================================================================
// Component
// =============================================================================

export default function SelectedWorkspacePanel({
  workspace,
  mode,
}: SelectedWorkspacePanelProps) {
  const isReadOnly = mode === 'read-only'

  return (
    <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-4 sm:px-6">
        <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
              Selected workspace
            </p>

            <h2 className="mt-1 break-words text-xl font-bold text-slate-950">
              {workspace.name}
            </h2>

            <p className="mt-1 text-sm text-slate-600">
              {getRoleLabel(workspace.role)}
              {workspace.planLabel
                ? ` · ${workspace.planLabel}`
                : ''}
            </p>
          </div>

          <span
            className={`inline-flex shrink-0 rounded-full border px-3 py-1 text-xs font-bold ${getModeClasses(
              mode
            )}`}
          >
            {getModeLabel(mode)}
          </span>
        </div>
      </div>

      <div className="grid min-w-0 gap-4 p-4 sm:p-6 md:grid-cols-3">
        <article className="min-w-0 rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
            Account
          </p>

          <p className="mt-2 break-words text-sm font-semibold text-slate-900">
            {workspace.email ?? 'No email added'}
          </p>

          <p className="mt-1 break-words text-sm text-slate-600">
            {workspace.phone ?? 'No phone added'}
          </p>
        </article>

        <article className="min-w-0 rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
            Setup
          </p>

          <p className="mt-2 text-lg font-bold text-slate-950">
            {workspace.setupPercentage ?? 0}%
          </p>

          <p className="mt-1 text-sm text-slate-600">
            {workspace.completedSetupItems ?? 0} of{' '}
            {workspace.totalSetupItems ?? 0} items complete
          </p>
        </article>

        <article className="min-w-0 rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
            Access
          </p>

          <p className="mt-2 text-sm font-semibold text-slate-900">
            {isReadOnly
              ? 'Viewing only'
              : 'Workspace preview'}
          </p>

          <p className="mt-1 text-sm leading-5 text-slate-600">
            {isReadOnly
              ? 'Changes are disabled while support mode is read-only.'
              : 'Your owner identity remains unchanged.'}
          </p>
        </article>
      </div>

      <div className="flex flex-col gap-2 border-t border-slate-200 bg-slate-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="text-sm text-slate-600">
          Actor: Owner · Subject: {workspace.name}
        </p>

        <div className="flex flex-col gap-2 sm:flex-row">
          {!isReadOnly ? (
            <Link
              href={`/dashboard?workspaceId=${workspace.id}&workspaceRole=${workspace.role}&supportMode=read-only`}
              className="inline-flex min-h-10 items-center justify-center rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900 transition hover:bg-amber-100"
            >
              Enter Support Mode
            </Link>
          ) : null}

          <Link
            href="/dashboard"
            className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Close Workspace
          </Link>
        </div>
      </div>
    </section>
  )
}
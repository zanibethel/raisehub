'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import type {
  WorkspaceCardData,
  WorkspaceRole,
} from '@/lib/types/identity-access'

export type WorkspaceSupportMode = 'workspace' | 'read-only'

type SelectedWorkspacePanelProps = {
  workspace: WorkspaceCardData
  mode: WorkspaceSupportMode
}

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
  return mode === 'read-only' ? 'Read-only support' : 'Workspace preview'
}

function getModeClasses(mode: WorkspaceSupportMode): string {
  return mode === 'read-only'
    ? 'border-amber-200 bg-amber-50 text-amber-800'
    : 'border-blue-200 bg-blue-50 text-blue-700'
}

function getStatusClasses(status?: string | null): string {
  switch (status) {
    case 'active':
      return 'border-green-200 bg-green-50 text-green-800'
    case 'restore_requested':
      return 'border-blue-200 bg-blue-50 text-blue-800'
    case 'archived':
      return 'border-slate-300 bg-slate-100 text-slate-700'
    case 'suspended':
      return 'border-red-200 bg-red-50 text-red-800'
    default:
      return 'border-amber-200 bg-amber-50 text-amber-800'
  }
}

function getStatusLabel(status?: string | null): string {
  switch (status) {
    case 'restore_requested':
      return 'Restore requested'
    case 'archived':
      return 'Archived'
    case 'suspended':
      return 'Suspended'
    case 'inactive':
      return 'Inactive'
    default:
      return 'Active'
  }
}

export default function SelectedWorkspacePanel({
  workspace,
  mode,
}: SelectedWorkspacePanelProps) {
  const router = useRouter()
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isReadOnly = mode === 'read-only'
  const isBusiness = workspace.role === 'business'
  const isArchived = workspace.status === 'archived'
  const isRestoreRequested = workspace.status === 'restore_requested'

  async function updateBusinessLifecycle(
    action: 'archive' | 'restore' | 'keep_archived'
  ) {
    let reason: string | undefined

    if (action === 'archive') {
      const enteredReason = window.prompt(
        'Why is this business being archived? This reason is shown internally and on the business dashboard.'
      )
      if (enteredReason === null) return
      reason = enteredReason.trim() || 'Archived by RaiseHub Owner'

      const confirmed = window.confirm(
        'Archive this business workspace? Its supporter account will remain active, but the business and its offers will no longer be live.'
      )
      if (!confirmed) return
    }

    if (action === 'restore') {
      const confirmed = window.confirm(
        'Restore this business workspace to production visibility?'
      )
      if (!confirmed) return
    }

    setIsUpdating(true)
    setError(null)

    try {
      const response = await fetch('/api/owner/business-lifecycle', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: workspace.id,
          action,
          reason,
        }),
      })
      const data = (await response.json().catch(() => ({}))) as { error?: string }

      if (!response.ok) {
        throw new Error(data.error || 'Could not update this workspace.')
      }

      router.refresh()
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : 'Could not update this workspace.'
      )
    } finally {
      setIsUpdating(false)
    }
  }

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
              {workspace.planLabel ? ` · ${workspace.planLabel}` : ''}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <span
              className={`inline-flex shrink-0 rounded-full border px-3 py-1 text-xs font-bold ${getStatusClasses(
                workspace.status
              )}`}
            >
              {getStatusLabel(workspace.status)}
            </span>
            <span
              className={`inline-flex shrink-0 rounded-full border px-3 py-1 text-xs font-bold ${getModeClasses(
                mode
              )}`}
            >
              {getModeLabel(mode)}
            </span>
          </div>
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
            Production visibility
          </p>
          <p className="mt-2 text-sm font-semibold text-slate-900">
            {isArchived || isRestoreRequested ? 'Not currently live' : 'Live'}
          </p>
          <p className="mt-1 text-sm leading-5 text-slate-600">
            {isArchived || isRestoreRequested
              ? 'The supporter account remains active while this workspace is hidden.'
              : 'This workspace may appear in production discovery.'}
          </p>
        </article>
      </div>

      {error ? (
        <p className="mx-4 mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 sm:mx-6">
          {error}
        </p>
      ) : null}

      <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 px-4 py-4 sm:px-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
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

        {isBusiness && !isReadOnly ? (
          <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-bold text-slate-900">Workspace management</p>
              <p className="text-xs leading-5 text-slate-600">
                Archive or restore the business without changing the user&apos;s supporter account.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              {isArchived || isRestoreRequested ? (
                <button
                  type="button"
                  onClick={() => updateBusinessLifecycle('restore')}
                  disabled={isUpdating}
                  className="inline-flex min-h-10 items-center justify-center rounded-lg bg-green-700 px-3 py-2 text-sm font-bold text-white transition hover:bg-green-800 disabled:opacity-60"
                >
                  {isUpdating ? 'Updating…' : 'Restore Workspace'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => updateBusinessLifecycle('archive')}
                  disabled={isUpdating}
                  className="inline-flex min-h-10 items-center justify-center rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm font-bold text-red-800 transition hover:bg-red-100 disabled:opacity-60"
                >
                  {isUpdating ? 'Updating…' : 'Archive Workspace'}
                </button>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  )
}

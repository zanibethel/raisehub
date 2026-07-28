'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import OwnerWorkspaceEditPanel from '@/components/platform/owner-workspace-edit-panel'
import type { WorkspaceCardData, WorkspaceRole } from '@/lib/types/identity-access'

export type WorkspaceSupportMode = 'workspace' | 'read-only'

type Props = { workspace: WorkspaceCardData; mode: WorkspaceSupportMode }

function getRoleLabel(role: WorkspaceRole) {
  if (role === 'business') return 'Business'
  if (role === 'organization') return 'Organization'
  return 'Customer'
}

function getModeLabel(mode: WorkspaceSupportMode) {
  return mode === 'read-only' ? 'Read-only support' : 'Workspace preview'
}

function getStatusLabel(status?: string | null) {
  if (status === 'restore_requested' || status === 'Restore requested') return 'Restore requested'
  if (status === 'archived' || status === 'Archived') return 'Archived'
  if (status === 'suspended' || status === 'Suspended') return 'Suspended'
  if (status === 'inactive' || status === 'Inactive') return 'Inactive'
  return 'Active'
}

function isLifecycleStatus(status: string | null | undefined, value: string) {
  return status?.trim().toLowerCase().replace(' ', '_') === value
}

export default function SelectedWorkspacePanel({ workspace, mode }: Props) {
  const router = useRouter()
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isReadOnly = mode === 'read-only'
  const isBusiness = workspace.role === 'business'
  const isArchived = isLifecycleStatus(workspace.status, 'archived')
  const isRestoreRequested = isLifecycleStatus(workspace.status, 'restore_requested')

  async function updateBusinessLifecycle(action: 'archive' | 'restore') {
    let reason: string | undefined

    if (action === 'archive') {
      const enteredReason = window.prompt('Why is this business being archived?')
      if (enteredReason === null) return
      reason = enteredReason.trim() || 'Archived by RaiseHub Owner'
      if (!window.confirm('Archive this business workspace? The supporter account will remain active.')) return
    } else if (!window.confirm('Restore this business workspace to production visibility?')) {
      return
    }

    setIsUpdating(true)
    setError(null)

    try {
      const response = await fetch('/api/owner/business-lifecycle', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId: workspace.id, action, reason }),
      })
      const data = (await response.json().catch(() => ({}))) as { error?: string }
      if (!response.ok) throw new Error(data.error || 'Could not update this workspace.')
      router.refresh()
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Could not update this workspace.')
    } finally {
      setIsUpdating(false)
    }
  }

  const supportUrl = `/dashboard/owner/support?workspaceId=${workspace.id}&workspaceRole=${workspace.role}&supportMode=read-only`

  return (
    <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-4 sm:px-6">
        <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Selected workspace</p>
            <h2 className="mt-1 break-words text-xl font-bold text-slate-950">{workspace.name}</h2>
            <p className="mt-1 text-sm text-slate-600">
              {getRoleLabel(workspace.role)}{workspace.planLabel ? ` · ${workspace.planLabel}` : ''}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-bold text-slate-700">
              {getStatusLabel(workspace.status)}
            </span>
            <span className={`rounded-full border px-3 py-1 text-xs font-bold ${isReadOnly ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-blue-200 bg-blue-50 text-blue-700'}`}>
              {getModeLabel(mode)}
            </span>
          </div>
        </div>
      </div>

      <div className="grid min-w-0 gap-4 p-4 sm:p-6 md:grid-cols-3">
        <article className="rounded-xl border border-slate-200 p-4">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Account</p>
          <p className="mt-2 break-words text-sm font-semibold text-slate-900">{workspace.email ?? 'No email added'}</p>
          <p className="mt-1 break-words text-sm text-slate-600">{workspace.phone ?? 'No phone added'}</p>
        </article>
        <article className="rounded-xl border border-slate-200 p-4">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Setup</p>
          <p className="mt-2 text-lg font-bold text-slate-950">{workspace.setupPercentage ?? 0}%</p>
          <p className="mt-1 text-sm text-slate-600">{workspace.completedSetupItems ?? 0} of {workspace.totalSetupItems ?? 0} items complete</p>
        </article>
        <article className="rounded-xl border border-slate-200 p-4">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Production visibility</p>
          <p className="mt-2 text-sm font-semibold text-slate-900">{isArchived || isRestoreRequested ? 'Not currently live' : 'Live'}</p>
          <p className="mt-1 text-sm leading-5 text-slate-600">
            {isArchived || isRestoreRequested ? 'The supporter account remains active while this workspace is hidden.' : 'This workspace may appear in production discovery.'}
          </p>
        </article>
      </div>

      {isReadOnly ? <OwnerWorkspaceEditPanel workspace={workspace} /> : null}

      {error ? <p className="mx-4 mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 sm:mx-6">{error}</p> : null}

      <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 px-4 py-4 sm:px-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-600">Actor: Owner · Subject: {workspace.name}</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            {!isReadOnly ? (
              <Link href={supportUrl} className="inline-flex min-h-10 items-center justify-center rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900">
                Enter Support Mode
              </Link>
            ) : null}
            <Link href="/dashboard" className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">
              Close Workspace
            </Link>
          </div>
        </div>

        {isBusiness && !isReadOnly ? (
          <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-bold text-slate-900">Workspace management</p>
              <p className="text-xs leading-5 text-slate-600">Archive or restore the business without changing the supporter account.</p>
            </div>
            {isArchived || isRestoreRequested ? (
              <button type="button" onClick={() => updateBusinessLifecycle('restore')} disabled={isUpdating} className="rounded-lg bg-green-700 px-3 py-2 text-sm font-bold text-white disabled:opacity-60">
                {isUpdating ? 'Updating…' : 'Restore Workspace'}
              </button>
            ) : (
              <button type="button" onClick={() => updateBusinessLifecycle('archive')} disabled={isUpdating} className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm font-bold text-red-800 disabled:opacity-60">
                {isUpdating ? 'Updating…' : 'Archive Workspace'}
              </button>
            )}
          </div>
        ) : null}
      </div>
    </section>
  )
}

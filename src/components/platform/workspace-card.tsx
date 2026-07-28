import Link from 'next/link'
import type {
  WorkspaceCardData,
  WorkspaceRole,
} from '@/lib/types/identity-access'

export type {
  WorkspaceCardData,
  WorkspaceRole,
} from '@/lib/types/identity-access'

type WorkspaceCardProps = {
  workspace: WorkspaceCardData
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

function getRoleClasses(role: WorkspaceRole): string {
  switch (role) {
    case 'business':
      return 'border-green-200 bg-green-50 text-green-700'
    case 'organization':
      return 'border-blue-200 bg-blue-50 text-blue-700'
    case 'customer':
      return 'border-yellow-200 bg-yellow-50 text-yellow-700'
  }
}

function getStatusClasses(status?: string | null): string {
  const normalizedStatus = status?.trim().toLowerCase()

  if (normalizedStatus === 'ready') {
    return 'border-green-200 bg-green-50 text-green-700'
  }

  if (normalizedStatus === 'in progress') {
    return 'border-yellow-200 bg-yellow-50 text-yellow-800'
  }

  return 'border-red-200 bg-red-50 text-red-700'
}

function getPlanClasses(planLabel?: string | null): string {
  const normalizedPlan = planLabel?.trim().toLowerCase()

  if (!normalizedPlan || normalizedPlan.includes('free')) {
    return 'border-slate-200 bg-slate-100 text-slate-700'
  }

  return 'border-blue-200 bg-blue-50 text-blue-700'
}

function getPlanDisplayLabel(planLabel?: string | null): string {
  if (!planLabel) {
    return 'STANDARD'
  }

  return planLabel
    .replace(/\s+plan$/i, '')
    .trim()
    .toUpperCase()
}

function clampPercentage(value?: number | null): number | null {
  if (typeof value !== 'number') {
    return null
  }

  return Math.max(0, Math.min(100, Math.round(value)))
}

export default function WorkspaceCard({
  workspace,
}: WorkspaceCardProps) {
  const workspaceUrl = new URLSearchParams({
    workspaceId: workspace.id,
    workspaceRole: workspace.role,
  })
  const setupPercentage = clampPercentage(workspace.setupPercentage)
  const missingCount = workspace.missingSetupItems?.length ?? 0

  return (
    <article className="min-w-0 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm transition hover:border-blue-300 hover:shadow-md sm:p-4">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${getRoleClasses(
                workspace.role
              )}`}
            >
              {getRoleLabel(workspace.role)}
            </span>
            <span
              className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${getPlanClasses(
                workspace.planLabel
              )}`}
            >
              {getPlanDisplayLabel(workspace.planLabel)}
            </span>
            {workspace.status ? (
              <span
                className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${getStatusClasses(
                  workspace.status
                )}`}
              >
                {workspace.status}
              </span>
            ) : null}
          </div>

          <h3 className="mt-2 break-words text-base font-bold leading-snug text-slate-950">
            {workspace.name}
          </h3>
          {workspace.subtitle ? (
            <p className="mt-0.5 break-words text-xs text-slate-500">
              {workspace.subtitle}
            </p>
          ) : null}
        </div>

        {setupPercentage !== null ? (
          <div className="shrink-0 text-right">
            <p className="text-lg font-black text-slate-950">{setupPercentage}%</p>
            <p className="text-[10px] uppercase tracking-wide text-slate-500">setup</p>
          </div>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-slate-100 pt-2.5 text-xs text-slate-600">
        <span>
          <strong className="text-slate-900">
            {workspace.completedSetupItems ?? 0}/{workspace.totalSetupItems ?? 0}
          </strong>{' '}
          complete
        </span>
        {missingCount > 0 ? (
          <span className="font-semibold text-amber-700">
            {missingCount} missing
          </span>
        ) : (
          <span className="font-semibold text-green-700">Ready</span>
        )}
        {workspace.email ? (
          <span className="min-w-0 truncate">{workspace.email}</span>
        ) : null}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <Link
          href={`/dashboard/owner/support?${workspaceUrl.toString()}`}
          className="inline-flex min-h-9 items-center justify-center rounded-lg bg-blue-600 px-3 py-2 text-center text-xs font-semibold text-white transition hover:bg-blue-700"
        >
          Open account
        </Link>
        <Link
          href={`/dashboard/owner/support?${workspaceUrl.toString()}&supportMode=read-only`}
          className="inline-flex min-h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-center text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Support Mode
        </Link>
      </div>
    </article>
  )
}

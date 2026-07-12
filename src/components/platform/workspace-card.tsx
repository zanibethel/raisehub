import Link from 'next/link'

// =============================================================================
// Types
// =============================================================================

export type WorkspaceRole =
  | 'business'
  | 'organization'
  | 'customer'

export type WorkspaceCardData = {
  id: string
  name: string
  role: WorkspaceRole
  subtitle?: string | null
  status?: string | null

  planLabel?: string | null
  setupPercentage?: number | null
  completedSetupItems?: number | null
  totalSetupItems?: number | null
  missingSetupItems?: string[]

  email?: string | null
  phone?: string | null
}

// =============================================================================
// Props
// =============================================================================

type WorkspaceCardProps = {
  workspace: WorkspaceCardData
}

// =============================================================================
// Helpers
// =============================================================================

function getRoleLabel(role: WorkspaceRole) {
  switch (role) {
    case 'business':
      return 'Business'

    case 'organization':
      return 'Organization'

    case 'customer':
      return 'Customer'
  }
}

function getRoleClasses(role: WorkspaceRole) {
  switch (role) {
    case 'business':
      return 'border-green-200 bg-green-50 text-green-700'

    case 'organization':
      return 'border-blue-200 bg-blue-50 text-blue-700'

    case 'customer':
      return 'border-yellow-200 bg-yellow-50 text-yellow-700'
  }
}

function clampPercentage(value?: number | null) {
  if (typeof value !== 'number') {
    return null
  }

  return Math.max(0, Math.min(100, Math.round(value)))
}

// =============================================================================
// Component
// =============================================================================

export default function WorkspaceCard({
  workspace,
}: WorkspaceCardProps) {
  const workspaceUrl = new URLSearchParams({
    workspaceId: workspace.id,
    workspaceRole: workspace.role,
  })

  const setupPercentage = clampPercentage(
    workspace.setupPercentage
  )

  const hasContactInformation =
    Boolean(workspace.email) || Boolean(workspace.phone)

  return (
    <article className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-300 hover:shadow-md sm:p-5">
      {/* Header */}
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <span
            className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${getRoleClasses(
              workspace.role
            )}`}
          >
            {getRoleLabel(workspace.role)}
          </span>

          <h3 className="mt-3 break-words text-lg font-bold leading-snug text-slate-950">
            {workspace.name}
          </h3>
        </div>

        {workspace.status ? (
          <span className="max-w-full shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold capitalize text-slate-600">
            {workspace.status}
          </span>
        ) : null}
      </div>

      {/* Plan and setup summary */}
      <div className="mt-4 grid min-w-0 gap-3 sm:grid-cols-2">
        <div className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
            Plan
          </p>

          <p className="mt-1 break-words text-sm font-bold text-slate-900">
            {workspace.planLabel ??
              workspace.subtitle ??
              'Account plan unavailable'}
          </p>
        </div>

        <div className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
              Setup
            </p>

            {setupPercentage !== null ? (
              <span className="text-xs font-bold text-slate-700">
                {setupPercentage}%
              </span>
            ) : null}
          </div>

          {setupPercentage !== null ? (
            <>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-blue-600 transition-all"
                  style={{ width: `${setupPercentage}%` }}
                />
              </div>

              <p className="mt-2 text-xs leading-5 text-slate-600">
                {workspace.completedSetupItems ?? 0} of{' '}
                {workspace.totalSetupItems ?? 0} profile items complete
              </p>
            </>
          ) : (
            <p className="mt-1 text-sm font-semibold text-slate-700">
              {workspace.status ?? 'Progress unavailable'}
            </p>
          )}
        </div>
      </div>

      {/* Missing setup items */}
      {workspace.missingSetupItems?.length ? (
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-amber-800">
            Still needed
          </p>

          <p className="mt-1 break-words text-sm leading-5 text-amber-900">
            {workspace.missingSetupItems.join(', ')}
          </p>
        </div>
      ) : null}

      {/* Contact tile */}
      <div className="mt-3 min-w-0 rounded-xl border border-slate-200 bg-white p-3">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
          Contact
        </p>

        {hasContactInformation ? (
          <div className="mt-2 space-y-1.5">
            {workspace.email ? (
              <a
                href={`mailto:${workspace.email}`}
                className="block min-w-0 break-all text-sm font-semibold text-blue-700 hover:text-blue-800 hover:underline"
              >
                {workspace.email}
              </a>
            ) : null}

            {workspace.phone ? (
              <a
                href={`tel:${workspace.phone}`}
                className="block break-words text-sm font-semibold text-slate-800 hover:text-blue-700 hover:underline"
              >
                {workspace.phone}
              </a>
            ) : null}
          </div>
        ) : (
          <p className="mt-1 text-sm text-slate-500">
            No contact details added
          </p>
        )}
      </div>

      {/* Support actions */}
      <div className="mt-4 grid min-w-0 gap-2 sm:grid-cols-2">
        <Link
          href={`/dashboard?${workspaceUrl.toString()}`}
          className="inline-flex min-h-11 min-w-0 items-center justify-center rounded-xl bg-blue-600 px-3 py-2 text-center text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          Open Workspace
        </Link>

        <Link
          href={`/dashboard?${workspaceUrl.toString()}&supportMode=read-only`}
          className="inline-flex min-h-11 min-w-0 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-center text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Support Mode
        </Link>
      </div>
    </article>
  )
}
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

function getStatusDotClasses(status?: string | null): string {
  const normalizedStatus = status?.trim().toLowerCase()

  if (normalizedStatus === 'ready') {
    return 'bg-green-500'
  }

  if (normalizedStatus === 'in progress') {
    return 'bg-yellow-500'
  }

  return 'bg-red-500'
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

  const completedSetupItems =
    workspace.completedSetupItems ?? 0

  const totalSetupItems =
    workspace.totalSetupItems ?? 0

  const missingSetupItems =
    workspace.missingSetupItems ?? []

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

          {workspace.subtitle ? (
            <p className="mt-1 break-words text-sm text-slate-500">
              {workspace.subtitle}
            </p>
          ) : null}
        </div>

        <div className="flex max-w-full flex-wrap items-center justify-end gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${getPlanClasses(
              workspace.planLabel
            )}`}
          >
            {getPlanDisplayLabel(workspace.planLabel)}
          </span>

          {workspace.status ? (
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusClasses(
                workspace.status
              )}`}
            >
              <span
                className={`h-2 w-2 rounded-full ${getStatusDotClasses(
                  workspace.status
                )}`}
                aria-hidden="true"
              />

              {workspace.status}
            </span>
          ) : null}
        </div>
      </div>

      {/* Setup progress */}
      <section className="mt-5 min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex min-w-0 items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
              Setup progress
            </p>

            <p className="mt-1 text-sm font-semibold text-slate-800">
              {completedSetupItems} of {totalSetupItems} complete
            </p>
          </div>

          {setupPercentage !== null ? (
            <span className="shrink-0 text-lg font-bold text-slate-900">
              {setupPercentage}%
            </span>
          ) : null}
        </div>

        {setupPercentage !== null ? (
          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-blue-600 transition-all"
              style={{ width: `${setupPercentage}%` }}
            />
          </div>
        ) : null}
      </section>

      {/* Missing setup items */}
      {missingSetupItems.length > 0 ? (
        <section className="mt-3 min-w-0 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-amber-800">
            Missing setup items
          </p>

          <ul className="mt-2 space-y-1.5">
            {missingSetupItems.map((item) => (
              <li
                key={item}
                className="flex min-w-0 items-start gap-2 text-sm leading-5 text-amber-950"
              >
                <span
                  className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500"
                  aria-hidden="true"
                />

                <span className="min-w-0 break-words">
                  {item}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <section className="mt-3 rounded-xl border border-green-200 bg-green-50 p-4">
          <p className="text-sm font-semibold text-green-800">
            Profile setup is complete.
          </p>
        </section>
      )}

      {/* Contact */}
      <section className="mt-3 min-w-0 rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
          Contact
        </p>

        {hasContactInformation ? (
          <div className="mt-2 space-y-2">
            {workspace.email ? (
              <div className="flex min-w-0 items-start gap-2">
                <span
                  className="shrink-0 text-sm"
                  aria-hidden="true"
                >
                  ✉
                </span>

                <a
                  href={`mailto:${workspace.email}`}
                  className="min-w-0 break-all text-sm font-semibold text-blue-700 hover:text-blue-800 hover:underline"
                >
                  {workspace.email}
                </a>
              </div>
            ) : null}

            {workspace.phone ? (
              <div className="flex min-w-0 items-start gap-2">
                <span
                  className="shrink-0 text-sm"
                  aria-hidden="true"
                >
                  ☎
                </span>

                <a
                  href={`tel:${workspace.phone}`}
                  className="min-w-0 break-words text-sm font-semibold text-slate-800 hover:text-blue-700 hover:underline"
                >
                  {workspace.phone}
                </a>
              </div>
            ) : null}
          </div>
        ) : (
          <p className="mt-1 text-sm text-slate-500">
            No contact details added.
          </p>
        )}
      </section>

      {/* Actions */}
      <div className="mt-4 flex min-w-0 flex-col gap-2 sm:flex-row">
        <Link
          href={`/dashboard?${workspaceUrl.toString()}`}
          className="inline-flex min-h-10 min-w-0 flex-1 items-center justify-center rounded-lg bg-blue-600 px-3 py-2 text-center text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          Open Workspace
        </Link>

        <Link
          href={`/dashboard?${workspaceUrl.toString()}&supportMode=read-only`}
          className="inline-flex min-h-10 min-w-0 flex-1 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-center text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Support Mode
        </Link>
      </div>
    </article>
  )
}
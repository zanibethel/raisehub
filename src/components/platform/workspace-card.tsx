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
}

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

  return (
    <article className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-300 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span
            className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${getRoleClasses(
              workspace.role
            )}`}
          >
            {getRoleLabel(workspace.role)}
          </span>

          <h3 className="mt-3 text-lg font-bold text-slate-900">
            {workspace.name}
          </h3>
        </div>

        {workspace.status ? (
          <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold capitalize text-slate-600">
            {workspace.status}
          </span>
        ) : null}
      </div>

      <p className="mt-3 flex-1 text-sm leading-6 text-slate-600">
        {workspace.subtitle ||
          `Open this ${getRoleLabel(
            workspace.role
          ).toLowerCase()} workspace.`}
      </p>

      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        <Link
          href={`/dashboard?${workspaceUrl.toString()}`}
          className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          Open Workspace
        </Link>

        <Link
          href={`/dashboard?${workspaceUrl.toString()}&supportMode=read-only`}
          className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          View Support Mode
        </Link>
      </div>
    </article>
  )
}
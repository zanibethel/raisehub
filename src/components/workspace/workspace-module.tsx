'use client'

import type { ReactNode } from 'react'

export type WorkspaceModuleTone = 'blue' | 'green' | 'amber' | 'rose' | 'slate'

export type WorkspaceModuleProps = {
  id?: string
  title: string
  eyebrow?: string
  description?: string
  icon?: ReactNode
  badge?: ReactNode
  action?: ReactNode
  children?: ReactNode
  emptyState?: ReactNode
  loading?: boolean
  collapsible?: boolean
  defaultCollapsed?: boolean
  tone?: WorkspaceModuleTone
}

const TONE_CLASSES: Record<WorkspaceModuleTone, {
  eyebrow: string
  icon: string
  border: string
}> = {
  blue: {
    eyebrow: 'text-blue-700',
    icon: 'bg-blue-50 text-blue-700',
    border: 'border-blue-100',
  },
  green: {
    eyebrow: 'text-green-700',
    icon: 'bg-green-50 text-green-700',
    border: 'border-green-100',
  },
  amber: {
    eyebrow: 'text-amber-700',
    icon: 'bg-amber-50 text-amber-700',
    border: 'border-amber-100',
  },
  rose: {
    eyebrow: 'text-rose-700',
    icon: 'bg-rose-50 text-rose-700',
    border: 'border-rose-100',
  },
  slate: {
    eyebrow: 'text-slate-600',
    icon: 'bg-slate-100 text-slate-700',
    border: 'border-slate-200',
  },
}

function ModuleSkeleton() {
  return (
    <div className="space-y-3" aria-label="Loading module content">
      <div className="h-4 w-3/4 animate-pulse rounded bg-slate-200" />
      <div className="h-4 w-full animate-pulse rounded bg-slate-100" />
      <div className="h-4 w-2/3 animate-pulse rounded bg-slate-100" />
    </div>
  )
}

export function WorkspaceModule({
  id,
  title,
  eyebrow,
  description,
  icon,
  badge,
  action,
  children,
  emptyState,
  loading = false,
  collapsible = false,
  defaultCollapsed = false,
  tone = 'slate',
}: WorkspaceModuleProps) {
  const classes = TONE_CLASSES[tone]
  const hasContent = Boolean(children)

  const header = (
    <div className="flex min-w-0 flex-1 items-start gap-3">
      {icon ? (
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${classes.icon}`} aria-hidden="true">
          {icon}
        </span>
      ) : null}

      <div className="min-w-0 flex-1">
        {eyebrow ? (
          <p className={`text-[11px] font-black uppercase tracking-[0.16em] ${classes.eyebrow}`}>
            {eyebrow}
          </p>
        ) : null}
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-black tracking-tight text-slate-950">{title}</h2>
          {badge}
        </div>
        {description ? (
          <p className="mt-1 text-sm leading-5 text-slate-600">{description}</p>
        ) : null}
      </div>
    </div>
  )

  if (collapsible) {
    return (
      <details
        id={id}
        open={!defaultCollapsed}
        className={`group rounded-3xl border ${classes.border} bg-white shadow-[0_10px_28px_rgba(15,23,42,0.08)]`}
      >
        <summary className="flex cursor-pointer list-none items-start gap-3 p-4 sm:p-5">
          {header}
          <div className="flex shrink-0 items-center gap-2">
            {action}
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-lg text-slate-600 transition group-open:rotate-180" aria-hidden="true">
             ⌄
            </span>
          </div>
        </summary>
        <div className="border-t border-slate-100 p-4 sm:p-5">
          {loading ? <ModuleSkeleton /> : hasContent ? children : emptyState}
        </div>
      </details>
    )
  }

  return (
    <section
      id={id}
      className={`rounded-3xl border ${classes.border} bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.08)] sm:p-5`}
    >
      <div className="flex items-start justify-between gap-3">
        {header}
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>

      <div className="mt-4">
        {loading ? <ModuleSkeleton /> : hasContent ? children : emptyState}
      </div>
    </section>
  )
}

export function WorkspaceModuleEmpty({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center">
      <p className="text-sm font-black text-slate-900">{title}</p>
      {description ? <p className="mx-auto mt-1 max-w-md text-sm text-slate-600">{description}</p> : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  )
}

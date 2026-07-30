'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'

export type WorkspaceTone = 'blue' | 'green' | 'amber' | 'slate'

export type WorkspaceBottomNavItem = {
  href: string
  label: string
  icon: ReactNode
  active?: boolean
}

type WorkspaceShellProps = {
  children: ReactNode
  bottomNavigation?: WorkspaceBottomNavItem[]
}

type WorkspaceHeroProps = {
  eyebrow: string
  title: string
  subtitle?: string | null
  detail?: string | null
  image?: ReactNode
  selector?: ReactNode
  action?: ReactNode
  tone?: WorkspaceTone
}

type WorkspaceMetric = {
  label: string
  value: ReactNode
  description?: string
  tone?: WorkspaceTone
}

type WorkspaceMetricStripProps = {
  title: string
  rangeLabel?: string
  metrics: WorkspaceMetric[]
  action?: ReactNode
}

type WorkspaceAction = {
  id: string
  title: string
  description: string
  href: string
  label?: string
  tone?: WorkspaceTone
}

type WorkspaceRecommendedActionsProps = {
  actions: WorkspaceAction[]
  title?: string
  eyebrow?: string
}

const TONE_CLASSES: Record<WorkspaceTone, {
  border: string
  background: string
  text: string
  soft: string
}> = {
  blue: {
    border: 'border-blue-200',
    background: 'bg-blue-600',
    text: 'text-blue-700',
    soft: 'bg-blue-50',
  },
  green: {
    border: 'border-green-200',
    background: 'bg-green-600',
    text: 'text-green-700',
    soft: 'bg-green-50',
  },
  amber: {
    border: 'border-amber-200',
    background: 'bg-amber-500',
    text: 'text-amber-700',
    soft: 'bg-amber-50',
  },
  slate: {
    border: 'border-slate-200',
    background: 'bg-slate-700',
    text: 'text-slate-700',
    soft: 'bg-slate-50',
  },
}

export function WorkspaceShell({
  children,
  bottomNavigation = [],
}: WorkspaceShellProps) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-slate-50 to-white pb-24 sm:pb-10">
      <div className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 sm:py-8">
        <div className="space-y-6 sm:space-y-8">{children}</div>
      </div>

      {bottomNavigation.length > 0 ? (
        <nav
          aria-label="Workspace navigation"
          className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-12px_30px_rgba(15,23,42,0.10)] backdrop-blur sm:hidden"
        >
          <div className="mx-auto grid max-w-xl grid-flow-col auto-cols-fr">
            {bottomNavigation.map((item) => (
              <Link
                key={`${item.href}-${item.label}`}
                href={item.href}
                aria-current={item.active ? 'page' : undefined}
                className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[11px] font-semibold transition ${
                  item.active
                    ? 'bg-green-50 text-green-700'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                }`}
              >
                <span className="flex h-5 w-5 items-center justify-center" aria-hidden="true">
                  {item.icon}
                </span>
                <span className="truncate">{item.label}</span>
              </Link>
            ))}
          </div>
        </nav>
      ) : null}
    </div>
  )
}

export function WorkspaceHero({
  eyebrow,
  title,
  subtitle,
  detail,
  image,
  selector,
  action,
  tone = 'green',
}: WorkspaceHeroProps) {
  const classes = TONE_CLASSES[tone]

  return (
    <section
      className={`overflow-hidden rounded-[2rem] border ${classes.border} bg-white/95 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.10)] sm:p-7`}
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <span
          className={`inline-flex rounded-full border ${classes.border} ${classes.soft} px-4 py-2 text-sm font-bold ${classes.text}`}
        >
          {eyebrow}
        </span>
        {selector}
      </div>

      <div className="mt-6 grid gap-5 sm:grid-cols-[auto_1fr_auto] sm:items-center">
        {image ? <div className="shrink-0">{image}</div> : null}

        <div className="min-w-0">
          <h1 className={`text-3xl font-black tracking-tight ${classes.text} sm:text-4xl`}>
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-3 text-lg font-semibold text-slate-700">{subtitle}</p>
          ) : null}
          {detail ? (
            <p className="mt-2 max-w-2xl text-base leading-7 text-slate-500">{detail}</p>
          ) : null}
        </div>

        {action ? <div className="sm:justify-self-end">{action}</div> : null}
      </div>
    </section>
  )
}

export function WorkspaceMetricStrip({
  title,
  rangeLabel,
  metrics,
  action,
}: WorkspaceMetricStripProps) {
  return (
    <section className="rounded-[1.75rem] border border-slate-200 bg-white/95 p-5 shadow-[0_12px_30px_rgba(15,23,42,0.08)] sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-black text-slate-900">
          {title}
          {rangeLabel ? (
            <span className="ml-2 font-medium text-slate-500">({rangeLabel})</span>
          ) : null}
        </h2>
        {action}
      </div>

      <div className="mt-5 grid gap-0 divide-y divide-slate-200 sm:grid-flow-col sm:auto-cols-fr sm:divide-x sm:divide-y-0">
        {metrics.map((metric) => {
          const tone = TONE_CLASSES[metric.tone ?? 'slate']

          return (
            <div key={metric.label} className="px-3 py-4 text-center first:pl-0 last:pr-0 sm:py-2">
              <p className={`text-sm font-bold ${tone.text}`}>{metric.label}</p>
              <div className="mt-1 text-3xl font-black text-slate-950">{metric.value}</div>
              {metric.description ? (
                <p className="mt-1 text-xs text-slate-500">{metric.description}</p>
              ) : null}
            </div>
          )
        })}
      </div>
    </section>
  )
}

export function WorkspaceRecommendedActions({
  actions,
  title = 'Recommended actions',
  eyebrow = 'Needs your attention',
}: WorkspaceRecommendedActionsProps) {
  if (actions.length === 0) return null

  return (
    <section className="rounded-[1.75rem] border border-slate-200 bg-white/95 p-5 shadow-[0_12px_30px_rgba(15,23,42,0.08)] sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-rose-700">
            {eyebrow}
          </p>
          <h2 className="mt-2 text-2xl font-black text-slate-950">{title}</h2>
        </div>
        <span className="rounded-full bg-rose-100 px-3 py-1 text-sm font-black text-rose-700">
          {actions.length} {actions.length === 1 ? 'item' : 'items'}
        </span>
      </div>

      <div className="mt-5 space-y-3">
        {actions.map((action) => {
          const tone = TONE_CLASSES[action.tone ?? 'blue']

          return (
            <Link
              key={action.id}
              href={action.href}
              className={`group flex items-center gap-4 rounded-2xl border ${tone.border} ${tone.soft} p-4 transition hover:-translate-y-0.5 hover:shadow-md`}
            >
              <span
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${tone.background} text-sm font-black text-white`}
                aria-hidden="true"
              >
                →
              </span>
              <span className="min-w-0 flex-1">
                {action.label ? (
                  <span className={`text-xs font-black uppercase tracking-wide ${tone.text}`}>
                    {action.label}
                  </span>
                ) : null}
                <span className="mt-1 block text-base font-black text-slate-950">
                  {action.title}
                </span>
                <span className="mt-1 block text-sm leading-5 text-slate-600">
                  {action.description}
                </span>
              </span>
              <span className="text-2xl text-slate-400 transition group-hover:translate-x-1" aria-hidden="true">
                ›
              </span>
            </Link>
          )
        })}
      </div>
    </section>
  )
}

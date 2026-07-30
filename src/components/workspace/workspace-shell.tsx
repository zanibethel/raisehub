'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'

export type WorkspaceTone = 'blue' | 'green' | 'amber' | 'slate'

export type WorkspaceBottomNavItem = {
  href?: string
  label: string
  icon: ReactNode
  active?: boolean
  action?: 'open-workspace-menu'
}

export type WorkspaceIdentity = {
  eyebrow: string
  title: string
  subtitle?: string | null
  detail?: string | null
  image?: ReactNode
  action?: ReactNode
  tone?: WorkspaceTone
}

type WorkspaceShellProps = {
  children: ReactNode
  bottomNavigation?: WorkspaceBottomNavItem[]
  identity?: WorkspaceIdentity
  topBar?: ReactNode
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
  blue: { border: 'border-blue-200', background: 'bg-blue-600', text: 'text-blue-700', soft: 'bg-blue-50' },
  green: { border: 'border-green-200', background: 'bg-green-600', text: 'text-green-700', soft: 'bg-green-50' },
  amber: { border: 'border-amber-200', background: 'bg-amber-500', text: 'text-amber-700', soft: 'bg-amber-50' },
  slate: { border: 'border-slate-200', background: 'bg-slate-700', text: 'text-slate-700', soft: 'bg-slate-50' },
}

function openWorkspaceMenu() {
  window.dispatchEvent(new Event('raisehub:open-workspace-menu'))
}

export function WorkspaceShell({ children, bottomNavigation = [], identity, topBar }: WorkspaceShellProps) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-slate-50 to-white pb-24 sm:pb-10">
      {topBar ? (
        <div className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">{topBar}</div>
        </div>
      ) : null}

      <main className="mx-auto w-full max-w-6xl px-4 py-4 sm:px-6 sm:py-7">
        <div className="space-y-4 sm:space-y-6">
          {identity ? <WorkspaceIdentityCard {...identity} /> : null}
          {children}
        </div>
      </main>

      {bottomNavigation.length > 0 ? (
        <nav aria-label="Workspace navigation" className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_24px_rgba(15,23,42,0.09)] backdrop-blur sm:hidden">
          <div className="mx-auto grid max-w-xl grid-flow-col auto-cols-fr">
            {bottomNavigation.map((item) => {
              const classes = `flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[11px] font-semibold transition ${item.active ? 'bg-green-50 text-green-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'}`
              const content = (
                <>
                  <span className="flex h-5 w-5 items-center justify-center" aria-hidden="true">{item.icon}</span>
                  <span className="truncate">{item.label}</span>
                </>
              )

              return item.action === 'open-workspace-menu' ? (
                <button key={item.label} type="button" onClick={openWorkspaceMenu} className={classes}>{content}</button>
              ) : (
                <Link key={`${item.href}-${item.label}`} href={item.href ?? '/dashboard'} aria-current={item.active ? 'page' : undefined} className={classes}>{content}</Link>
              )
            })}
          </div>
        </nav>
      ) : null}
    </div>
  )
}

export function WorkspaceIdentityCard({ eyebrow, title, subtitle, detail, image, action, tone = 'green' }: WorkspaceIdentity) {
  const classes = TONE_CLASSES[tone]

  return (
    <section className={`rounded-3xl border ${classes.border} bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.08)]`}>
      <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
        {image ? <div className="shrink-0">{image}</div> : null}

        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <span className={`inline-flex rounded-full border ${classes.border} ${classes.soft} px-2.5 py-1 text-[11px] font-bold ${classes.text}`}>{eyebrow}</span>
            {action ? <div className="ml-auto shrink-0">{action}</div> : null}
          </div>
          <h1 className={`mt-2 truncate text-lg font-black tracking-tight ${classes.text} sm:text-xl`}>{title}</h1>
          {subtitle ? <p className="mt-0.5 text-sm font-semibold text-slate-700">{subtitle}</p> : null}
          {detail ? <p className="mt-0.5 line-clamp-2 text-sm leading-5 text-slate-500">{detail}</p> : null}
        </div>
      </div>
    </section>
  )
}

/** @deprecated Use WorkspaceIdentityCard through WorkspaceShell identity instead. */
export const WorkspaceHero = WorkspaceIdentityCard

export function WorkspaceMetricStrip({ title, rangeLabel, metrics, action }: WorkspaceMetricStripProps) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.08)] sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="min-w-0 text-base font-black text-slate-900 sm:text-lg">
          {title}{rangeLabel ? <span className="ml-2 font-medium text-slate-500">({rangeLabel})</span> : null}
        </h2>
        <div className="shrink-0">{action}</div>
      </div>

      <div className="mt-4 grid grid-cols-3 divide-x divide-slate-200">
        {metrics.slice(0, 3).map((metric) => {
          const tone = TONE_CLASSES[metric.tone ?? 'slate']
          return (
            <div key={metric.label} className="min-w-0 px-2 text-center first:pl-0 last:pr-0 sm:px-4">
              <p className={`truncate text-xs font-bold sm:text-sm ${tone.text}`}>{metric.label}</p>
              <div className="mt-1 truncate text-2xl font-black text-slate-950 sm:text-3xl">{metric.value}</div>
              {metric.description ? <p className="mt-1 hidden text-xs text-slate-500 sm:block">{metric.description}</p> : null}
            </div>
          )
        })}
      </div>
    </section>
  )
}

export function WorkspaceRecommendedActions({ actions, title = 'Recommended actions', eyebrow = 'Needs your attention' }: WorkspaceRecommendedActionsProps) {
  if (actions.length === 0) return null

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.08)] sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-rose-700">{eyebrow}</p>
          <h2 className="mt-1 text-lg font-black leading-tight text-slate-950 sm:text-xl">{title}</h2>
        </div>
        <span className="shrink-0 rounded-full bg-rose-100 px-3 py-1 text-xs font-black text-rose-700">{actions.length} {actions.length === 1 ? 'item' : 'items'}</span>
      </div>

      <div className="mt-3 divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200">
        {actions.map((action) => {
          const tone = TONE_CLASSES[action.tone ?? 'blue']
          return (
            <Link key={action.id} href={action.href} className="group flex items-center gap-3 bg-white px-3 py-3 transition hover:bg-slate-50 sm:px-4">
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${tone.background} text-sm font-black text-white`} aria-hidden="true">→</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-black text-slate-950">{action.title}</span>
                <span className="mt-0.5 block line-clamp-2 text-xs leading-5 text-slate-600 sm:text-sm">{action.description}</span>
              </span>
              <span className="text-xl text-slate-400 transition group-hover:translate-x-0.5" aria-hidden="true">›</span>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
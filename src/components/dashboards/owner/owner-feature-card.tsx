import Link from 'next/link'
import type { ReactNode } from 'react'

// =============================================================================
// Types
// =============================================================================

export type OwnerFeatureCardTone =
  | 'slate'
  | 'blue'
  | 'green'
  | 'amber'
  | 'rose'

export type OwnerFeatureCardMetric = {
  label: string
  value: string
}

export type OwnerFeatureCardStatus = {
  label: string
  tone?: OwnerFeatureCardTone
}

type OwnerFeatureCardProps = {
  eyebrow?: string
  title: string
  description: string
  href: string
  actionLabel?: string
  metrics?: OwnerFeatureCardMetric[]
  status?: OwnerFeatureCardStatus
  footer?: ReactNode
  children?: ReactNode
}

// =============================================================================
// Styles
// =============================================================================

const STATUS_STYLES: Record<
  OwnerFeatureCardTone,
  string
> = {
  slate: 'bg-slate-100 text-slate-700',
  blue: 'bg-blue-100 text-blue-700',
  green: 'bg-emerald-100 text-emerald-700',
  amber: 'bg-amber-100 text-amber-800',
  rose: 'bg-rose-100 text-rose-700',
}

// =============================================================================
// Component
// =============================================================================

export default function OwnerFeatureCard({
  eyebrow,
  title,
  description,
  href,
  actionLabel = 'Open',
  metrics = [],
  status,
  footer,
  children,
}: OwnerFeatureCardProps) {
  return (
    <article className="group flex h-full min-w-0 flex-col rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-lg sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          {eyebrow ? (
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">
              {eyebrow}
            </p>
          ) : null}

          <h2 className="mt-2 text-xl font-bold text-slate-950">
            {title}
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            {description}
          </p>
        </div>

        {status ? (
          <span
            className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${
              STATUS_STYLES[status.tone ?? 'slate']
            }`}
          >
            {status.label}
          </span>
        ) : null}
      </div>

      {metrics.length > 0 ? (
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {metrics.map((metric) => (
            <div
              key={`${metric.label}-${metric.value}`}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-3"
            >
              <p className="text-xs font-semibold text-slate-500">
                {metric.label}
              </p>
              <p className="mt-1 text-lg font-bold text-slate-950">
                {metric.value}
              </p>
            </div>
          ))}
        </div>
      ) : null}

      {children ? (
        <div className="mt-5">{children}</div>
      ) : null}

      <div className="mt-auto pt-5">
        {footer ? (
          <div className="mb-4 text-xs leading-5 text-slate-500">
            {footer}
          </div>
        ) : null}

        <Link
          href={href}
          className="flex items-center justify-between gap-3 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-bold text-white transition group-hover:bg-blue-700"
        >
          <span>{actionLabel}</span>
          <span
            aria-hidden="true"
            className="transition group-hover:translate-x-0.5"
          >
            →
          </span>
        </Link>
      </div>
    </article>
  )
}

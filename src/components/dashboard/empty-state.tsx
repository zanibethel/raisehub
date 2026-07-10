import Link from 'next/link'
import type { ReactNode } from 'react'

type EmptyStateProps = {
  title: string
  description: string
  icon?: ReactNode
  actionLabel?: string
  actionHref?: string
}

export default function EmptyState({
  title,
  description,
  icon,
  actionLabel,
  actionHref,
}: EmptyStateProps) {
  return (
    <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-6 py-10 text-center">
      {icon ? (
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm">
          {icon}
        </div>
      ) : null}

      <h3 className="mt-4 text-lg font-bold text-gray-900">{title}</h3>

      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-gray-600">
        {description}
      </p>

      {actionLabel && actionHref ? (
        <Link
          href={actionHref}
          className="mt-5 inline-flex rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
        >
          {actionLabel}
        </Link>
      ) : null}
    </div>
  )
}

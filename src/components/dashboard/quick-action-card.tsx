import Link from 'next/link'
import type { ReactNode } from 'react'

type QuickActionCardProps = {
  title: string
  description: string
  href: string
  label: string
  icon?: ReactNode
  tone?: 'blue' | 'green' | 'yellow'
}

const toneClasses = {
  blue: {
    card: 'border-blue-100 bg-blue-50',
    button: 'bg-blue-600 hover:bg-blue-700',
  },
  green: {
    card: 'border-green-100 bg-green-50',
    button: 'bg-green-600 hover:bg-green-700',
  },
  yellow: {
    card: 'border-yellow-200 bg-yellow-50',
    button: 'bg-yellow-500 hover:bg-yellow-600',
  },
}

export default function QuickActionCard({
  title,
  description,
  href,
  label,
  icon,
  tone = 'blue',
}: QuickActionCardProps) {
  const classes = toneClasses[tone]

  return (
    <article className={`rounded-2xl border p-5 ${classes.card}`}>
      <div className="flex items-start gap-3">
        {icon ? (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm">
            {icon}
          </div>
        ) : null}

        <div>
          <h3 className="font-bold text-gray-900">{title}</h3>

          <p className="mt-2 text-sm leading-6 text-gray-600">
            {description}
          </p>
        </div>
      </div>

      <Link
        href={href}
        className={`mt-5 inline-flex rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition ${classes.button}`}
      >
        {label}
      </Link>
    </article>
  )
}

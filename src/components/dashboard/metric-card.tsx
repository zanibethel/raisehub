import type { ReactNode } from 'react'

type MetricCardProps = {
  label: string
  value: string | number
  description?: string
  icon?: ReactNode
  trend?: string
  tone?: 'blue' | 'green' | 'yellow' | 'slate'
}

const toneClasses = {
  blue: {
    card: 'border-blue-100 bg-blue-50',
    icon: 'bg-blue-100 text-blue-700',
    value: 'text-blue-800',
  },
  green: {
    card: 'border-green-100 bg-green-50',
    icon: 'bg-green-100 text-green-700',
    value: 'text-green-800',
  },
  yellow: {
    card: 'border-yellow-100 bg-yellow-50',
    icon: 'bg-yellow-100 text-yellow-700',
    value: 'text-yellow-800',
  },
  slate: {
    card: 'border-slate-200 bg-white',
    icon: 'bg-slate-100 text-slate-700',
    value: 'text-slate-900',
  },
}

export default function MetricCard({
  label,
  value,
  description,
  icon,
  trend,
  tone = 'slate',
}: MetricCardProps) {
  const classes = toneClasses[tone]

  return (
    <article className={`rounded-2xl border p-5 shadow-sm ${classes.card}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-gray-600">{label}</p>

          <p className={`mt-2 text-3xl font-bold ${classes.value}`}>
            {value}
          </p>
        </div>

        {icon ? (
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-xl ${classes.icon}`}
          >
            {icon}
          </div>
        ) : null}
      </div>

      {description ? (
        <p className="mt-3 text-sm leading-6 text-gray-600">
          {description}
        </p>
      ) : null}

      {trend ? (
        <p className="mt-3 text-xs font-semibold text-green-700">
          {trend}
        </p>
      ) : null}
    </article>
  )
}

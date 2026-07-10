import type { ReactNode } from 'react'

type InsightCardProps = {
  title: string
  description: string
  recommendation?: string
  icon?: ReactNode
  tone?: 'blue' | 'green' | 'yellow'
}

const toneClasses = {
  blue: 'border-blue-100 bg-blue-50',
  green: 'border-green-100 bg-green-50',
  yellow: 'border-yellow-200 bg-yellow-50',
}

export default function InsightCard({
  title,
  description,
  recommendation,
  icon,
  tone = 'blue',
}: InsightCardProps) {
  return (
    <article className={`rounded-2xl border p-5 ${toneClasses[tone]}`}>
      <div className="flex items-start gap-3">
        {icon ? (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm">
            {icon}
          </div>
        ) : null}

        <div>
          <h3 className="font-bold text-gray-900">{title}</h3>

          <p className="mt-2 text-sm leading-6 text-gray-700">
            {description}
          </p>
        </div>
      </div>

      {recommendation ? (
        <div className="mt-4 rounded-xl bg-white/75 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
            Recommended action
          </p>

          <p className="mt-2 text-sm font-semibold leading-6 text-gray-800">
            {recommendation}
          </p>
        </div>
      ) : null}
    </article>
  )
}

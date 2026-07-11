import type { OfferHealth } from '@/lib/rules/offer-health'

// =============================================================================
// Types
// =============================================================================

type OfferHealthCardProps = {
  health: OfferHealth
  compact?: boolean
}

// =============================================================================
// Styles
// =============================================================================

const healthStyles: Record<
  OfferHealth['tone'],
  {
    container: string
    badge: string
    score: string
    issue: string
  }
> = {
  green: {
    container: 'border-green-200 bg-green-50',
    badge: 'bg-green-100 text-green-800',
    score: 'text-green-800',
    issue: 'border-green-200 bg-white text-green-900',
  },
  blue: {
    container: 'border-blue-200 bg-blue-50',
    badge: 'bg-blue-100 text-blue-800',
    score: 'text-blue-800',
    issue: 'border-blue-200 bg-white text-blue-900',
  },
  yellow: {
    container: 'border-yellow-200 bg-yellow-50',
    badge: 'bg-yellow-100 text-yellow-900',
    score: 'text-yellow-900',
    issue: 'border-yellow-200 bg-white text-yellow-950',
  },
  red: {
    container: 'border-red-200 bg-red-50',
    badge: 'bg-red-100 text-red-800',
    score: 'text-red-800',
    issue: 'border-red-200 bg-white text-red-900',
  },
}

// =============================================================================
// Component
// =============================================================================

export default function OfferHealthCard({
  health,
  compact = false,
}: OfferHealthCardProps) {
  const styles = healthStyles[health.tone]

  return (
    <section
      className={`rounded-2xl border ${styles.container} ${
        compact ? 'p-4' : 'p-5'
      }`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-gray-600">
            Offer health
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${styles.badge}`}
            >
              {health.label}
            </span>

            <span className={`text-lg font-bold ${styles.score}`}>
              {health.score}/100
            </span>
          </div>
        </div>

        <div
          className="h-2 w-full overflow-hidden rounded-full bg-white sm:mt-2 sm:w-32"
          aria-label={`Offer health score: ${health.score} out of 100`}
        >
          <div
            className="h-full rounded-full bg-current"
            style={{ width: `${health.score}%` }}
          />
        </div>
      </div>

      {!compact ? (
        <p className="mt-3 text-sm leading-6 text-gray-700">
          {health.summary}
        </p>
      ) : null}

      {health.issues.length > 0 ? (
        <div className="mt-4">
          <p className="text-xs font-bold uppercase tracking-wide text-gray-600">
            What needs attention
          </p>

          <div className="mt-2 space-y-2">
            {health.issues.map((issue) => (
              <div
                key={issue.id}
                className={`rounded-xl border p-3 text-sm ${styles.issue}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="leading-5">{issue.message}</p>

                  <span className="shrink-0 text-xs font-bold">
                    -{issue.deduction}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="mt-4 text-sm font-semibold text-gray-700">
          No health issues were detected.
        </p>
      )}

      {!compact && health.recommendations.length > 0 ? (
        <div className="mt-4 rounded-xl border border-white/80 bg-white/70 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-gray-600">
            Recommended next steps
          </p>

          <ul className="mt-2 space-y-2">
            {health.recommendations.map((recommendation) => (
              <li
                key={recommendation}
                className="flex gap-2 text-sm leading-5 text-gray-700"
              >
                <span aria-hidden="true">•</span>
                <span>{recommendation}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  )
}
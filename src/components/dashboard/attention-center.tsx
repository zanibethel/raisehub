import Link from 'next/link'
import type {
  DashboardAlert,
  DashboardAlertType,
} from '@/lib/rules/dashboard-alerts'

type AttentionCenterProps = {
  alerts: DashboardAlert[]
}

const alertStyles: Record<
  DashboardAlertType,
  {
    card: string
    badge: string
    button: string
  }
> = {
  success: {
    card: 'border-green-200 bg-green-50',
    badge: 'bg-green-100 text-green-700',
    button: 'bg-green-600 hover:bg-green-700',
  },
  info: {
    card: 'border-blue-200 bg-blue-50',
    badge: 'bg-blue-100 text-blue-700',
    button: 'bg-blue-600 hover:bg-blue-700',
  },
  warning: {
    card: 'border-yellow-200 bg-yellow-50',
    badge: 'bg-yellow-100 text-yellow-800',
    button: 'bg-yellow-600 hover:bg-yellow-700',
  },
  danger: {
    card: 'border-rose-200 bg-rose-50',
    badge: 'bg-rose-100 text-rose-700',
    button: 'bg-rose-600 hover:bg-rose-700',
  },
}

function getActionHref(alert: DashboardAlert) {
  switch (alert.id) {
    case 'offer-slots':
      return '/dashboard/offers/new'

    case 'paused':
    case 'expiring':
    case 'review':
      return '#my-offers'

    case 'profile':
      return '/dashboard/profile'

    default:
      return '/dashboard'
  }
}

export default function AttentionCenter({
  alerts,
}: AttentionCenterProps) {
  if (alerts.length === 0) {
    return (
      <section className="rounded-2xl border border-green-200 bg-green-50 p-6">
        <p className="text-xs font-bold uppercase tracking-wide text-green-700">
          Business status
        </p>

        <h2 className="mt-2 text-xl font-bold text-green-900">
          Everything looks good
        </h2>

        <p className="mt-2 text-sm leading-6 text-green-800">
          There are no urgent actions for your account right now.
        </p>
      </section>
    )
  }

  return (
    <section>
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-rose-700">
          Needs your attention
        </p>

        <h2 className="mt-2 text-2xl font-bold text-gray-900">
          Recommended actions
        </h2>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
          These recommendations are generated from your current account and
          offer data. No AI is required.
        </p>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        {alerts.map((alert) => {
          const styles = alertStyles[alert.type]
          const actionHref = getActionHref(alert)

          return (
            <article
              key={alert.id}
              className={`rounded-2xl border p-5 ${styles.card}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${styles.badge}`}
                  >
                    {alert.type === 'danger'
                      ? 'Action needed'
                      : alert.type === 'warning'
                        ? 'Review'
                        : alert.type === 'success'
                          ? 'On track'
                          : 'Opportunity'}
                  </span>

                  <h3 className="mt-3 text-lg font-bold text-gray-900">
                    {alert.title}
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-gray-700">
                    {alert.description}
                  </p>
                </div>
              </div>

              {alert.action ? (
                <Link
                  href={actionHref}
                  className={`mt-5 inline-flex rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition ${styles.button}`}
                >
                  {alert.action}
                </Link>
              ) : null}
            </article>
          )
        })}
      </div>
    </section>
  )
}
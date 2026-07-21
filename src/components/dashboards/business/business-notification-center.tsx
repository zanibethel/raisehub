import Link from 'next/link'

// =============================================================================
// Types
// =============================================================================

export type BusinessNotificationTone =
  | 'info'
  | 'success'
  | 'warning'
  | 'danger'

export type BusinessNotification = {
  id: string
  title: string
  description: string
  tone?: BusinessNotificationTone
  href?: string
  actionLabel?: string
  createdAt?: string | null
}

type BusinessNotificationCenterProps = {
  notifications: BusinessNotification[]
  title?: string
  description?: string
}

// =============================================================================
// Presentation helpers
// =============================================================================

function getToneClasses(
  tone: BusinessNotificationTone
): {
  container: string
  icon: string
  label: string
} {
  if (tone === 'success') {
    return {
      container:
        'border-green-200 bg-green-50',
      icon: 'bg-green-100 text-green-700',
      label: 'Update',
    }
  }

  if (tone === 'warning') {
    return {
      container:
        'border-amber-200 bg-amber-50',
      icon: 'bg-amber-100 text-amber-700',
      label: 'Attention',
    }
  }

  if (tone === 'danger') {
    return {
      container:
        'border-red-200 bg-red-50',
      icon: 'bg-red-100 text-red-700',
      label: 'Action needed',
    }
  }

  return {
    container:
      'border-blue-200 bg-blue-50',
    icon: 'bg-blue-100 text-blue-700',
    label: 'Information',
  }
}

function getToneIcon(
  tone: BusinessNotificationTone
): string {
  if (tone === 'success') {
    return '✓'
  }

  if (tone === 'warning') {
    return '!'
  }

  if (tone === 'danger') {
    return '×'
  }

  return 'i'
}

function formatNotificationDate(
  value: string | null | undefined
): string | null {
  if (!value) {
    return null
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return null
  }

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

// =============================================================================
// Notification item
// =============================================================================

function NotificationItem({
  notification,
}: {
  notification: BusinessNotification
}) {
  const tone = notification.tone ?? 'info'
  const toneClasses = getToneClasses(tone)

  const formattedDate =
    formatNotificationDate(
      notification.createdAt
    )

  return (
    <article
      className={`rounded-2xl border p-4 ${toneClasses.container}`}
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${toneClasses.icon}`}
        >
          {getToneIcon(tone)}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                {toneClasses.label}
              </p>

              <h3 className="mt-1 font-semibold text-gray-900">
                {notification.title}
              </h3>
            </div>

            {formattedDate ? (
              <time
                dateTime={
                  notification.createdAt ??
                  undefined
                }
                className="text-xs text-gray-500"
              >
                {formattedDate}
              </time>
            ) : null}
          </div>

          <p className="mt-2 text-sm leading-6 text-gray-700">
            {notification.description}
          </p>

          {notification.href ? (
            <Link
              href={notification.href}
              className="mt-3 inline-flex text-sm font-semibold text-blue-700 hover:text-blue-800 hover:underline"
            >
              {notification.actionLabel ??
                'View details'}
            </Link>
          ) : null}
        </div>
      </div>
    </article>
  )
}

// =============================================================================
// Component
// =============================================================================

export default function BusinessNotificationCenter({
  notifications,
  title = 'Notification Center',
  description = 'Important updates and recommended actions for this business.',
}: BusinessNotificationCenterProps) {
  return (
    <section
      aria-labelledby="business-notification-center-title"
      className="rounded-2xl border border-gray-200 bg-white/90 p-6 shadow-xl backdrop-blur"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
            Business updates
          </p>

          <h2
            id="business-notification-center-title"
            className="mt-1 text-xl font-bold text-gray-900"
          >
            {title}
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
            {description}
          </p>
        </div>

        {notifications.length > 0 ? (
          <span className="w-fit rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
            {notifications.length}{' '}
            {notifications.length === 1
              ? 'update'
              : 'updates'}
          </span>
        ) : null}
      </div>

      {notifications.length > 0 ? (
        <div className="mt-5 space-y-3">
          {notifications.map(
            (notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
              />
            )
          )}
        </div>
      ) : (
        <div className="mt-5 rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center">
          <div
            aria-hidden="true"
            className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-green-100 text-lg font-bold text-green-700"
          >
            ✓
          </div>

          <h3 className="mt-3 font-semibold text-gray-900">
            You’re all caught up
          </h3>

          <p className="mt-1 text-sm text-gray-600">
            New business activity and important
            recommendations will appear here.
          </p>
        </div>
      )}
    </section>
  )
}
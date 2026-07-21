import Link from 'next/link'

import type {
  CustomerDashboardOffer,
} from '@/types/customer-dashboard'

// =============================================================================
// Types
// =============================================================================

type Props = {
  hasActivePass: boolean
  enrichedOffers:
    CustomerDashboardOffer[]
  savedOfferIds: Set<string>
  redeemedOfferIds: Set<string>
}

type CustomerNotificationTone =
  | 'blue'
  | 'green'
  | 'yellow'
  | 'orange'
  | 'purple'

type CustomerNotification = {
  id: string
  icon: string
  eyebrow: string
  title: string
  description: string
  actionLabel: string
  actionHref: string
  tone: CustomerNotificationTone
}

// =============================================================================
// Constants
// =============================================================================

const EXPIRING_SOON_DAYS = 14
const MAX_VISIBLE_NOTIFICATIONS = 4

// =============================================================================
// Date helpers
// =============================================================================

function getDateTimestamp(
  value: string | null | undefined
): number | null {
  if (!value) {
    return null
  }

  const timestamp =
    new Date(value).getTime()

  return Number.isNaN(timestamp)
    ? null
    : timestamp
}

function isOfferExpiringSoon(
  offer: CustomerDashboardOffer,
  now: number
): boolean {
  const expirationTimestamp =
    getDateTimestamp(offer.ends_at)

  if (
    expirationTimestamp === null ||
    expirationTimestamp < now
  ) {
    return false
  }

  const expirationWindow =
    now +
    EXPIRING_SOON_DAYS *
      24 *
      60 *
      60 *
      1000

  return (
    expirationTimestamp <=
    expirationWindow
  )
}

// =============================================================================
// Notification helpers
// =============================================================================

function buildCustomerNotifications({
  hasActivePass,
  enrichedOffers,
  savedOfferIds,
  redeemedOfferIds,
}: Props): CustomerNotification[] {
  const notifications:
    CustomerNotification[] = []

  const now = Date.now()

  const savedOffers =
    enrichedOffers.filter((offer) =>
      savedOfferIds.has(offer.id)
    )

  const unusedSavedOffers =
    savedOffers.filter(
      (offer) =>
        !redeemedOfferIds.has(
          offer.id
        )
    )

  const expiringSavedOffers =
    unusedSavedOffers.filter(
      (offer) =>
        isOfferExpiringSoon(
          offer,
          now
        )
    )

  if (!hasActivePass) {
    notifications.push({
      id: 'pass-required',
      icon: '🎟️',
      eyebrow: 'Pass Access',
      title:
        'Activate your RaiseHub Pass',
      description:
        'A current pass is required to save and redeem participating local offers.',
      actionLabel: 'View Pass Options',
      actionHref: '#support-history',
      tone: 'blue',
    })
  }

  if (
    hasActivePass &&
    expiringSavedOffers.length > 0
  ) {
    notifications.push({
      id: 'saved-expiring',
      icon: '⏳',
      eyebrow: 'Use Soon',
      title: `${expiringSavedOffers.length} saved ${
        expiringSavedOffers.length === 1
          ? 'deal expires'
          : 'deals expire'
      } soon`,
      description: `These saved offers end within the next ${EXPIRING_SOON_DAYS} days. Review them before they are gone.`,
      actionLabel:
        'Review Saved Deals',
      actionHref: '#my-pass',
      tone: 'orange',
    })
  }

  if (
    hasActivePass &&
    unusedSavedOffers.length > 0
  ) {
    notifications.push({
      id: 'saved-ready',
      icon: '⭐',
      eyebrow: 'Ready to Use',
      title: `${unusedSavedOffers.length} saved ${
        unusedSavedOffers.length === 1
          ? 'deal is'
          : 'deals are'
      } waiting`,
      description:
        'Your saved offers are available in My Pass whenever you are ready to visit a participating business.',
      actionLabel: 'Open My Pass',
      actionHref: '#my-pass',
      tone: 'yellow',
    })
  }

  if (
    hasActivePass &&
    savedOffers.length === 0
  ) {
    notifications.push({
      id: 'save-first-deal',
      icon: '📌',
      eyebrow: 'Build Your Pass',
      title:
        'Save your first local deal',
      description:
        'Add useful offers to My Pass so they are easy to find when you are ready to redeem them.',
      actionLabel:
        'Browse Available Deals',
      actionHref:
        '#available-offers',
      tone: 'green',
    })
  }

  if (redeemedOfferIds.size > 0) {
    notifications.push({
      id: 'redemption-history',
      icon: '✅',
      eyebrow: 'Pass Activity',
      title: `${redeemedOfferIds.size} ${
        redeemedOfferIds.size === 1
          ? 'offer has'
          : 'offers have'
      } been redeemed`,
      description:
        'Your completed offer activity is available in Redemption History for easy reference.',
      actionLabel:
        'View Redemption History',
      actionHref:
        '#redemption-history',
      tone: 'purple',
    })
  }

  if (
    hasActivePass &&
    enrichedOffers.length > 0
  ) {
    notifications.push({
      id: 'discover-deals',
      icon: '📍',
      eyebrow: 'Discover',
      title: `${enrichedOffers.length} local ${
        enrichedOffers.length === 1
          ? 'offer is'
          : 'offers are'
      } available`,
      description:
        'Browse current participating-business offers and use the dashboard filters to find the best match.',
      actionLabel:
        'Explore Local Deals',
      actionHref:
        '#available-offers',
      tone: 'blue',
    })
  }

  return notifications.slice(
    0,
    MAX_VISIBLE_NOTIFICATIONS
  )
}

// =============================================================================
// Style helpers
// =============================================================================

function getNotificationClasses(
  tone: CustomerNotificationTone
): string {
  switch (tone) {
    case 'green':
      return 'border-green-100 bg-green-50'

    case 'yellow':
      return 'border-yellow-100 bg-yellow-50'

    case 'orange':
      return 'border-orange-100 bg-orange-50'

    case 'purple':
      return 'border-purple-100 bg-purple-50'

    case 'blue':
      return 'border-blue-100 bg-blue-50'
  }
}

function getEyebrowClasses(
  tone: CustomerNotificationTone
): string {
  switch (tone) {
    case 'green':
      return 'text-green-700'

    case 'yellow':
      return 'text-yellow-700'

    case 'orange':
      return 'text-orange-700'

    case 'purple':
      return 'text-purple-700'

    case 'blue':
      return 'text-blue-700'
  }
}

function getActionClasses(
  tone: CustomerNotificationTone
): string {
  switch (tone) {
    case 'green':
      return 'text-green-700 hover:text-green-800'

    case 'yellow':
      return 'text-yellow-700 hover:text-yellow-800'

    case 'orange':
      return 'text-orange-700 hover:text-orange-800'

    case 'purple':
      return 'text-purple-700 hover:text-purple-800'

    case 'blue':
      return 'text-blue-700 hover:text-blue-800'
  }
}

// =============================================================================
// Component
// =============================================================================

export default function CustomerNotificationCenter({
  hasActivePass,
  enrichedOffers,
  savedOfferIds,
  redeemedOfferIds,
}: Props) {
  const notifications =
    buildCustomerNotifications({
      hasActivePass,
      enrichedOffers,
      savedOfferIds,
      redeemedOfferIds,
    })

  return (
    <section
      aria-labelledby="customer-notification-center-heading"
      className="rounded-3xl border border-blue-100 bg-white/90 p-5 shadow-xl backdrop-blur sm:p-6"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
            What Should I Do Next?
          </p>

          <h2
            id="customer-notification-center-heading"
            className="mt-2 text-2xl font-bold text-gray-900"
          >
            Your RaiseHub Updates
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
            Timely pass reminders and
            suggested actions based on
            your current account activity.
          </p>
        </div>

        <span className="w-fit rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
          {notifications.length}{' '}
          {notifications.length === 1
            ? 'update'
            : 'updates'}
        </span>
      </div>

      {notifications.length > 0 ? (
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {notifications.map(
            (notification) => (
              <article
                key={notification.id}
                className={`rounded-2xl border p-5 ${getNotificationClasses(
                  notification.tone
                )}`}
              >
                <div className="flex items-start gap-4">
                  <span
                    aria-hidden="true"
                    className="text-2xl"
                  >
                    {notification.icon}
                  </span>

                  <div className="min-w-0">
                    <p
                      className={`text-xs font-semibold uppercase tracking-wide ${getEyebrowClasses(
                        notification.tone
                      )}`}
                    >
                      {
                        notification.eyebrow
                      }
                    </p>

                    <h3 className="mt-2 font-bold text-gray-900">
                      {notification.title}
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-gray-600">
                      {
                        notification.description
                      }
                    </p>

                    <Link
                      href={
                        notification.actionHref
                      }
                      className={`mt-4 inline-flex min-h-11 items-center text-sm font-semibold underline underline-offset-4 ${getActionClasses(
                        notification.tone
                      )}`}
                    >
                      {
                        notification.actionLabel
                      }
                    </Link>
                  </div>
                </div>
              </article>
            )
          )}
        </div>
      ) : (
        <div className="mt-5 rounded-2xl border border-green-100 bg-green-50 p-5">
          <p className="font-semibold text-green-800">
            You&apos;re all caught up
          </p>

          <p className="mt-2 text-sm leading-6 text-green-700">
            There are no urgent pass
            actions requiring your
            attention right now.
          </p>
        </div>
      )}
    </section>
  )
}
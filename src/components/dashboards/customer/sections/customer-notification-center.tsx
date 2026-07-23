import Link from 'next/link'

import type { CustomerDashboardOffer } from '@/types/customer-dashboard'

type Props = {
  hasActivePass: boolean
  enrichedOffers: CustomerDashboardOffer[]
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

const EXPIRING_SOON_DAYS = 14
const MAX_VISIBLE_NOTIFICATIONS = 4

function getDateTimestamp(
  value: string | null | undefined
): number | null {
  if (!value) return null
  const timestamp = new Date(value).getTime()
  return Number.isNaN(timestamp) ? null : timestamp
}

function isOfferExpiringSoon(
  offer: CustomerDashboardOffer,
  now: number
): boolean {
  const expirationTimestamp = getDateTimestamp(offer.ends_at)

  if (
    expirationTimestamp === null ||
    expirationTimestamp < now
  ) {
    return false
  }

  return (
    expirationTimestamp <=
    now + EXPIRING_SOON_DAYS * 24 * 60 * 60 * 1000
  )
}

function buildCustomerNotifications({
  hasActivePass,
  enrichedOffers,
  savedOfferIds,
  redeemedOfferIds,
}: Props): CustomerNotification[] {
  const notifications: CustomerNotification[] = []
  const now = Date.now()
  const savedOffers = enrichedOffers.filter((offer) =>
    savedOfferIds.has(offer.id)
  )
  const unusedSavedOffers = savedOffers.filter(
    (offer) => !redeemedOfferIds.has(offer.id)
  )
  const expiringSavedOffers = unusedSavedOffers.filter((offer) =>
    isOfferExpiringSoon(offer, now)
  )
  const expiringOfferIds = new Set(
    expiringSavedOffers.map((offer) => offer.id)
  )
  const readySavedOffers = unusedSavedOffers.filter(
    (offer) => !expiringOfferIds.has(offer.id)
  )

  if (!hasActivePass) {
    notifications.push({
      id: 'pass-required',
      icon: '🎟️',
      eyebrow: 'Pass Access',
      title: 'Activate your RaiseHub Pass',
      description:
        'A current pass is required to save and redeem participating local offers.',
      actionLabel: 'View Options',
      actionHref: '#support-history',
      tone: 'blue',
    })
  }

  if (hasActivePass && expiringSavedOffers.length > 0) {
    notifications.push({
      id: 'saved-expiring',
      icon: '⏳',
      eyebrow: 'Use Soon',
      title: `${expiringSavedOffers.length} saved ${
        expiringSavedOffers.length === 1
          ? 'deal expires'
          : 'deals expire'
      } soon`,
      description: `These saved offers end within the next ${EXPIRING_SOON_DAYS} days.`,
      actionLabel: 'Review',
      actionHref: '#my-pass',
      tone: 'orange',
    })
  }

  if (hasActivePass && readySavedOffers.length > 0) {
    notifications.push({
      id: 'saved-ready',
      icon: '⭐',
      eyebrow: 'Ready to Use',
      title: `${readySavedOffers.length} saved ${
        readySavedOffers.length === 1
          ? 'deal is'
          : 'deals are'
      } waiting`,
      description: 'Open My Pass when you are ready to visit the business.',
      actionLabel: 'Open Pass',
      actionHref: '#my-pass',
      tone: 'yellow',
    })
  }

  if (hasActivePass && savedOffers.length === 0) {
    notifications.push({
      id: 'save-first-deal',
      icon: '📌',
      eyebrow: 'Build Your Pass',
      title: 'Save your first local deal',
      description: 'Keep useful offers together for quick access later.',
      actionLabel: 'Browse',
      actionHref: '#available-offers',
      tone: 'green',
    })
  }

  if (hasActivePass && enrichedOffers.length > 0) {
    notifications.push({
      id: 'discover-deals',
      icon: '📍',
      eyebrow: 'Discover',
      title: `${enrichedOffers.length} local ${
        enrichedOffers.length === 1
          ? 'offer is'
          : 'offers are'
      } available`,
      description: 'Browse current participating-business offers.',
      actionLabel: 'Explore',
      actionHref: '#available-offers',
      tone: 'blue',
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
      description: 'Review completed activity in Redemption History.',
      actionLabel: 'History',
      actionHref: '#redemption-history',
      tone: 'purple',
    })
  }

  return notifications.slice(0, MAX_VISIBLE_NOTIFICATIONS)
}

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
      return 'border-green-200 text-green-700 hover:bg-green-100'
    case 'yellow':
      return 'border-yellow-200 text-yellow-800 hover:bg-yellow-100'
    case 'orange':
      return 'border-orange-200 text-orange-800 hover:bg-orange-100'
    case 'purple':
      return 'border-purple-200 text-purple-700 hover:bg-purple-100'
    case 'blue':
      return 'border-blue-200 text-blue-700 hover:bg-blue-100'
  }
}

export default function CustomerNotificationCenter({
  hasActivePass,
  enrichedOffers,
  savedOfferIds,
  redeemedOfferIds,
}: Props) {
  const notifications = buildCustomerNotifications({
    hasActivePass,
    enrichedOffers,
    savedOfferIds,
    redeemedOfferIds,
  })

  return (
    <section
      aria-labelledby="customer-notification-center-heading"
      className="overflow-hidden rounded-3xl border border-blue-100 bg-white/90 p-4 shadow-lg backdrop-blur sm:p-6"
    >
      <div className="flex min-w-0 items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-700">
            What Should I Do Next?
          </p>
          <h2
            id="customer-notification-center-heading"
            className="mt-1 break-words text-xl font-bold leading-tight text-gray-900 sm:text-2xl"
          >
            Your RaiseHub Updates
          </h2>
        </div>

        <span className="shrink-0 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
          {notifications.length}
        </span>
      </div>

      {notifications.length > 0 ? (
        <div className="mt-3 divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-100">
          {notifications.map((notification) => (
            <article
              key={notification.id}
              className={`min-w-0 px-3 py-3 ${getNotificationClasses(
                notification.tone
              )}`}
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <span aria-hidden="true" className="shrink-0 text-lg">
                  {notification.icon}
                </span>

                <div className="min-w-0 flex-1">
                  <p
                    className={`text-[10px] font-semibold uppercase tracking-wide ${getEyebrowClasses(
                      notification.tone
                    )}`}
                  >
                    {notification.eyebrow}
                  </p>
                  <p className="truncate text-sm font-bold text-gray-900 sm:text-base">
                    {notification.title}
                  </p>
                </div>

                <Link
                  href={notification.actionHref}
                  aria-label={notification.actionLabel}
                  className={`shrink-0 rounded-lg border bg-white px-3 py-2 text-xs font-semibold transition ${getActionClasses(
                    notification.tone
                  )}`}
                >
                  {notification.actionLabel}
                </Link>
              </div>

              <details className="group mt-1 pl-7">
                <summary className="w-fit cursor-pointer list-none text-[11px] font-semibold text-gray-500 hover:text-gray-700">
                  <span className="group-open:hidden">Details +</span>
                  <span className="hidden group-open:inline">Hide details −</span>
                </summary>
                <p className="mt-1 pr-2 text-xs leading-5 text-gray-600">
                  {notification.description}
                </p>
              </details>
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-4 rounded-2xl border border-green-100 bg-green-50 p-4">
          <p className="font-semibold text-green-800">You&apos;re all caught up</p>
          <p className="mt-1 text-sm leading-6 text-green-700">
            There are no urgent pass actions requiring your attention.
          </p>
        </div>
      )}
    </section>
  )
}

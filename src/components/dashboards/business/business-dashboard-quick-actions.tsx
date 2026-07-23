import Link from 'next/link'

type BusinessDashboardQuickActionsProps = {
  hasReachedLimit: boolean
  publicOfferId?: string | null
}

type QuickAction = {
  title: string
  href: string
  detail: string
  external?: boolean
}

export default function BusinessDashboardQuickActions({
  hasReachedLimit,
  publicOfferId,
}: BusinessDashboardQuickActionsProps) {
  const actions: QuickAction[] = [
    {
      title: hasReachedLimit ? 'Manage Offer Limit' : 'Create Offer',
      href: hasReachedLimit ? '#create-offer' : '/dashboard/offers/new',
      detail: hasReachedLimit
        ? 'Review active offers or upgrade options.'
        : 'Open the guided offer builder.',
    },
    {
      title: 'Public View',
      href: publicOfferId ? `/offers/${publicOfferId}` : '#business-offers',
      detail: publicOfferId
        ? 'Open the customer-facing view of an active offer.'
        : 'Publish an active offer to enable customer view.',
      external: Boolean(publicOfferId),
    },
    {
      title: 'Business Details',
      href: '#business-profile',
      detail: 'Review and update profile and location information.',
    },
    {
      title: 'Offer Reports',
      href: '#business-offers',
      detail: 'Review offer details and redemption activity.',
    },
  ]

  return (
    <section className="rounded-2xl border border-gray-200 bg-white/90 p-4 shadow-sm">
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
          Business tools
        </p>
        <h2 className="mt-1 text-base font-bold text-gray-950">
          Quick actions
        </h2>
      </div>

      <div className="mt-4 grid grid-cols-2 overflow-hidden rounded-xl border border-gray-200 bg-white sm:grid-cols-4 sm:divide-x sm:divide-gray-200">
        {actions.map((action, index) => (
          <Link
            key={action.title}
            href={action.href}
            target={action.external ? '_blank' : undefined}
            rel={action.external ? 'noreferrer' : undefined}
            className={`min-w-0 px-3 py-3 text-center transition hover:bg-gray-50 ${
              index < 2 ? 'border-b border-gray-200 sm:border-b-0' : ''
            } ${index % 2 === 0 ? 'border-r border-gray-200 sm:border-r-0' : ''}`}
          >
            <span className="block text-xs font-bold leading-4 text-blue-700 sm:text-sm">
              {action.title}
            </span>
            <span className="mt-1 hidden text-xs leading-4 text-gray-500 sm:block">
              {action.detail}
            </span>
          </Link>
        ))}
      </div>
    </section>
  )
}

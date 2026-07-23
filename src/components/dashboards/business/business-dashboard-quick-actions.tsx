import Link from 'next/link'

type BusinessDashboardQuickActionsProps = {
  hasReachedLimit: boolean
}

type QuickAction = {
  title: string
  href: string
  detail: string
}

export default function BusinessDashboardQuickActions({
  hasReachedLimit,
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
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
            Business tools
          </p>
          <h2 className="mt-1 text-base font-bold text-gray-950">
            Quick actions
          </h2>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 divide-x divide-gray-200 overflow-hidden rounded-xl border border-gray-200 bg-white">
        {actions.map((action) => (
          <Link
            key={action.title}
            href={action.href}
            className="min-w-0 px-2 py-3 text-center transition hover:bg-gray-50 sm:px-4"
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

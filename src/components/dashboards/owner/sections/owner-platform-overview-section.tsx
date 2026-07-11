import Link from 'next/link'

// =============================================================================
// Types
// =============================================================================

type ConsoleItem = {
  title: string
  description: string
  href: string
  label: string
  status?: string
}

// =============================================================================
// Console items
// =============================================================================

const consoleItems: ConsoleItem[] = [
  {
    title: 'Businesses',
    description:
      'Search partner businesses, review profiles, inspect offers, and enter support mode.',
    href: '/dashboard/owner/businesses',
    label: 'Manage Businesses',
  },
  {
    title: 'Organizations',
    description:
      'Review fundraising organizations, campaigns, sellers, earnings, and support requests.',
    href: '/dashboard/owner/organizations',
    label: 'Manage Organizations',
  },
  {
    title: 'Customers',
    description:
      'Review customer accounts, purchased passes, saved offers, and redemption activity.',
    href: '/dashboard/owner/customers',
    label: 'Manage Customers',
  },
  {
    title: 'Role Preview',
    description:
      'Test customer, business, organization, and admin experiences from one owner login.',
    href: '/dashboard?previewRole=customer',
    label: 'Open Preview',
    status: 'Available soon',
  },
  {
    title: 'Client Assistance',
    description:
      'View a live client account, enable assisted editing, and record the reason for each change.',
    href: '/dashboard/owner/support',
    label: 'Open Support Tools',
    status: 'Foundation ready',
  },
  {
    title: 'Support Activity',
    description:
      'Review owner actions, affected accounts, changed resources, and audit history.',
    href: '/dashboard/owner/activity',
    label: 'View Audit Log',
    status: 'Foundation ready',
  },
  {
    title: 'Platform Health',
    description:
      'Review operational warnings, incomplete profiles, expiring offers, and system issues.',
    href: '/dashboard/owner/health',
    label: 'View Platform Health',
    status: 'Planned',
  },
  {
    title: 'Revenue',
    description:
      'Track campaign volume, platform fees, organization earnings, and future subscriptions.',
    href: '/dashboard/owner/revenue',
    label: 'View Revenue',
    status: 'Planned',
  },
  {
    title: 'Platform Settings',
    description:
      'Manage global limits, feature flags, support permissions, and platform-wide behavior.',
    href: '/dashboard/owner/settings',
    label: 'Open Settings',
    status: 'Planned',
  },
]

// =============================================================================
// Component
// =============================================================================

export default function OwnerPlatformOverviewSection() {
  return (
    <section>
      <div className="rounded-3xl border border-slate-200 bg-slate-950 p-8 text-white shadow-xl">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-300">
          RaiseHub Platform
        </p>

        <h2 className="mt-3 text-3xl font-bold">
          Owner Console
        </h2>

        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
          Run the platform, preview every role, assist clients, review activity,
          and monitor RaiseHub from one secure owner account.
        </p>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {consoleItems.map((item) => (
          <article
            key={item.title}
            className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-lg font-bold text-slate-900">
                {item.title}
              </h3>

              {item.status ? (
                <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                  {item.status}
                </span>
              ) : null}
            </div>

            <p className="mt-3 flex-1 text-sm leading-6 text-slate-600">
              {item.description}
            </p>

            <Link
              href={item.href}
              className="mt-5 inline-flex items-center justify-center rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
            >
              {item.label}
            </Link>
          </article>
        ))}
      </div>
    </section>
  )
}
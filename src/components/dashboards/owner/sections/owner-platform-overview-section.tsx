import Link from 'next/link'

import { getDemoGroups } from '@/lib/repositories/demo-platform-repository'

const quickActions = [
  {
    title: 'Find account',
    description: 'Search every workspace',
    href: '/dashboard/owner/support',
  },
  {
    title: 'Campaign reviews',
    description: 'Review pending campaigns',
    href: '/dashboard/owner/campaign-reviews',
  },
  {
    title: 'Preview role',
    description: 'Test another experience',
    href: '/dashboard/owner/preview',
  },
  {
    title: 'Platform analytics',
    description: 'Review live totals',
    href: '/dashboard/owner/analytics',
  },
]

export default async function OwnerPlatformOverviewSection() {
  const demoGroupsResult = await getDemoGroups()
  const demoProfileCount = demoGroupsResult.groups.reduce(
    (total, group) => total + group.profileCount,
    0
  )

  const managementAreas = [
    {
      eyebrow: 'Manage platform',
      title: 'Businesses',
      description: 'Profiles, offers, visibility, redemptions, and support access.',
      href: '/dashboard/owner/businesses',
      status: 'Live',
    },
    {
      eyebrow: 'Manage platform',
      title: 'Organizations',
      description: 'Campaigns, sellers, supporters, fundraising, and earnings.',
      href: '/dashboard/owner/organizations',
      status: 'Live',
    },
    {
      eyebrow: 'Manage platform',
      title: 'Customers',
      description: 'Passes, savings, purchases, and redemption activity.',
      href: '/dashboard/owner/customers',
      status: 'Live',
    },
    {
      eyebrow: 'Demo platform',
      title: 'Demo Center',
      description: `${demoGroupsResult.groups.length} groups · ${demoProfileCount} profiles`,
      href: '/dashboard/owner/demos',
      status: demoGroupsResult.error ? 'Needs review' : 'Live',
    },
    {
      eyebrow: 'Client assistance',
      title: 'Support Center',
      description: 'Find workspaces, inspect context, and track assistance.',
      href: '/dashboard/owner/support',
      status: 'Ready',
    },
    {
      eyebrow: 'Platform controls',
      title: 'Operations',
      description: 'Health, revenue, settings, feature controls, and warnings.',
      href: '/dashboard/owner/health',
      status: 'Building',
    },
  ]

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-slate-950 p-6 text-white shadow-xl sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-300">
              RaiseHub Platform
            </p>
            <h2 className="mt-3 text-3xl font-bold">Owner Console</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
              See what needs attention, then open the focused workspace for deeper work.
            </p>
          </div>
          <span className="inline-flex w-fit items-center gap-2 rounded-full bg-emerald-400/10 px-3 py-1.5 text-sm font-semibold text-emerald-200">
            <span className="h-2 w-2 rounded-full bg-emerald-300" />
            Platform online
          </span>
        </div>
      </div>

      <div>
        <div className="mb-3">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-700">
            Quick actions
          </p>
          <h3 className="mt-1 text-xl font-bold text-slate-950">
            Go straight to the work
          </h3>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {quickActions.map((item) => (
            <Link
              key={item.title}
              href={item.href}
              className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-300 hover:bg-blue-50"
            >
              <span className="block break-words font-bold text-slate-950">
                {item.title}
              </span>
              <span className="mt-1 block text-xs leading-5 text-slate-600">
                {item.description}
              </span>
            </Link>
          ))}
        </div>
      </div>

      <details className="group rounded-3xl border border-slate-200 bg-white shadow-sm">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 sm:p-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-700">
              Management areas
            </p>
            <h3 className="mt-1 text-xl font-bold text-slate-950">
              Open a focused workspace
            </h3>
            <p className="mt-1 text-sm text-slate-600">
              Six platform workspaces
            </p>
          </div>
          <span className="shrink-0 text-2xl font-bold text-slate-500 transition group-open:rotate-45">
            +
          </span>
        </summary>

        <div className="border-t border-slate-200 p-4 sm:p-5">
          <div className="grid gap-3 md:grid-cols-2">
            {managementAreas.map((item) => (
              <Link
                key={item.title}
                href={item.href}
                className="flex min-w-0 items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-blue-300 hover:bg-blue-50"
              >
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-blue-700">
                    {item.eyebrow}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <h4 className="text-lg font-bold text-slate-950">{item.title}</h4>
                    <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-bold text-slate-600">
                      {item.status}
                    </span>
                  </div>
                  <p className="mt-1 text-sm leading-5 text-slate-600">
                    {item.description}
                  </p>
                </div>
                <span aria-hidden="true" className="shrink-0 text-xl font-bold text-slate-500">
                  →
                </span>
              </Link>
            ))}
          </div>
        </div>
      </details>
    </section>
  )
}

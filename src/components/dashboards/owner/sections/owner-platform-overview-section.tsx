import Link from 'next/link'

import {
  getDemoGroups,
  type DemoGroupSummary,
} from '@/lib/repositories/demo-platform-repository'

// =============================================================================
// Types
// =============================================================================

type ConsoleLink = {
  title: string
  description: string
  href: string
  status?: string
}

type ConsoleMenuProps = {
  title: string
  description: string
  items: ConsoleLink[]
  defaultOpen?: boolean
}

// =============================================================================
// Console destinations
// =============================================================================

const quickActions: ConsoleLink[] = [
  {
    title: 'Find Account',
    description: 'Search every workspace',
    href: '#owner-workspaces',
  },
  {
    title: 'Preview Role',
    description: 'Test another experience',
    href: '#owner-role-preview',
  },
  {
    title: 'Support Tools',
    description: 'Assist a client safely',
    href: '/dashboard/owner/support',
  },
  {
    title: 'Platform Analytics',
    description: 'Review live totals',
    href: '#owner-analytics',
  },
]

const managementItems: ConsoleLink[] = [
  {
    title: 'Businesses',
    description:
      'Review business profiles, offers, and support access.',
    href: '/dashboard/owner/businesses',
  },
  {
    title: 'Organizations',
    description:
      'Review organizations, campaigns, sellers, and earnings.',
    href: '/dashboard/owner/organizations',
  },
  {
    title: 'Customers',
    description:
      'Review customer accounts, passes, savings, and redemptions.',
    href: '/dashboard/owner/customers',
  },
]

const demoItems: ConsoleLink[] = [
  {
    title: 'Experience Viewer',
    description:
      'Preview customer, business, organization, and admin experiences.',
    href: '#owner-role-preview',
  },
  {
    title: 'Demo Profiles',
    description:
      'Create, open, reset, and remove reusable demo identities.',
    href: '#owner-demo-groups',
    status: 'Foundation ready',
  },
  {
    title: 'Demo Groups',
    description:
      'Review portable demo datasets and their related records.',
    href: '#owner-demo-groups',
    status: 'Live',
  },
]

const supportItems: ConsoleLink[] = [
  {
    title: 'Find Workspace',
    description:
      'Search businesses, organizations, and customers.',
    href: '#owner-workspaces',
  },
  {
    title: 'Client Assistance',
    description:
      'Open support tools and inspect client workspaces.',
    href: '/dashboard/owner/support',
    status: 'Foundation ready',
  },
  {
    title: 'Support Activity',
    description:
      'Review owner actions and audit history.',
    href: '/dashboard/owner/activity',
    status: 'Foundation ready',
  },
]

const platformItems: ConsoleLink[] = [
  {
    title: 'Platform Health',
    description:
      'Review warnings, incomplete profiles, and system issues.',
    href: '/dashboard/owner/health',
    status: 'Planned',
  },
  {
    title: 'Revenue',
    description:
      'Track campaign volume, fees, and organization earnings.',
    href: '/dashboard/owner/revenue',
    status: 'Planned',
  },
  {
    title: 'Platform Settings',
    description:
      'Manage limits, feature flags, and platform behavior.',
    href: '/dashboard/owner/settings',
    status: 'Planned',
  },
]

// =============================================================================
// Components
// =============================================================================

function ArrowIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
      className="h-5 w-5 shrink-0 text-slate-400"
    >
      <path
        fillRule="evenodd"
        d="M7.22 14.78a.75.75 0 0 1 0-1.06L10.94 10 7.22 6.28a.75.75 0 0 1 1.06-1.06l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0Z"
        clipRule="evenodd"
      />
    </svg>
  )
}

function ChevronIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
      className="h-5 w-5 shrink-0 text-slate-500 transition group-open:rotate-180"
    >
      <path
        fillRule="evenodd"
        d="M5.22 7.22a.75.75 0 0 1 1.06 0L10 10.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 8.28a.75.75 0 0 1 0-1.06Z"
        clipRule="evenodd"
      />
    </svg>
  )
}

function ConsoleMenu({
  title,
  description,
  items,
  defaultOpen = false,
}: ConsoleMenuProps) {
  return (
    <details
      open={defaultOpen}
      className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 transition hover:bg-slate-50 sm:p-6">
        <span className="min-w-0">
          <span className="block text-lg font-bold text-slate-950">
            {title}
          </span>

          <span className="mt-1 block text-sm leading-5 text-slate-600">
            {description}
          </span>
        </span>

        <ChevronIcon />
      </summary>

      <div className="border-t border-slate-100 p-2 sm:p-3">
        {items.map((item) => (
          <Link
            key={item.title}
            href={item.href}
            className="flex items-center justify-between gap-4 rounded-xl px-3 py-3 transition hover:bg-blue-50 sm:px-4"
          >
            <span className="min-w-0">
              <span className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-slate-900">
                  {item.title}
                </span>

                {item.status ? (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-600">
                    {item.status}
                  </span>
                ) : null}
              </span>

              <span className="mt-0.5 block text-sm leading-5 text-slate-600">
                {item.description}
              </span>
            </span>

            <ArrowIcon />
          </Link>
        ))}
      </div>
    </details>
  )
}

function DemoGroupCard({
  group,
}: {
  group: DemoGroupSummary
}) {
  return (
    <Link
      href={`/dashboard/owner/demo-groups/${encodeURIComponent(
        group.groupKey
      )}`}
      className="group block rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md sm:p-5"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="font-bold text-slate-950">
              {group.name}
            </h4>

            {group.isDefault ? (
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-blue-700">
                Default
              </span>
            ) : null}

            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
              {group.status}
            </span>
          </div>

          <p className="mt-1 text-sm leading-5 text-slate-600">
            {group.description ??
              'Reusable RaiseHub demo scenario.'}
          </p>
        </div>

        <span className="flex h-10 min-w-10 shrink-0 items-center justify-center rounded-full bg-slate-950 px-2 text-sm font-bold text-white">
          {group.profileCount}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
        <div className="flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
          <span className="rounded-full bg-slate-100 px-2.5 py-1">
            {group.scenarioType}
          </span>

          <span className="rounded-full bg-slate-100 px-2.5 py-1">
            {group.profileCount}{' '}
            {group.profileCount === 1
              ? 'profile'
              : 'profiles'}
          </span>
        </div>

        <span className="flex items-center gap-2 text-xs font-bold text-blue-700">
          Open group
          <span
            aria-hidden="true"
            className="transition group-hover:translate-x-0.5"
          >
            →
          </span>
        </span>
      </div>
    </Link>
  )
}

function DemoGroupsPanel({
  groups,
  error,
}: {
  groups: DemoGroupSummary[]
  error: string | null
}) {
  return (
    <section
      id="owner-demo-groups"
      className="scroll-mt-24 rounded-3xl border border-blue-200 bg-blue-50/60 p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-700">
            Demo Platform
          </p>

          <h3 className="mt-1 text-xl font-bold text-slate-950">
            Demo Groups
          </h3>

          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
            Reusable scenarios that stay separated from production data.
          </p>
        </div>

        <span className="rounded-full bg-blue-700 px-3 py-1.5 text-sm font-bold text-white">
          {groups.length}
        </span>
      </div>

      {error ? (
        <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4">
          <p className="font-semibold text-rose-900">
            Demo groups could not be loaded
          </p>

          <p className="mt-1 text-sm text-rose-700">
            {error}
          </p>
        </div>
      ) : groups.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-blue-300 bg-white p-5 text-center">
          <p className="font-semibold text-slate-900">
            No demo groups yet
          </p>

          <p className="mt-1 text-sm text-slate-600">
            Create the first reusable scenario from the Demo Center.
          </p>
        </div>
      ) : (
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {groups.map((group) => (
            <DemoGroupCard
              key={group.id}
              group={group}
            />
          ))}
        </div>
      )}
    </section>
  )
}

// =============================================================================
// Section
// =============================================================================

export default async function OwnerPlatformOverviewSection() {
  const demoGroupsResult =
    await getDemoGroups()

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-slate-950 p-6 text-white shadow-xl sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-300">
              RaiseHub Platform
            </p>

            <h2 className="mt-3 text-3xl font-bold">
              Owner Console
            </h2>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
              Monitor the platform, manage accounts, operate demo
              experiences, and assist clients from one secure workspace.
            </p>
          </div>

          <span className="inline-flex w-fit items-center gap-2 rounded-full bg-emerald-400/10 px-3 py-1.5 text-sm font-semibold text-emerald-200">
            <span className="h-2 w-2 rounded-full bg-emerald-300" />
            Platform online
          </span>
        </div>
      </div>

      <div>
        <div className="mb-3 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-700">
              Quick Actions
            </p>

            <h3 className="mt-1 text-xl font-bold text-slate-950">
              Go straight to the work
            </h3>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {quickActions.map((item) => (
            <Link
              key={item.title}
              href={item.href}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-300 hover:bg-blue-50"
            >
              <span className="block font-bold text-slate-950">
                {item.title}
              </span>

              <span className="mt-1 block text-xs leading-5 text-slate-600">
                {item.description}
              </span>
            </Link>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <ConsoleMenu
          title="Manage Platform"
          description="Businesses, organizations, and customers"
          items={managementItems}
          defaultOpen
        />

        <div id="owner-demo-center">
          <ConsoleMenu
            title="Demo Center"
            description="Demo profiles, groups, and experience tools"
            items={demoItems}
          />
        </div>

        <ConsoleMenu
          title="Client Support"
          description="Workspace search, assistance, and audit history"
          items={supportItems}
        />

        <ConsoleMenu
          title="Platform Operations"
          description="Health, revenue, settings, and platform controls"
          items={platformItems}
        />
      </div>

      <DemoGroupsPanel
        groups={demoGroupsResult.groups}
        error={demoGroupsResult.error}
      />
    </section>
  )
}

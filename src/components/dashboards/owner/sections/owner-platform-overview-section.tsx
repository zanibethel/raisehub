import Link from 'next/link'

import CreateDemoGroupForm from '@/components/dashboards/owner/create-demo-group-form'
import OwnerFeatureCard from '@/components/dashboards/owner/owner-feature-card'
import {
  getDemoGroups,
  type DemoGroupSummary,
} from '@/lib/repositories/demo-platform-repository'

// =============================================================================
// Quick actions
// =============================================================================

const quickActions = [
  {
    title: 'Find account',
    description: 'Search every workspace',
    href: '#owner-workspaces',
  },
  {
    title: 'Preview role',
    description: 'Test another experience',
    href: '#owner-role-preview',
  },
  {
    title: 'Support tools',
    description: 'Assist a client safely',
    href: '/dashboard/owner/support',
  },
  {
    title: 'Platform analytics',
    description: 'Review live totals',
    href: '#owner-analytics',
  },
]

// =============================================================================
// Demo groups
// =============================================================================

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

      <div className="mt-4">
        <CreateDemoGroupForm />
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
  const demoGroupsResult = await getDemoGroups()

  const demoProfileCount =
    demoGroupsResult.groups.reduce(
      (total, group) => total + group.profileCount,
      0
    )

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
              Monitor what matters, then open the dedicated workspace for deeper management, tools, and history.
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
            Quick Actions
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

      <div>
        <div className="mb-4">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-700">
            Management Areas
          </p>

          <h3 className="mt-1 text-xl font-bold text-slate-950">
            Open a focused workspace
          </h3>

          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
            Each area keeps the dashboard summary light while providing the complete information and tools behind it.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <OwnerFeatureCard
            eyebrow="Manage Platform"
            title="Businesses"
            description="Review profiles, offers, visibility, redemptions, and support access."
            href="/dashboard/owner/businesses"
            actionLabel="Manage businesses"
            status={{
              label: 'Live',
              tone: 'green',
            }}
          />

          <OwnerFeatureCard
            eyebrow="Manage Platform"
            title="Organizations"
            description="Review organizations, campaigns, sellers, supporters, and fundraising earnings."
            href="/dashboard/owner/organizations"
            actionLabel="Manage organizations"
            status={{
              label: 'Live',
              tone: 'green',
            }}
          />

          <OwnerFeatureCard
            eyebrow="Manage Platform"
            title="Customers"
            description="Review customer accounts, passes, savings, purchases, and redemption activity."
            href="/dashboard/owner/customers"
            actionLabel="Manage customers"
            status={{
              label: 'Live',
              tone: 'green',
            }}
          />

          <OwnerFeatureCard
            eyebrow="Demo Platform"
            title="Demo Center"
            description="Create reusable scenarios, manage demo identities, and preview role experiences."
            href="#owner-demo-groups"
            actionLabel="Open Demo Center"
            metrics={[
              {
                label: 'Groups',
                value: String(
                  demoGroupsResult.groups.length
                ),
              },
              {
                label: 'Profiles',
                value: String(demoProfileCount),
              },
            ]}
            status={{
              label: demoGroupsResult.error
                ? 'Needs review'
                : 'Live',
              tone: demoGroupsResult.error
                ? 'amber'
                : 'blue',
            }}
          />

          <OwnerFeatureCard
            eyebrow="Client Assistance"
            title="Support Center"
            description="Find workspaces, inspect client context safely, and track assistance activity."
            href="/dashboard/owner/support"
            actionLabel="Open support tools"
            status={{
              label: 'Foundation ready',
              tone: 'blue',
            }}
          />

          <OwnerFeatureCard
            eyebrow="Platform Controls"
            title="Operations"
            description="Review health, revenue, settings, feature controls, and platform-wide warnings."
            href="/dashboard/owner/health"
            actionLabel="Open operations"
            status={{
              label: 'Building',
              tone: 'amber',
            }}
            footer="Health, revenue, automation, and settings will become focused pages as each tool is completed."
          />
        </div>
      </div>

      <DemoGroupsPanel
        groups={demoGroupsResult.groups}
        error={demoGroupsResult.error}
      />
    </section>
  )
}

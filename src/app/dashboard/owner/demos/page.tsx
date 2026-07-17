import Link from 'next/link'
import { redirect } from 'next/navigation'

import CreateDemoGroupForm from '@/components/dashboards/owner/create-demo-group-form'
import {
  getDemoGroups,
  type DemoGroupSummary,
} from '@/lib/repositories/demo-platform-repository'
import { createClient } from '@/lib/supabase/server'

export const metadata = {
  title: 'Demo Center | RaiseHub Owner Console',
}

type ActorProfile = {
  role: string
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value))
}

function DemoGroupCard({
  group,
}: {
  group: DemoGroupSummary
}) {
  return (
    <Link
      href={`/dashboard/owner/demo-groups/${encodeURIComponent(group.groupKey)}`}
      className="group flex h-full min-w-0 flex-col rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-lg sm:p-6"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="break-words text-xl font-bold text-slate-950">
              {group.name}
            </h2>

            {group.isDefault ? (
              <span className="rounded-full bg-blue-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-blue-700">
                Default
              </span>
            ) : null}

            <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
              {group.status}
            </span>
          </div>

          <p className="mt-2 break-words text-sm leading-6 text-slate-600">
            {group.description ?? 'Reusable RaiseHub demo scenario.'}
          </p>
        </div>

        <span className="flex h-12 min-w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-950 px-2 text-lg font-bold text-white">
          {group.profileCount}
        </span>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-semibold text-slate-500">
            Scenario
          </p>
          <p className="mt-1 break-words font-bold capitalize text-slate-950">
            {group.scenarioType}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-semibold text-slate-500">
            Updated
          </p>
          <p className="mt-1 font-bold text-slate-950">
            {formatDate(group.updatedAt)}
          </p>
        </div>
      </div>

      <div className="mt-auto flex items-center justify-between gap-3 border-t border-slate-100 pt-5">
        <span className="text-xs font-semibold text-slate-500">
          {group.profileCount} {group.profileCount === 1 ? 'demo profile' : 'demo profiles'}
        </span>

        <span className="flex items-center gap-2 text-sm font-bold text-blue-700">
          Open group
          <span aria-hidden="true" className="transition group-hover:translate-x-0.5">
            →
          </span>
        </span>
      </div>
    </Link>
  )
}

export default async function OwnerDemoCenterPage() {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single<ActorProfile>()

  if (!profile || profile.role !== 'owner') {
    redirect('/dashboard')
  }

  const result = await getDemoGroups()

  const profileCount = result.groups.reduce(
    (total, group) => total + group.profileCount,
    0
  )

  const activeGroupCount = result.groups.filter(
    (group) => group.status === 'active'
  ).length

  return (
    <main className="min-h-screen bg-[#F0F6FF] px-4 py-6 sm:px-8 sm:py-10">
      <div className="mx-auto max-w-7xl">
        <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl sm:p-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm font-bold text-blue-700 transition hover:text-blue-900"
          >
            <span aria-hidden="true">←</span>
            Owner dashboard
          </Link>

          <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">
                Demo Platform
              </p>

              <h1 className="mt-2 text-3xl font-bold text-slate-950 sm:text-4xl">
                Demo Center
              </h1>

              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
                Create reusable scenarios, organize portable demo identities, and open role experiences without mixing demonstration data with production activity.
              </p>
            </div>

            <span className="w-fit rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-600">
              Owner only
            </span>
          </div>
        </header>

        <section className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Demo groups
            </p>
            <p className="mt-2 text-3xl font-bold text-slate-950">
              {result.groups.length}
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Active groups
            </p>
            <p className="mt-2 text-3xl font-bold text-emerald-700">
              {activeGroupCount}
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Demo profiles
            </p>
            <p className="mt-2 text-3xl font-bold text-blue-700">
              {profileCount}
            </p>
          </div>
        </section>

        <section className="mt-6 rounded-3xl border border-blue-200 bg-blue-50/70 p-5 shadow-sm sm:p-6">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">
            Create scenario
          </p>

          <h2 className="mt-2 text-2xl font-bold text-slate-950">
            Add a reusable demo group
          </h2>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Start with a scenario container, then add customer, business, organization, or Owner identities from its detail page.
          </p>

          <div className="mt-5">
            <CreateDemoGroupForm />
          </div>
        </section>

        <section className="mt-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                Scenario library
              </p>

              <h2 className="mt-2 text-2xl font-bold text-slate-950">
                Reusable Demo Groups
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-600">
                Open a group to manage its identities and launch the Experience Viewer.
              </p>
            </div>

            <span className="rounded-full bg-slate-950 px-3 py-1.5 text-sm font-bold text-white">
              {result.groups.length}
            </span>
          </div>

          {result.error ? (
            <div className="mt-5 rounded-3xl border border-rose-200 bg-rose-50 p-5">
              <p className="font-bold text-rose-950">
                Demo groups could not be loaded
              </p>
              <p className="mt-2 text-sm text-rose-800">
                {result.error}
              </p>
            </div>
          ) : result.groups.length === 0 ? (
            <div className="mt-5 rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center">
              <p className="font-bold text-slate-950">
                No demo groups yet
              </p>
              <p className="mt-2 text-sm text-slate-600">
                Use the form above to create the first reusable scenario.
              </p>
            </div>
          ) : (
            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              {result.groups.map((group) => (
                <DemoGroupCard key={group.id} group={group} />
              ))}
            </div>
          )}
        </section>

        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
            Separation rule
          </p>

          <h2 className="mt-2 text-xl font-bold text-slate-950">
            Demo data remains isolated
          </h2>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Demo Groups and Demo Profiles organize reusable scenarios, while each linked profile retains its explicit demo classification. Production reporting and customer activity should never include these records unless a report deliberately requests demo data.
          </p>
        </section>
      </div>
    </main>
  )
}

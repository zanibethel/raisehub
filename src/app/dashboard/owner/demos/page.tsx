import Link from 'next/link'
import { redirect } from 'next/navigation'

import CreateDemoGroupForm from '@/components/dashboards/owner/create-demo-group-form'
import DemoBusinessLogoManager from '@/components/dashboards/owner/demo-business-logo-manager'
import SeedCuratedDemoButton from '@/components/dashboards/owner/seed-curated-demo-button'
import {
  getDemoGroups,
  type DemoGroupSummary,
} from '@/lib/repositories/demo-platform-repository'
import { createClient } from '@/lib/supabase/server'

export const metadata = {
  title: 'Demo Center | RaiseHub Owner Console',
}

const CURATED_GROUP_KEY = 'lakeview_launch_2026'

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
  compact = false,
}: {
  group: DemoGroupSummary
  compact?: boolean
}) {
  return (
    <Link
      href={`/dashboard/owner/demo-groups/${encodeURIComponent(group.groupKey)}`}
      className={`group flex min-w-0 flex-col border border-slate-200 bg-white shadow-sm transition hover:border-blue-300 hover:shadow-md ${
        compact ? 'rounded-2xl p-4' : 'rounded-3xl p-5 sm:p-6'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className={`${compact ? 'text-lg' : 'text-2xl'} break-words font-bold text-slate-950`}>
              {group.name}
            </h3>
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
        <span className="flex h-11 min-w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-950 px-2 text-base font-bold text-white">
          {group.profileCount}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
        <span className="text-xs font-semibold text-slate-500">
          {group.scenarioType} · Updated {formatDate(group.updatedAt)}
        </span>
        <span className="flex items-center gap-2 text-sm font-bold text-blue-700">
          {group.groupKey === CURATED_GROUP_KEY ? 'Open Lakeview demo' : 'Manage group'}
          <span aria-hidden="true" className="transition group-hover:translate-x-0.5">→</span>
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

  if (authError || !user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single<ActorProfile>()

  if (!profile || profile.role !== 'owner') redirect('/dashboard')

  const result = await getDemoGroups()
  const curatedGroup = result.groups.find((group) => group.groupKey === CURATED_GROUP_KEY)
  const legacyGroups = result.groups.filter((group) => group.groupKey !== CURATED_GROUP_KEY)
  const profileCount = result.groups.reduce((total, group) => total + group.profileCount, 0)
  const activeGroupCount = result.groups.filter((group) => group.status === 'active').length

  return (
    <main className="min-h-screen bg-[#F0F6FF] px-4 py-5 sm:px-8 sm:py-8">
      <div className="mx-auto max-w-7xl">
        <header className="rounded-3xl border border-slate-200 bg-white p-5 shadow-lg sm:p-7">
          <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-bold text-blue-700">
            <span aria-hidden="true">←</span>
            Owner dashboard
          </Link>
          <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">Demo Platform</p>
              <h1 className="mt-2 text-3xl font-bold text-slate-950 sm:text-4xl">Demo Center</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
                Launch the curated story first. Keep QA and legacy scenarios available without letting them dominate the workspace.
              </p>
            </div>
            <span className="w-fit rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-600">Owner only</span>
          </div>
        </header>

        <section className="mt-4 grid grid-cols-3 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {[
            ['Groups', result.groups.length],
            ['Active', activeGroupCount],
            ['Profiles', profileCount],
          ].map(([label, value], index) => (
            <div key={label} className={`p-4 text-center ${index > 0 ? 'border-l border-slate-200' : ''}`}>
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 sm:text-xs">{label}</p>
              <p className="mt-1 text-2xl font-bold text-slate-950 sm:text-3xl">{value}</p>
            </div>
          ))}
        </section>

        {result.error ? (
          <section className="mt-5 rounded-3xl border border-rose-200 bg-rose-50 p-5">
            <p className="font-bold text-rose-950">Demo groups could not be loaded</p>
            <p className="mt-2 text-sm text-rose-800">{result.error}</p>
          </section>
        ) : curatedGroup ? (
          <section className="mt-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">Primary demo</p>
                <h2 className="mt-1 text-2xl font-bold text-slate-950">Ready to present</h2>
              </div>
              <Link
                href={`/dashboard/owner/demo-groups/${CURATED_GROUP_KEY}`}
                className="rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-blue-800"
              >
                Launch roles
              </Link>
            </div>
            <DemoGroupCard group={curatedGroup} />
            <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-bold text-amber-950">Repair or refresh Lakeview</p>
                  <p className="mt-1 text-sm text-amber-800">Rerun the safe seeder only when the connected story needs repair.</p>
                </div>
                <SeedCuratedDemoButton />
              </div>
            </div>
          </section>
        ) : (
          <section className="mt-5 rounded-3xl border border-amber-300 bg-amber-50 p-5 shadow-sm sm:p-6">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-800">Guided setup</p>
            <h2 className="mt-2 text-2xl font-bold text-slate-950">Create the complete Lakeview demo</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-700">
              Creates the three demo identities and their connected organization, business, campaign, offer, purchase, pass, saved offer, and redemption.
            </p>
            <div className="mt-5"><SeedCuratedDemoButton /></div>
          </section>
        )}

        <DemoBusinessLogoManager />

        <details className="mt-5 rounded-3xl border border-slate-200 bg-white shadow-sm">
          <summary className="cursor-pointer list-none p-5 sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Test and legacy groups</p>
                <h2 className="mt-1 text-xl font-bold text-slate-950">{legacyGroups.length} additional scenarios</h2>
                <p className="mt-1 text-sm text-slate-600">Open only when doing QA, cleanup, or historical comparison.</p>
              </div>
              <span className="rounded-full bg-slate-950 px-3 py-1.5 text-sm font-bold text-white">Show</span>
            </div>
          </summary>
          <div className="border-t border-slate-200 p-4 sm:p-6">
            {legacyGroups.length === 0 ? (
              <p className="text-sm text-slate-600">No additional scenarios.</p>
            ) : (
              <div className="grid gap-3 lg:grid-cols-2">
                {legacyGroups.map((group) => (
                  <DemoGroupCard key={group.id} group={group} compact />
                ))}
              </div>
            )}
          </div>
        </details>

        <details className="mt-5 rounded-3xl border border-blue-200 bg-blue-50/70 shadow-sm">
          <summary className="cursor-pointer list-none p-5 sm:p-6">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">Advanced</p>
            <h2 className="mt-1 text-xl font-bold text-slate-950">Create a custom demo group</h2>
            <p className="mt-1 text-sm text-slate-600">Use this only for a new reusable scenario outside Lakeview.</p>
          </summary>
          <div className="border-t border-blue-200 p-5 sm:p-6">
            <CreateDemoGroupForm />
          </div>
        </details>
      </div>
    </main>
  )
}

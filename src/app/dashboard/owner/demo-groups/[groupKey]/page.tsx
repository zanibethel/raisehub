import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'

import CreateDemoProfileForm from '@/components/dashboards/owner/create-demo-profile-form'
import {
  getDemoGroupDetails,
  type DemoProfileSummary,
} from '@/lib/repositories/demo-platform-repository'
import { createClient } from '@/lib/supabase/server'

type DemoGroupPageProps = {
  params: Promise<{
    groupKey: string
  }>
}

type ActorProfile = {
  role: string
}

type RewardDemoCardDefinition = {
  email: string
  eyebrow: string
  title: string
  description: string
  action: string
  tone: 'emerald' | 'blue' | 'amber' | 'violet'
}

const LAKEVIEW_REWARD_DEMO_CARDS: RewardDemoCardDefinition[] = [
  {
    email: 'business.demo@raisehub.app',
    eyebrow: 'Partner Rewards · Profile completion',
    title: 'Maple Street Coffee Co.',
    description:
      'Open the business workspace, review the Rewards Center, then complete the intentionally unfinished profile requirement and confirm the +100 profile-completion reward is reconciled once.',
    action: 'Test profile rewards',
    tone: 'emerald',
  },
  {
    email: 'homeservice.demo@raisehub.app',
    eyebrow: 'Partner Rewards · Marketplace',
    title: 'BrightSide Home Services',
    description:
      'Review points derived from real demo offer history, then test spending 250 eligible Partner Points on the 30-day Extra Offer Slot benefit.',
    action: 'Test rewards marketplace',
    tone: 'blue',
  },
  {
    email: 'organization.demo@raisehub.app',
    eyebrow: 'Fundraiser experience',
    title: 'Lakeview Elementary PTA',
    description:
      'Preview the connected organization experience and verify the demo campaign side of the Lakeview ecosystem.',
    action: 'Open organization demo',
    tone: 'violet',
  },
  {
    email: 'supporter.demo@raisehub.app',
    eyebrow: 'Supporter experience',
    title: 'Maya Thompson',
    description:
      'Preview the supporter journey with a purchased pass, saved offers, and connected Lakeview activity.',
    action: 'Open supporter demo',
    tone: 'amber',
  },
]

function getRoleTone(role: string) {
  switch (role) {
    case 'business':
      return 'bg-emerald-100 text-emerald-700'
    case 'organization':
      return 'bg-blue-100 text-blue-700'
    case 'customer':
      return 'bg-amber-100 text-amber-800'
    case 'owner':
      return 'bg-violet-100 text-violet-700'
    default:
      return 'bg-slate-100 text-slate-700'
  }
}

function getPreviewRole(role: string) {
  switch (role) {
    case 'business':
    case 'organization':
    case 'admin':
      return role
    case 'owner':
      return 'admin'
    case 'customer':
    default:
      return 'customer'
  }
}

function buildPreviewHref(profile: DemoProfileSummary, groupKey: string) {
  if (!profile.profileId) return null

  const params = new URLSearchParams({
    previewRole: getPreviewRole(profile.role),
    subject: profile.profileId,
    group: groupKey,
  })

  return `/dashboard/owner/preview?${params.toString()}`
}

function rewardCardClasses(tone: RewardDemoCardDefinition['tone']) {
  switch (tone) {
    case 'emerald':
      return 'border-emerald-200 bg-emerald-50/70 text-emerald-950'
    case 'blue':
      return 'border-blue-200 bg-blue-50/70 text-blue-950'
    case 'violet':
      return 'border-violet-200 bg-violet-50/70 text-violet-950'
    case 'amber':
    default:
      return 'border-amber-200 bg-amber-50/70 text-amber-950'
  }
}

function RewardDemoCard({
  definition,
  profile,
  groupKey,
}: {
  definition: RewardDemoCardDefinition
  profile: DemoProfileSummary | null
  groupKey: string
}) {
  const href = profile ? buildPreviewHref(profile, groupKey) : null
  const isReady = Boolean(href) && profile?.status === 'active'

  return (
    <article
      className={`rounded-2xl border p-5 shadow-sm ${rewardCardClasses(definition.tone)}`}
    >
      <p className="text-[11px] font-black uppercase tracking-[0.14em] opacity-70">
        {definition.eyebrow}
      </p>
      <h3 className="mt-2 text-xl font-black">{definition.title}</h3>
      <p className="mt-2 text-sm leading-6 opacity-80">{definition.description}</p>

      {isReady && href ? (
        <Link
          href={href}
          className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700"
        >
          {definition.action} →
        </Link>
      ) : (
        <p className="mt-5 text-sm font-bold opacity-70">
          Demo identity needs setup before this experience can open.
        </p>
      )}
    </article>
  )
}

function DemoProfileRow({
  profile,
  groupKey,
}: {
  profile: DemoProfileSummary
  groupKey: string
}) {
  const isLinked = Boolean(profile.profileId)
  const isActive = profile.status === 'active'
  const isReady = isLinked && isActive
  const previewHref = buildPreviewHref(profile, groupKey)

  return (
    <article className="min-w-0 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm sm:px-5">
      <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h2 className="min-w-0 break-words font-bold text-slate-950">
              {profile.label}
            </h2>

            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${getRoleTone(profile.role)}`}
            >
              {profile.role === 'customer' ? 'supporter' : profile.role}
            </span>

            {profile.isPrimary ? (
              <span className="shrink-0 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-700">
                Primary
              </span>
            ) : null}

            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                isReady
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              {isReady ? 'Ready' : 'Needs setup'}
            </span>
          </div>

          <div className="mt-2 min-w-0 space-y-0.5">
            <p className="break-words text-sm font-medium text-slate-700">
              {profile.displayName ?? 'No linked display name'}
            </p>

            <p className="break-all text-xs text-slate-400">
              {profile.email ?? 'No linked authentication identity'}
            </p>

            {!isReady ? (
              <p className="pt-1 text-xs font-medium text-amber-700">
                {!isLinked
                  ? 'Next action: link this demo profile to an authentication identity.'
                  : 'Next action: activate this profile before previewing it.'}
              </p>
            ) : null}
          </div>
        </div>

        {previewHref && isActive ? (
          <Link
            href={previewHref}
            className="inline-flex w-fit shrink-0 items-center justify-center rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700"
          >
            Open viewer →
          </Link>
        ) : (
          <span className="shrink-0 text-sm font-medium text-amber-700">
            Preview unavailable
          </span>
        )}
      </div>
    </article>
  )
}

export default async function DemoGroupPage({
  params,
}: DemoGroupPageProps) {
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

  const { groupKey } = await params
  const result = await getDemoGroupDetails(groupKey)

  if (
    result.error === 'Demo group not found.' ||
    !result.details
  ) {
    notFound()
  }

  const { group, profiles } = result.details
  const readyProfiles = profiles.filter(
    (demoProfile) =>
      Boolean(demoProfile.profileId) && demoProfile.status === 'active'
  ).length
  const isLakeview = group.groupKey === 'lakeview_launch_2026'
  const profilesByEmail = new Map(
    profiles
      .filter((demoProfile) => Boolean(demoProfile.email))
      .map((demoProfile) => [demoProfile.email?.toLowerCase(), demoProfile])
  )

  return (
    <div className="w-full overflow-x-clip">
      <main className="mx-auto w-full min-w-0 max-w-4xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
        <Link
          href="/dashboard/owner/demos"
          className="inline-flex max-w-full items-center break-words text-sm font-semibold text-blue-700 hover:text-blue-900"
        >
          ← Back to Demo Center
        </Link>

        <section className="min-w-0 overflow-hidden rounded-3xl border border-slate-200 bg-slate-950 p-6 text-white shadow-xl sm:p-8">
          <div className="flex min-w-0 flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-300">
                Demo Group
              </p>

              <div className="mt-3 flex min-w-0 flex-wrap items-center gap-2">
                <h1 className="min-w-0 break-words text-3xl font-bold">
                  {group.name}
                </h1>

                {group.isDefault ? (
                  <span className="shrink-0 rounded-full bg-blue-400/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-blue-200">
                    Default
                  </span>
                ) : null}
              </div>

              <p className="mt-3 max-w-2xl break-words text-sm leading-6 text-slate-300">
                {group.description ?? 'Reusable RaiseHub demo scenario.'}
              </p>
            </div>

            <div className="grid w-fit shrink-0 grid-cols-2 gap-2 text-center">
              <div className="rounded-2xl bg-white/10 px-4 py-3">
                <p className="text-2xl font-bold">{profiles.length}</p>
                <p className="text-xs text-slate-300">Profiles</p>
              </div>
              <div className="rounded-2xl bg-emerald-400/10 px-4 py-3">
                <p className="text-2xl font-bold text-emerald-200">
                  {readyProfiles}
                </p>
                <p className="text-xs text-slate-300">Ready</p>
              </div>
            </div>
          </div>
        </section>

        {result.error ? (
          <section className="min-w-0 overflow-hidden rounded-2xl border border-rose-200 bg-rose-50 p-5">
            <p className="break-words font-bold text-rose-900">
              Some demo information could not be loaded
            </p>
            <p className="mt-1 break-words text-sm text-rose-700">
              {result.error}
            </p>
          </section>
        ) : null}

        {isLakeview ? (
          <section className="rounded-3xl border border-blue-200 bg-white p-5 shadow-sm sm:p-6">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-700">
                Guided Demo Access
              </p>
              <h2 className="mt-2 text-2xl font-black text-slate-950">
                Choose a Lakeview experience
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                These shortcuts open the exact prepared demo identity in the existing Owner Experience Viewer. Your Owner authorization stays unchanged while the workspace renders that demo user&apos;s data.
              </p>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {LAKEVIEW_REWARD_DEMO_CARDS.map((definition) => (
                <RewardDemoCard
                  key={definition.email}
                  definition={definition}
                  profile={profilesByEmail.get(definition.email) ?? null}
                  groupKey={group.groupKey}
                />
              ))}
            </div>
          </section>
        ) : null}

        <CreateDemoProfileForm groupKey={group.groupKey} />

        <section className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-end justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-700">
                Demo Profiles
              </p>
              <h2 className="mt-1 break-words text-2xl font-bold text-slate-950">
                Choose an experience
              </h2>
              <p className="mt-1 break-words text-sm text-slate-600">
                Open a ready identity in the Experience Viewer or follow the next action shown for incomplete profiles.
              </p>
            </div>

            <span className="shrink-0 rounded-full bg-slate-950 px-3 py-1.5 text-sm font-bold text-white">
              {readyProfiles}/{profiles.length} ready
            </span>
          </div>

          {profiles.length === 0 ? (
            <div className="mt-4 min-w-0 overflow-hidden rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center sm:p-8">
              <p className="break-words font-bold text-slate-900">
                No identities in this group
              </p>
              <p className="mt-1 break-words text-sm text-slate-600">
                Create the first portable identity above, then link it to a full RaiseHub experience.
              </p>
            </div>
          ) : (
            <div className="mt-4 min-w-0 space-y-3">
              {profiles.map((demoProfile) => (
                <DemoProfileRow
                  key={demoProfile.id}
                  profile={demoProfile}
                  groupKey={group.groupKey}
                />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

import Link from 'next/link'
import { notFound } from 'next/navigation'

import {
  getDemoGroupDetails,
  type DemoProfileSummary,
} from '@/lib/repositories/demo-platform-repository'

// =============================================================================
// Types
// =============================================================================

type DemoGroupPageProps = {
  params: Promise<{
    groupKey: string
  }>
}

// =============================================================================
// Helpers
// =============================================================================

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

function DemoProfileRow({
  profile,
}: {
  profile: DemoProfileSummary
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm sm:px-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate font-bold text-slate-950">
              {profile.label}
            </h2>

            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${getRoleTone(profile.role)}`}
            >
              {profile.role}
            </span>

            {profile.isPrimary ? (
              <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-700">
                Primary
              </span>
            ) : null}

            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
              {profile.status}
            </span>
          </div>

          <div className="mt-2 space-y-0.5">
            <p className="truncate text-sm font-medium text-slate-700">
              {profile.displayName ??
                'No linked display name'}
            </p>

            <p className="truncate text-xs text-slate-400">
              {profile.email ??
                'No linked email'}
            </p>
          </div>
        </div>

        {profile.profileId ? (
          <Link
            href={`/dashboard/owner?previewRole=${encodeURIComponent(
              profile.role
            )}&subject=${encodeURIComponent(
              profile.profileId
            )}#owner-role-preview`}
            className="inline-flex shrink-0 items-center justify-center rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700"
          >
            Open →
          </Link>
        ) : (
          <span className="shrink-0 text-sm font-medium text-amber-700">
            Not linked
          </span>
        )}
      </div>
    </article>
  )
}

// =============================================================================
// Page
// =============================================================================

export default async function DemoGroupPage({
  params,
}: DemoGroupPageProps) {
  const { groupKey } = await params

  const result =
    await getDemoGroupDetails(groupKey)

  if (
    result.error === 'Demo group not found.' ||
    !result.details
  ) {
    notFound()
  }

  const { group, profiles } =
    result.details

  return (
    <main className="mx-auto w-full max-w-4xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
      <Link
        href="/dashboard/owner#owner-demo-groups"
        className="inline-flex text-sm font-semibold text-blue-700 hover:text-blue-900"
      >
        ← Back to Demo Groups
      </Link>

      <section className="rounded-3xl border border-slate-200 bg-slate-950 p-6 text-white shadow-xl sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-300">
              Demo Group
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <h1 className="text-3xl font-bold">
                {group.name}
              </h1>

              {group.isDefault ? (
                <span className="rounded-full bg-blue-400/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-blue-200">
                  Default
                </span>
              ) : null}
            </div>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
              {group.description ??
                'Reusable RaiseHub demo scenario.'}
            </p>
          </div>

          <div className="w-fit rounded-2xl bg-white/10 px-4 py-3 text-center">
            <p className="text-2xl font-bold">
              {profiles.length}
            </p>

            <p className="text-xs text-slate-300">
              Profiles
            </p>
          </div>
        </div>
      </section>

      {result.error ? (
        <section className="rounded-2xl border border-rose-200 bg-rose-50 p-5">
          <p className="font-bold text-rose-900">
            Some demo information could not be loaded
          </p>

          <p className="mt-1 text-sm text-rose-700">
            {result.error}
          </p>
        </section>
      ) : null}

      <section>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-700">
              Demo Profiles
            </p>

            <h2 className="mt-1 text-2xl font-bold text-slate-950">
              Choose an experience
            </h2>

            <p className="mt-1 text-sm text-slate-600">
              Open a linked identity in the Experience Viewer.
            </p>
          </div>

          <span className="rounded-full bg-slate-950 px-3 py-1.5 text-sm font-bold text-white">
            {profiles.length}
          </span>
        </div>

        {profiles.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
            <p className="font-bold text-slate-900">
              No identities in this group
            </p>

            <p className="mt-1 text-sm text-slate-600">
              This group may contain platform test data without a linked user profile.
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {profiles.map((profile) => (
              <DemoProfileRow
                key={profile.id}
                profile={profile}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  )
}

import Link from 'next/link'
import { redirect } from 'next/navigation'

import BusinessDashboard from '@/components/dashboards/business/business-dashboard'
import CustomerDashboard from '@/components/dashboards/customer/customer-dashboard'
import OrganizationDashboard from '@/components/dashboards/organization/organization-dashboard'
import OwnerRoleSwitcher, {
  type PreviewRole,
} from '@/components/dashboards/owner/owner-role-switcher'
import { createClient } from '@/lib/supabase/server'

export const metadata = {
  title: 'Experience Viewer | RaiseHub Owner Console',
}

type PreviewPageProps = {
  searchParams?: Promise<{
    previewRole?: string | string[]
    subject?: string | string[]
    group?: string | string[]
  }>
}

type ActorProfile = {
  role: string
}

type DemoGroup = {
  id: string
  group_key: string
  name: string
}

type DemoSubject = {
  id: string
  demo_group_id: string
  profile_id: string | null
  role: string
  status: string
  label: string
}

const VALID_PREVIEW_ROLES: PreviewRole[] = [
  'customer',
  'business',
  'organization',
]

function resolveSingleValue(
  value?: string | string[]
): string | null {
  const candidate = Array.isArray(value)
    ? value[0]
    : value

  const normalized = candidate?.trim()

  return normalized || null
}

function resolvePreviewRole(
  value?: string | string[]
): PreviewRole {
  const candidate = resolveSingleValue(value)

  return VALID_PREVIEW_ROLES.includes(
    candidate as PreviewRole
  )
    ? (candidate as PreviewRole)
    : 'customer'
}

function subjectMatchesRole(
  subjectRole: string,
  previewRole: PreviewRole
): boolean {
  return subjectRole === previewRole
}

function getPreviewLabel(role: PreviewRole): string {
  switch (role) {
    case 'business':
      return 'Business experience'
    case 'organization':
      return 'Organization experience'
    case 'customer':
    default:
      return 'Supporter experience'
  }
}

function renderPreview(
  role: PreviewRole,
  subjectProfileId: string
) {
  switch (role) {
    case 'business':
      return (
        <BusinessDashboard
          businessLegacyProfileId={subjectProfileId}
        />
      )
    case 'organization':
      return (
        <OrganizationDashboard
          organizationLegacyProfileId={subjectProfileId}
        />
      )
    case 'customer':
    default:
      return (
        <CustomerDashboard
          customerProfileId={subjectProfileId}
        />
      )
  }
}

function buildPreviewHref({
  role,
  subject,
  group,
}: {
  role: string
  subject: string
  group: string
}) {
  const params = new URLSearchParams({
    previewRole: role,
    subject,
    group,
  })

  return `/dashboard/owner/preview?${params.toString()}`
}

export default async function OwnerPreviewPage({
  searchParams,
}: PreviewPageProps) {
  const params = searchParams
    ? await searchParams
    : undefined

  const activeRole = resolvePreviewRole(
    params?.previewRole
  )
  const requestedSubjectId = resolveSingleValue(
    params?.subject
  )
  const requestedGroupKey = resolveSingleValue(
    params?.group
  )

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

  let activeGroup: DemoGroup | null = null
  let activeSubject: DemoSubject | null = null
  let roleProfiles: DemoSubject[] = []

  if (requestedGroupKey) {
    const { data: group } = await supabase
      .from('demo_groups')
      .select('id, group_key, name')
      .eq('group_key', requestedGroupKey)
      .eq('status', 'active')
      .maybeSingle<DemoGroup>()

    activeGroup = group ?? null
  }

  if (activeGroup) {
    const { data: profiles } = await supabase
      .from('demo_profiles')
      .select('id, demo_group_id, profile_id, role, status, label')
      .eq('demo_group_id', activeGroup.id)
      .eq('role', activeRole)
      .eq('status', 'active')
      .not('profile_id', 'is', null)
      .order('is_primary', { ascending: false })
      .order('label', { ascending: true })

    roleProfiles = (profiles ?? []) as DemoSubject[]

    if (requestedSubjectId) {
      activeSubject =
        roleProfiles.find(
          (subject) =>
            subject.profile_id === requestedSubjectId &&
            subjectMatchesRole(subject.role, activeRole)
        ) ?? null
    }
  }

  const activeSubjectId = activeSubject?.profile_id ?? null
  const activeSubjectLabel = activeSubject?.label ?? null
  const returnToGroupHref = activeGroup
    ? `/dashboard/owner/demo-groups/${encodeURIComponent(activeGroup.group_key)}`
    : '/dashboard/owner/demos'

  return (
    <main className="min-h-screen bg-[#F0F6FF] px-4 py-6 sm:px-8 sm:py-10">
      <div className="mx-auto max-w-7xl">
        <section className="rounded-2xl border border-blue-300 bg-blue-950 px-5 py-4 text-white shadow-xl sm:px-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-300">
                Owner Experience Viewer
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold">
                  Role: {getPreviewLabel(activeRole)}
                </span>
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold">
                  Profile: {activeSubjectLabel ?? 'Not selected'}
                </span>
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold">
                  Group: {activeGroup?.name ?? 'Not selected'}
                </span>
                <span className="rounded-full bg-amber-300 px-3 py-1 text-xs font-black text-amber-950">
                  Demonstration data
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href={returnToGroupHref}
                className="rounded-xl bg-white px-3 py-2 text-xs font-bold text-blue-950 hover:bg-blue-50"
              >
                Switch profile
              </Link>
              <a
                href="#switch-role"
                className="rounded-xl border border-white/30 px-3 py-2 text-xs font-bold text-white hover:bg-white/10"
              >
                Switch role
              </a>
              <Link
                href="/dashboard/owner/demos"
                className="rounded-xl border border-white/30 px-3 py-2 text-xs font-bold text-white hover:bg-white/10"
              >
                Return to Demo Center
              </Link>
              <Link
                href="/dashboard"
                className="rounded-xl border border-rose-300 bg-rose-500/15 px-3 py-2 text-xs font-bold text-rose-100 hover:bg-rose-500/25"
              >
                Exit preview
              </Link>
            </div>
          </div>
        </section>

        <header className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-xl sm:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">
                Demo Platform
              </p>
              <h1 className="mt-2 text-3xl font-bold text-slate-950 sm:text-4xl">
                Experience Viewer
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
                Preview a linked demo identity while your authenticated Owner authority remains unchanged.
              </p>
            </div>
            <span className="w-fit rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-600">
              Owner only
            </span>
          </div>
        </header>

        <section id="switch-role" className="mt-6 scroll-mt-24">
          <OwnerRoleSwitcher activeRole={activeRole} />
        </section>

        {activeGroup && roleProfiles.length > 0 ? (
          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                  Profiles in this role
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  Switch identities without leaving {activeGroup.name}.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {roleProfiles.map((subject) => (
                  <Link
                    key={subject.id}
                    href={buildPreviewHref({
                      role: activeRole,
                      subject: subject.profile_id as string,
                      group: activeGroup.group_key,
                    })}
                    className={`rounded-xl px-3 py-2 text-xs font-bold transition ${
                      activeSubject?.id === subject.id
                        ? 'bg-blue-700 text-white'
                        : 'border border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50'
                    }`}
                  >
                    {subject.label}
                  </Link>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {!activeGroup ? (
          <section className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-5">
            <p className="font-bold text-amber-950">
              Select a demo group first
            </p>
            <p className="mt-1 text-sm leading-6 text-amber-800">
              Open a linked profile from Demo Center so the viewer can preserve a specific connected scenario.
            </p>
            <Link
              href="/dashboard/owner/demos"
              className="mt-4 inline-flex rounded-xl bg-amber-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-amber-950"
            >
              Open Demo Center
            </Link>
          </section>
        ) : !activeSubjectId || !activeSubjectLabel ? (
          <section className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-5">
            <p className="font-bold text-amber-950">
              Choose a linked {getPreviewLabel(activeRole).toLowerCase()} profile
            </p>
            <p className="mt-1 text-sm leading-6 text-amber-800">
              The viewer will not fall back to the Owner identity. Select a prepared demo profile before rendering this workspace.
            </p>
            <Link
              href={returnToGroupHref}
              className="mt-4 inline-flex rounded-xl bg-amber-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-amber-950"
            >
              Choose profile
            </Link>
          </section>
        ) : (
          <section className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">
            <div className="border-b border-slate-200 bg-slate-950 px-5 py-4 text-white sm:px-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-300">
                    Controlled preview
                  </p>
                  <h2 className="mt-1 text-xl font-bold">
                    {getPreviewLabel(activeRole)} · {activeSubjectLabel}
                  </h2>
                </div>
                <span className="rounded-full bg-blue-500/15 px-3 py-1.5 text-xs font-bold text-blue-200">
                  Owner session preserved
                </span>
              </div>
            </div>
            <div className="bg-[#F0F6FF] p-4 sm:p-6">
              {renderPreview(activeRole, activeSubjectId)}
            </div>
          </section>
        )}

        <section className="mt-6 rounded-3xl border border-amber-200 bg-amber-50 p-5 sm:p-6">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-800">
            Safety boundary
          </p>
          <h2 className="mt-2 text-xl font-bold text-amber-950">
            Preview does not change authorization
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-amber-900">
            Your saved role remains Owner. The selected identity controls dashboard data presentation only; all authorization continues to follow the real Owner session and existing server-side access rules.
          </p>
        </section>
      </div>
    </main>
  )
}

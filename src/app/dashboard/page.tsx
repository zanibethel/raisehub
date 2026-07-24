import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

import AccountMenu from '@/app/components/account-menu'
import BusinessWorkspaceHeader from '@/components/dashboard/business-workspace-header'
import AdminDashboard from '@/components/dashboards/admin/admin-dashboard'
import BusinessDashboard from '@/components/dashboards/business/business-dashboard'
import CustomerDashboard from '@/components/dashboards/customer/customer-dashboard'
import SupporterGrowthLinks from '@/components/dashboards/customer/supporter-growth-links'
import OrganizationDashboard from '@/components/dashboards/organization/organization-dashboard'
import OwnerDashboard from '@/components/dashboards/owner/owner-dashboard'
import {
  resolveWorkspaceSelection,
  type DashboardExperienceRole,
} from '@/lib/rules/workspace-selection-rules'
import { getAuthenticatedWorkspaces } from '@/lib/services/authenticated-workspace-service'
import { createClient } from '@/lib/supabase/server'
import type {
  LegacyProfileRole,
  SelectableWorkspace,
} from '@/lib/types/identity-access'

type Profile = { id: string; email: string | null; role: LegacyProfileRole }
type BusinessHeaderProfile = {
  business_name: string | null
  display_name: string | null
  phone: string | null
  address: string | null
  google_maps_url: string | null
  logo_url: string | null
  website_url: string | null
}
type DashboardPageProps = {
  searchParams?: Promise<{ workspace?: string | string[] }>
}
type RoleTheme = {
  title: string
  badge: string
  badgeClass: string
  headingClass: string
  panelClass: string
  intro: string
}

const WORKSPACE_PREFERENCE_COOKIE = 'raisehub-selected-workspace'

function hasRequestedWorkspace(value?: string | string[]) {
  return Array.isArray(value) ? value.length > 0 : value !== undefined
}

function getRoleTheme(role: DashboardExperienceRole): RoleTheme {
  if (role === 'business') {
    return {
      title: 'Business Dashboard',
      badge: 'Business',
      badgeClass: 'border border-green-200 bg-green-50 text-green-700',
      headingClass: 'text-green-700',
      panelClass: 'border border-green-100 bg-white/90 shadow-xl backdrop-blur',
      intro: 'Manage offers, track redemptions, and grow local visibility.',
    }
  }
  if (role === 'organization') {
    return {
      title: 'Organization Dashboard',
      badge: 'Organization',
      badgeClass: 'border border-blue-200 bg-blue-50 text-blue-700',
      headingClass: 'text-blue-700',
      panelClass: 'border border-blue-100 bg-white/90 shadow-xl backdrop-blur',
      intro: 'Track fundraising progress, supporters, and business partners.',
    }
  }
  if (role === 'admin') {
    return {
      title: 'Admin Dashboard',
      badge: 'Admin',
      badgeClass: 'border border-gray-300 bg-gray-100 text-gray-800',
      headingClass: 'text-gray-800',
      panelClass: 'border border-gray-200 bg-white/90 shadow-xl backdrop-blur',
      intro: 'Manage platform activity, users, and campaigns.',
    }
  }
  if (role === 'owner') {
    return {
      title: 'RaiseHub Platform Console',
      badge: 'Owner',
      badgeClass: 'border border-slate-700 bg-slate-950 text-blue-200',
      headingClass: 'text-slate-950',
      panelClass: 'border border-slate-200 bg-white/95 shadow-xl backdrop-blur',
      intro: 'Run the platform, test role experiences, and assist RaiseHub clients.',
    }
  }
  return {
    title: 'Supporter Dashboard',
    badge: 'Supporter',
    badgeClass: 'border border-yellow-200 bg-yellow-50 text-yellow-700',
    headingClass: 'text-yellow-600',
    panelClass: 'border border-yellow-100 bg-white/90 shadow-xl backdrop-blur',
    intro: 'View your passes, savings, and favorite local businesses.',
  }
}

function WorkspaceUnavailable({ workspace }: { workspace: SelectableWorkspace }) {
  return (
    <section className="mt-6 rounded-3xl border border-amber-200 bg-amber-50 p-6">
      <p className="text-sm font-semibold uppercase tracking-wide text-amber-700">
        Workspace unavailable
      </p>
      <h2 className="mt-2 text-xl font-bold text-gray-900">
        {workspace.name} is not connected yet
      </h2>
      <p className="mt-2 text-sm leading-6 text-gray-600">
        Your access is recognized, but this workspace does not yet have the legacy
        account connection required by the current dashboard. No unrelated account
        data was loaded.
      </p>
    </section>
  )
}

function renderDashboard(
  role: DashboardExperienceRole,
  selectedWorkspace: SelectableWorkspace | null
) {
  if (role === 'owner') return <OwnerDashboard />
  if (role === 'admin') return <AdminDashboard />
  if (role === 'business') {
    if (
      selectedWorkspace?.kind === 'business' &&
      !selectedWorkspace.legacyProfileId
    ) {
      return <WorkspaceUnavailable workspace={selectedWorkspace} />
    }
    return (
      <BusinessDashboard
        businessLegacyProfileId={
          selectedWorkspace?.kind === 'business'
            ? selectedWorkspace.legacyProfileId
            : null
        }
      />
    )
  }
  if (role === 'organization') {
    if (
      selectedWorkspace &&
      (selectedWorkspace.kind === 'organization' ||
        selectedWorkspace.kind === 'fundraising') &&
      !selectedWorkspace.legacyProfileId
    ) {
      return <WorkspaceUnavailable workspace={selectedWorkspace} />
    }
    return (
      <OrganizationDashboard
        organizationLegacyProfileId={
          selectedWorkspace?.kind === 'organization' ||
          selectedWorkspace?.kind === 'fundraising'
            ? selectedWorkspace.legacyProfileId
            : null
        }
      />
    )
  }
  return <CustomerDashboard />
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const savedWorkspaceKey =
    (await cookies()).get(WORKSPACE_PREFERENCE_COOKIE)?.value.trim() || undefined
  const requestedWorkspace = hasRequestedWorkspace(resolvedSearchParams?.workspace)
    ? resolvedSearchParams?.workspace
    : savedWorkspaceKey

  const [{ data: profile }, authenticatedWorkspacesResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, email, role')
      .eq('id', user.id)
      .single<Profile>(),
    getAuthenticatedWorkspaces(),
  ])

  if (!authenticatedWorkspacesResult.success) {
    console.error(
      'Unable to load authenticated workspaces:',
      authenticatedWorkspacesResult.reason
    )
  }

  const availableWorkspaces = authenticatedWorkspacesResult.success
    ? authenticatedWorkspacesResult.workspaces
    : []
  const workspaceSelection = resolveWorkspaceSelection({
    requestedWorkspace,
    workspaces: availableWorkspaces,
    legacyRole: profile?.role ?? 'customer',
  })
  const selectedWorkspace = workspaceSelection.selectedWorkspace
  const experienceRole = workspaceSelection.experienceRole
  const theme = getRoleTheme(experienceRole)
  const hasBusinessWorkspace = availableWorkspaces.some(
    (workspace) => workspace.kind === 'business'
  )
  const hasOrganizationWorkspace = availableWorkspaces.some(
    (workspace) =>
      workspace.kind === 'organization' || workspace.kind === 'fundraising'
  )
  const businessLegacyProfileId =
    experienceRole === 'business'
      ? selectedWorkspace?.kind === 'business'
        ? selectedWorkspace.legacyProfileId
        : user.id
      : null

  let businessHeaderProfile: BusinessHeaderProfile | null = null
  if (experienceRole === 'business' && businessLegacyProfileId) {
    const { data } = await supabase
      .from('profiles')
      .select(
        'business_name, display_name, phone, address, google_maps_url, logo_url, website_url'
      )
      .eq('id', businessLegacyProfileId)
      .maybeSingle<BusinessHeaderProfile>()
    businessHeaderProfile = data
  }

  const accountEmail = user.email ?? profile?.email ?? null

  return (
    <main
      className="min-h-screen bg-[#F0F6FF] p-4 sm:p-8"
      data-available-workspace-count={availableWorkspaces.length}
      data-selected-workspace-key={selectedWorkspace?.key ?? ''}
    >
      <div
        className={`mx-auto ${
          experienceRole === 'owner' ? 'max-w-7xl' : 'max-w-5xl'
        }`}
      >
        {experienceRole === 'business' && businessHeaderProfile ? (
          <BusinessWorkspaceHeader
            businessLegacyProfileId={businessLegacyProfileId}
            businessName={businessHeaderProfile.business_name ?? ''}
            displayName={businessHeaderProfile.display_name ?? ''}
            phone={businessHeaderProfile.phone ?? ''}
            address={businessHeaderProfile.address ?? ''}
            googleMapsUrl={businessHeaderProfile.google_maps_url ?? ''}
            logoUrl={businessHeaderProfile.logo_url ?? ''}
            websiteUrl={businessHeaderProfile.website_url ?? ''}
            subtitle={selectedWorkspace?.subtitle ?? theme.intro}
            badgeClass={theme.badgeClass}
            headingClass={theme.headingClass}
            panelClass={theme.panelClass}
            email={accountEmail}
            workspaces={availableWorkspaces}
            selectedWorkspaceKey={workspaceSelection.selectedWorkspaceKey}
          />
        ) : (
          <header
            className={`relative z-50 min-w-0 overflow-visible rounded-3xl p-6 sm:p-8 ${theme.panelClass}`}
          >
            <div className="flex min-w-0 flex-col items-stretch gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div
                className={`inline-flex w-fit rounded-full px-3 py-1 text-sm font-medium ${theme.badgeClass}`}
              >
                {theme.badge}
              </div>
              <div
                className={`min-w-0 max-w-full ${
                  experienceRole === 'customer'
                    ? 'supporter-account-menu'
                    : ''
                }`}
              >
                <AccountMenu
                  email={accountEmail}
                  workspaces={availableWorkspaces}
                  selectedWorkspaceKey={workspaceSelection.selectedWorkspaceKey}
                />
              </div>
            </div>
            <div className="mt-5 min-w-0">
              <h1 className={`break-words text-3xl font-bold ${theme.headingClass}`}>
                {selectedWorkspace?.name ?? theme.title}
              </h1>
              <p className="mt-2 text-gray-600">
                {selectedWorkspace?.subtitle ?? theme.intro}
              </p>
            </div>
          </header>
        )}

        <div className="relative z-0">
          {renderDashboard(experienceRole, selectedWorkspace)}
        </div>

        {experienceRole === 'customer' ? (
          <SupporterGrowthLinks
            showBusinessLink={!hasBusinessWorkspace}
            showOrganizationLink={!hasOrganizationWorkspace}
          />
        ) : null}
      </div>

      {experienceRole === 'customer' ? (
        <style>{`
          .supporter-account-menu summary > span:first-child {
            font-size: 0;
          }

          .supporter-account-menu summary > span:first-child::after {
            content: 'S';
            font-size: 0.875rem;
          }
        `}</style>
      ) : null}
    </main>
  )
}

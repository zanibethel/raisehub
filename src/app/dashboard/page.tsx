import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

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
type DashboardPageProps = {
  searchParams?: Promise<{ workspace?: string | string[] }>
}

const WORKSPACE_PREFERENCE_COOKIE = 'raisehub-selected-workspace'

function hasRequestedWorkspace(value?: string | string[]) {
  return Array.isArray(value) ? value.length > 0 : value !== undefined
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
  const {
    data: { user },
  } = await supabase.auth.getUser()
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
  const hasBusinessWorkspace = availableWorkspaces.some(
    (workspace) => workspace.kind === 'business'
  )
  const hasOrganizationWorkspace = availableWorkspaces.some(
    (workspace) =>
      workspace.kind === 'organization' || workspace.kind === 'fundraising'
  )

  return (
    <main
      className="min-h-screen bg-[#F0F6FF]"
      data-available-workspace-count={availableWorkspaces.length}
      data-selected-workspace-key={selectedWorkspace?.key ?? ''}
    >
      <div
        className={`mx-auto p-4 sm:p-8 ${
          experienceRole === 'owner' ? 'max-w-7xl' : 'max-w-5xl'
        }`}
      >
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
    </main>
  )
}

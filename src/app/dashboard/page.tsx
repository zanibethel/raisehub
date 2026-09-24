import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

import AdminDashboard from '@/components/dashboards/admin/admin-dashboard'
import BusinessDashboard from '@/components/dashboards/business/business-dashboard'
import CustomerDashboard from '@/components/dashboards/customer/customer-dashboard'
import OrganizationDashboard from '@/components/dashboards/organization/organization-dashboard'
import OwnerDashboard from '@/components/dashboards/owner/owner-dashboard'
import SpotlightCarousel from '@/components/spotlights/spotlight-carousel'
import { getAppMode } from '@/lib/app-mode'
import {
  resolveWorkspaceSelection,
  type DashboardExperienceRole,
} from '@/lib/rules/workspace-selection-rules'
import { resolveWorkspaceEnvironment } from '@/lib/rules/workspace-environment-rules'
import { getAuthenticatedWorkspaces } from '@/lib/services/authenticated-workspace-service'
import { getEligibleSpotlights } from '@/lib/spotlights/spotlight-service'
import { createClient } from '@/lib/supabase/server'
import type {
  LegacyProfileRole,
  SelectableWorkspace,
} from '@/lib/types/identity-access'

type Profile = {
  id: string
  email: string | null
  role: LegacyProfileRole
  is_demo: boolean | null
  demo_group: string | null
}

type DashboardPageProps = {
  searchParams?: Promise<{ workspace?: string | string[] }>
}

const WORKSPACE_PREFERENCE_COOKIE = 'raisehub-selected-workspace'

function hasRequestedWorkspace(value?: string | string[]) {
  return Array.isArray(value) ? value.length > 0 : value !== undefined
}

function renderDashboard(
  role: DashboardExperienceRole,
  selectedWorkspace: SelectableWorkspace | null
) {
  if (role === 'owner') return <OwnerDashboard />
  if (role === 'admin') return <AdminDashboard />
  if (role === 'business') {
    return (
      <BusinessDashboard
        businessId={
          selectedWorkspace?.kind === 'business'
            ? selectedWorkspace.workspaceId
            : null
        }
        businessLegacyProfileId={
          selectedWorkspace?.kind === 'business'
            ? selectedWorkspace.legacyProfileId
            : null
        }
      />
    )
  }
  if (role === 'organization') {
    return (
      <OrganizationDashboard
        organizationId={
          selectedWorkspace?.kind === 'organization' ||
          selectedWorkspace?.kind === 'fundraising'
            ? selectedWorkspace.workspaceId
            : null
        }
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

  const workspaceEnvironment = resolveWorkspaceEnvironment(getAppMode())
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const savedWorkspaceKey =
    (await cookies()).get(WORKSPACE_PREFERENCE_COOKIE)?.value.trim() || undefined
  const requestedWorkspace = hasRequestedWorkspace(resolvedSearchParams?.workspace)
    ? resolvedSearchParams?.workspace
    : savedWorkspaceKey

  const [{ data: profile }, authenticatedWorkspacesResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, email, role, is_demo, demo_group')
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
  const spotlightWorkspaceKey = selectedWorkspace?.key ?? `${experienceRole}:default`
  let spotlights: Awaited<ReturnType<typeof getEligibleSpotlights>> = []
  try {
    spotlights = await getEligibleSpotlights({
      userId: user.id,
      experienceRole,
      selectedWorkspace,
      isDemo: profile?.is_demo === true,
    })
  } catch (error) {
    console.error('Unable to load spotlights without blocking dashboard:', error)
  }

  return (
    <main
      className="min-h-screen bg-[#F0F6FF]"
      data-app-mode={workspaceEnvironment.mode}
      data-workspace-environment={workspaceEnvironment.label}
      data-uses-sample-data={workspaceEnvironment.usesSampleData}
      data-allows-real-payments={workspaceEnvironment.allowsRealPayments}
      data-available-workspace-count={availableWorkspaces.length}
      data-selected-workspace-key={selectedWorkspace?.key ?? ''}
    >
      <SpotlightCarousel campaigns={spotlights} workspaceKey={spotlightWorkspaceKey} />
      <div
        className={`mx-auto p-4 sm:p-8 ${
          experienceRole === 'owner' ? 'max-w-7xl' : 'max-w-5xl'
        }`}
      >
        <div className="relative z-0">
          {renderDashboard(experienceRole, selectedWorkspace)}
        </div>
      </div>
    </main>
  )
}

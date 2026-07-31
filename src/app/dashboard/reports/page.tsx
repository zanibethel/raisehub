import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

import BusinessDashboard from '@/components/dashboards/business/business-dashboard'
import OrganizationDashboard from '@/components/dashboards/organization/organization-dashboard'
import { resolveWorkspaceSelection } from '@/lib/rules/workspace-selection-rules'
import { getAuthenticatedWorkspaces } from '@/lib/services/authenticated-workspace-service'
import { createClient } from '@/lib/supabase/server'
import type { LegacyProfileRole } from '@/lib/types/identity-access'

const WORKSPACE_PREFERENCE_COOKIE = 'raisehub-selected-workspace'

type Profile = { role: LegacyProfileRole }

export default async function WorkspaceReportsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const [{ data: profile }, workspacesResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single<Profile>(),
    getAuthenticatedWorkspaces(),
  ])

  const savedWorkspaceKey =
    (await cookies()).get(WORKSPACE_PREFERENCE_COOKIE)?.value.trim() ||
    undefined
  const workspaces = workspacesResult.success
    ? workspacesResult.workspaces
    : []
  const selection = resolveWorkspaceSelection({
    requestedWorkspace: savedWorkspaceKey,
    workspaces,
    legacyRole: profile?.role ?? 'customer',
  })
  const workspace = selection.selectedWorkspace

  let reports: React.ReactNode = null

  if (selection.experienceRole === 'business') {
    reports = (
      <BusinessDashboard
        view="reports"
        businessLegacyProfileId={
          workspace?.kind === 'business'
            ? workspace.legacyProfileId
            : null
        }
      />
    )
  } else if (
    selection.experienceRole === 'organization' &&
    workspace &&
    (workspace.kind === 'organization' ||
      workspace.kind === 'fundraising')
  ) {
    reports = (
      <OrganizationDashboard
        view="reports"
        organizationLegacyProfileId={workspace.legacyProfileId}
      />
    )
  } else {
    redirect('/dashboard')
  }

  return (
    <main className="min-h-screen bg-[#F0F6FF]">
      <div className="mx-auto max-w-5xl p-4 sm:p-8">
        {reports}
      </div>
    </main>
  )
}

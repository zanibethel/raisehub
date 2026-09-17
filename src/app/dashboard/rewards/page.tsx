import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

import BusinessDashboard from '@/components/dashboards/business/business-dashboard'
import { resolveWorkspaceSelection } from '@/lib/rules/workspace-selection-rules'
import { getAuthenticatedWorkspaces } from '@/lib/services/authenticated-workspace-service'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import type { LegacyProfileRole } from '@/lib/types/identity-access'

const WORKSPACE_PREFERENCE_COOKIE = 'raisehub-selected-workspace'

type Profile = { role: LegacyProfileRole }

export default async function BusinessRewardsPage() {
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

  if (selection.experienceRole !== 'business') {
    redirect('/dashboard')
  }

  if (workspace?.kind === 'business' && workspace.workspaceId) {
    const admin = createAdminClient() as any
    await admin.rpc('sync_business_growth_rewards', {
      p_business_id: workspace.workspaceId,
    })
  }

  return (
    <main className="min-h-screen bg-[#F0F6FF]">
      <div className="mx-auto max-w-5xl p-4 sm:p-8">
        <BusinessDashboard
          view="rewards"
          businessId={
            workspace?.kind === 'business'
              ? workspace.workspaceId
              : null
          }
          businessLegacyProfileId={
            workspace?.kind === 'business'
              ? workspace.legacyProfileId
              : null
          }
        />
      </div>
    </main>
  )
}

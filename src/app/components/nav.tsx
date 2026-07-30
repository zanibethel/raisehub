import { cookies } from 'next/headers'

import { isDemoMode } from '@/lib/app-mode'
import { getAuthenticatedWorkspaces } from '@/lib/services/authenticated-workspace-service'
import { createClient } from '@/lib/supabase/server'
import MobileNavEnhancements from './mobile-nav-enhancements'
import NavClient from './nav-client'
import NotificationRefreshBridge from './notification-refresh-bridge'
import AuthenticatedWorkspaceHeader from './authenticated-workspace-header'

const WORKSPACE_PREFERENCE_COOKIE = 'raisehub-selected-workspace'

function workspaceLabel(kind?: string | null) {
  if (kind === 'business') return 'Business'
  if (kind === 'organization') return 'Organization'
  if (kind === 'fundraising') return 'Fundraising'
  if (kind === 'owner') return 'Owner'
  return 'Supporter'
}

export default async function Nav() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const demoMode = isDemoMode()
  let isPublicDemoUser = false
  let profileHref: string | null = '/dashboard#profile'
  let notificationVersion = 'signed-out'
  let authenticatedHeader: React.ReactNode = null

  if (user) {
    const [{ data: profile }, { data: latestNotification }, workspaceResult] =
      await Promise.all([
        supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle(),
        supabase
          .from('notifications')
          .select('id, created_at')
          .eq('user_id', user.id)
          .is('dismissed_at', null)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        getAuthenticatedWorkspaces(),
      ])

    notificationVersion = latestNotification
      ? `${latestNotification.id}:${latestNotification.created_at}`
      : `user:${user.id}`

    if (profile?.role === 'organization') {
      profileHref = '/dashboard/organization/profile'
    } else if (profile?.role === 'business') {
      profileHref = '/dashboard#business-profile'
    } else if (profile?.role === 'owner' || profile?.role === 'admin') {
      profileHref = null
    }

    const workspaces = workspaceResult.success ? workspaceResult.workspaces : []
    const savedWorkspaceKey =
      (await cookies()).get(WORKSPACE_PREFERENCE_COOKIE)?.value.trim() || null
    const selectedWorkspace =
      workspaces.find((workspace) => workspace.key === savedWorkspaceKey) ??
      workspaces.find((workspace) => workspace.isDefault) ??
      workspaces[0] ??
      null

    let logoUrl: string | null = null
    if (selectedWorkspace?.kind === 'business' && selectedWorkspace.legacyProfileId) {
      const { data } = await supabase
        .from('profiles')
        .select('logo_url')
        .eq('id', selectedWorkspace.legacyProfileId)
        .maybeSingle<{ logo_url: string | null }>()
      logoUrl = data?.logo_url ?? null
    }

    authenticatedHeader = (
      <AuthenticatedWorkspaceHeader
        email={user.email ?? null}
        workspaceName={selectedWorkspace?.name ?? 'RaiseHub'}
        workspaceLabel={workspaceLabel(selectedWorkspace?.kind ?? profile?.role)}
        environmentLabel={demoMode ? 'Demo workspace' : 'Live workspace'}
        logoUrl={logoUrl}
        workspaces={workspaces}
        selectedWorkspaceKey={selectedWorkspace?.key ?? null}
        profileHref={profileHref}
      />
    )
  }

  if (demoMode && user?.email) {
    const email = user.email.toLowerCase()

    const publicDemoEmails = [
      process.env.DEMO_CUSTOMER_EMAIL?.toLowerCase(),
      process.env.DEMO_BUSINESS_EMAIL?.toLowerCase(),
      process.env.DEMO_ORGANIZATION_EMAIL?.toLowerCase(),
    ].filter((value): value is string => Boolean(value))

    isPublicDemoUser = publicDemoEmails.includes(email)
  }

  const navUser = user
    ? {
        id: user.id,
        email: user.email ?? null,
      }
    : null

  return (
    <nav
      className="sticky top-0 z-[100] border-b border-gray-200 bg-white/95 shadow-sm backdrop-blur"
      aria-label="Primary navigation"
    >
      {user ? (
        authenticatedHeader
      ) : (
        <div className="mx-auto max-w-5xl">
          <NavClient
            key={notificationVersion}
            user={navUser}
            isDemoMode={demoMode}
            isPublicDemoUser={isPublicDemoUser}
          />
        </div>
      )}

      <MobileNavEnhancements signedIn={Boolean(user)} profileHref={profileHref} />
      {user ? <NotificationRefreshBridge userId={user.id} /> : null}
    </nav>
  )
}

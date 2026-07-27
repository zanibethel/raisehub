import { isDemoMode } from '@/lib/app-mode'
import { createClient } from '@/lib/supabase/server'
import MobileNavEnhancements from './mobile-nav-enhancements'
import NavClient from './nav-client'
import NotificationRefreshBridge from './notification-refresh-bridge'

export default async function Nav() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Determine whether the signed-in user is a public demo account.
  // Only customer, business, and organization accounts are public demos.
  // Owner remains excluded intentionally.
  const demoMode = isDemoMode()
  let isPublicDemoUser = false
  let profileHref: string | null = '/dashboard#profile'
  let notificationVersion = 'signed-out'

  if (user) {
    const [{ data: profile }, { data: latestNotification }] = await Promise.all([
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
    ])

    notificationVersion = latestNotification
      ? `${latestNotification.id}:${latestNotification.created_at}`
      : `user:${user.id}`

    if (profile?.role === 'organization') {
      profileHref = '/dashboard/organization/profile'
    } else if (profile?.role === 'business') {
      profileHref = '/dashboard#business-profile'
    } else if (profile?.role === 'owner' || profile?.role === 'admin') {
      // Owner/Admin profile settings do not have a dedicated route yet.
      // Hide the action rather than sending users to a 404.
      profileHref = null
    }
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
    <nav className="sticky top-0 z-[100] border-b border-gray-200 bg-white/95 shadow-sm backdrop-blur">
      <div className="mx-auto max-w-5xl">
        <NavClient
          key={notificationVersion}
          user={navUser}
          isDemoMode={demoMode}
          isPublicDemoUser={isPublicDemoUser}
        />
      </div>
      <MobileNavEnhancements
        signedIn={Boolean(user)}
        profileHref={profileHref}
      />
      {user ? <NotificationRefreshBridge userId={user.id} /> : null}
    </nav>
  )
}

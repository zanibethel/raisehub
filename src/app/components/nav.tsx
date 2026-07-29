import Link from 'next/link'

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
    <nav className="sticky top-0 z-[100] border-b border-gray-200 bg-white/95 shadow-sm backdrop-blur" aria-label="Primary navigation">
      <div className="mx-auto max-w-5xl">
        <NavClient
          key={notificationVersion}
          user={navUser}
          isDemoMode={demoMode}
          isPublicDemoUser={isPublicDemoUser}
        />
      </div>

      <div className={demoMode ? 'border-t border-green-200 bg-green-50' : 'border-t border-blue-100 bg-blue-50/70'}>
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-2 text-xs sm:text-sm">
          <p className={demoMode ? 'font-semibold text-green-900' : 'font-semibold text-blue-900'}>
            RaiseHub · {demoMode ? 'Interactive Demo' : 'Live Platform'}
            {demoMode ? (
              <span className="ml-2 hidden font-normal text-green-800 md:inline">
                Sample data only. Nothing here affects live organizations.
              </span>
            ) : null}
          </p>

          {demoMode ? (
            <div className="flex shrink-0 items-center gap-3">
              <Link href="https://raisehub.app" className="font-semibold text-blue-700 underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">
                Switch to Live
              </Link>
              <Link href="https://raisehub.app" className="hidden text-gray-600 underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-700 sm:inline">
                Experience Selection
              </Link>
            </div>
          ) : null}
        </div>
      </div>

      <MobileNavEnhancements signedIn={Boolean(user)} profileHref={profileHref} />
      {user ? <NotificationRefreshBridge userId={user.id} /> : null}
    </nav>
  )
}

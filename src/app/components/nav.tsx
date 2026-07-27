import { isDemoMode } from '@/lib/app-mode'
import { createClient } from '@/lib/supabase/server'
import MobileNavEnhancements from './mobile-nav-enhancements'
import NavClient from './nav-client'

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
  let profileHref = '/dashboard#profile'

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    if (profile?.role === 'organization') {
      profileHref = '/dashboard#organization-setup'
    } else if (profile?.role === 'business') {
      profileHref = '/dashboard#business-profile'
    } else if (profile?.role === 'owner' || profile?.role === 'admin') {
      profileHref = '/dashboard/owner/settings'
    }
  }

  if (demoMode && user?.email) {
    const email = user.email.toLowerCase()

    const publicDemoEmails = [
      process.env.DEMO_CUSTOMER_EMAIL?.toLowerCase(),
      process.env.DEMO_BUSINESS_EMAIL?.toLowerCase(),
      process.env.DEMO_ORGANIZATION_EMAIL?.toLowerCase(),
    ].filter(
      (value): value is string =>
        Boolean(value)
    )

    isPublicDemoUser =
      publicDemoEmails.includes(email)
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
          user={navUser}
          isDemoMode={demoMode}
          isPublicDemoUser={isPublicDemoUser}
        />
      </div>
      <MobileNavEnhancements
        signedIn={Boolean(user)}
        profileHref={profileHref}
      />
    </nav>
  )
}

import { createClient } from '@/lib/supabase/server'
import { isDemoMode } from '@/lib/app-mode'
import NavClient from './nav-client'

export default async function Nav() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Determine whether the signed-in user is a public demo account.
  // Only three roles are public (customer, business, organization).
  // Owner is excluded intentionally.
  const demoMode = isDemoMode()
  let isPublicDemoUser = false

  if (demoMode && user?.email) {
    const email = user.email.toLowerCase()
    const publicDemoEmails = [
      process.env.DEMO_CUSTOMER_EMAIL?.toLowerCase(),
      process.env.DEMO_BUSINESS_EMAIL?.toLowerCase(),
      process.env.DEMO_ORGANIZATION_EMAIL?.toLowerCase(),
    ].filter((e): e is string => Boolean(e))

    isPublicDemoUser = publicDemoEmails.includes(email)
  }

  const navUser = user
    ? { id: user.id, email: user.email ?? null }
    : null

  return (
    <nav className="relative border-b border-gray-200 bg-white">
      <div className="mx-auto max-w-5xl">
        <NavClient
          user={navUser}
          isDemoMode={demoMode}
          isPublicDemoUser={isPublicDemoUser}
        />
      </div>
    </nav>
  )
}
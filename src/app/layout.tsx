import './globals.css'
import type { Metadata } from 'next'
import { Suspense } from 'react'

import Nav from './components/nav'
import DemoBanner from './components/demo-banner'
import DemoBannerCTA from './components/demo-banner-cta'
import NotificationRouteOverlayCleanup from './components/notification-route-overlay-cleanup'
import { getAppMode } from '@/lib/app-mode'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'RaiseHub',
  description: 'Digital fundraising passes for schools and local businesses',
}

type DemoPresentationProfile = {
  role: string
  is_demo: boolean | null
}

const PUBLIC_DEMO_ROLES = new Set([
  'customer',
  'business',
  'organization',
])

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // =========================================
  // DEMO PRESENTATION CONTEXT
  //
  // Deployment mode controls logged-out showroom branding.
  // Once authenticated, both role and profile demo status decide
  // whether the public demo presentation remains visible.
  //
  // Owner and Admin sessions never receive the public demo banner.
  // Owner preview uses its own contextual preview bar instead.
  // =========================================
  const appMode = getAppMode()
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  let signedInProfile: DemoPresentationProfile | null = null

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_demo')
      .eq('id', user.id)
      .maybeSingle<DemoPresentationProfile>()

    signedInProfile = profile ?? null
  }

  const showLoggedOutDemoBanner =
    appMode === 'demo' && !user

  const showAuthenticatedDemoBanner =
    appMode === 'demo' &&
    Boolean(user) &&
    signedInProfile?.is_demo === true &&
    PUBLIC_DEMO_ROLES.has(signedInProfile.role)

  const showDemoBanner =
    showLoggedOutDemoBanner || showAuthenticatedDemoBanner

  return (
    <html lang="en" data-app-mode={appMode}>
      <body className="bg-slate-100 text-gray-900">
        {showDemoBanner ? (
          <DemoBanner
            cta={
              <Suspense fallback={null}>
                <DemoBannerCTA />
              </Suspense>
            }
          />
        ) : null}
        <Nav />
        <NotificationRouteOverlayCleanup />
        {children}
      </body>
    </html>
  )
}

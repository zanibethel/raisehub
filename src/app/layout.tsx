import './globals.css'
import type { Metadata } from 'next'
import Nav from './components/nav'
import DemoBanner from './components/demo-banner'
import DemoBannerCTA from './components/demo-banner-cta'
import { getAppMode } from '@/lib/app-mode'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'RaiseHub',
  description: 'Digital fundraising passes for schools and local businesses',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // =========================================
  // 🧭 APP + PROFILE DEMO CONTEXT
  //
  // The deployment-level app mode controls whether
  // the public experience is the Demo showroom.
  //
  // Once a user is signed in, the profile's is_demo
  // value becomes the source of truth for whether
  // Demo presentation should remain visible.
  //
  // This prevents Production users from receiving
  // Demo branding inside a Demo-mode deployment.
  // =========================================
  const appMode = getAppMode()
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  let signedInProfileIsDemo = false

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_demo')
      .eq('id', user.id)
      .maybeSingle()

    signedInProfileIsDemo = profile?.is_demo ?? false
  }

  const showDemoBanner =
    appMode === 'demo' && (!user || signedInProfileIsDemo)

  return (
    <html lang="en" data-app-mode={appMode}>
      <body className="bg-slate-100 text-gray-900">
        {showDemoBanner ? (
          <DemoBanner cta={<DemoBannerCTA />} />
        ) : null}
        <Nav />
        {children}
      </body>
    </html>
  )
}
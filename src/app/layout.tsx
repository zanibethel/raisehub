import './globals.css'
import type { Metadata } from 'next'
import Nav from './components/nav'
import DemoBanner from './components/demo-banner'
import DemoBannerCTA from './components/demo-banner-cta'
import { getAppMode } from '@/lib/app-mode'

export const metadata: Metadata = {
  title: 'RaiseHub',
  description: 'Digital fundraising passes for schools and local businesses',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // =========================================
  // 🧭 DEMO MODE DETECTION
  // Exposed as a data attribute only — no visible
  // UI depends on this yet. Banner/CTA come later.
  // =========================================
  const appMode = getAppMode()

  return (
    <html lang="en" data-app-mode={appMode}>
      <body className="bg-slate-100 text-gray-900">
        <DemoBanner cta={<DemoBannerCTA />} />
        <Nav />
        {children}
      </body>
    </html>
  )
}
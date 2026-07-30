'use client'

import Link from 'next/link'
import type { ComponentProps } from 'react'

import BusinessDashboardContent from './business-dashboard-content'
import {
  WorkspaceHero,
  WorkspaceMetricStrip,
  WorkspaceShell,
  type WorkspaceBottomNavItem,
} from '@/components/workspace/workspace-shell'

type BusinessWorkspaceFrameProps = ComponentProps<typeof BusinessDashboardContent>

function DashboardIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
      <path d="M3 11 12 3l9 8" />
      <path d="M5 10v10h14V10" />
    </svg>
  )
}

function OffersIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
      <path d="M20 12 12 20 4 12V4h8Z" />
      <circle cx="9" cy="9" r="1" />
    </svg>
  )
}

function ReportsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
      <path d="M4 20V10" />
      <path d="M10 20V4" />
      <path d="M16 20v-7" />
      <path d="M22 20H2" />
    </svg>
  )
}

function HelpIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9a2.5 2.5 0 1 1 4.2 1.8c-.9.7-1.7 1.2-1.7 2.7" />
      <path d="M12 17h.01" />
    </svg>
  )
}

function MoreIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  )
}

export default function BusinessWorkspaceFrame(props: BusinessWorkspaceFrameProps) {
  const businessName = props.profile?.business_name?.trim() || 'Your business'
  const address = props.profile?.address?.trim() || 'Add your business address'
  const logoUrl = props.profile?.logo_url?.trim()

  const bottomNavigation: WorkspaceBottomNavItem[] = [
    { href: '/dashboard', label: 'Dashboard', icon: <DashboardIcon />, active: true },
    { href: '#business-offers', label: 'Offers', icon: <OffersIcon /> },
    { href: '#business-performance', label: 'Reports', icon: <ReportsIcon /> },
    { href: '/support', label: 'Help', icon: <HelpIcon /> },
    { href: '#business-redemption-settings', label: 'More', icon: <MoreIcon /> },
  ]

  return (
    <WorkspaceShell bottomNavigation={bottomNavigation}>
      <WorkspaceHero
        eyebrow="Business"
        title={businessName}
        subtitle="Business owner"
        detail={address}
        tone="green"
        image={
          logoUrl ? (
            <img
              src={logoUrl}
              alt={`${businessName} logo`}
              className="h-28 w-28 rounded-3xl border border-slate-200 bg-white object-contain p-2 shadow-md"
            />
          ) : (
            <div className="flex h-28 w-28 items-center justify-center rounded-3xl border border-green-200 bg-green-50 text-4xl font-black text-green-700 shadow-md">
              {businessName.slice(0, 1).toUpperCase()}
            </div>
          )
        }
        action={
          <Link
            href="#business-profile"
            className="inline-flex min-h-12 items-center justify-center rounded-full border border-green-200 bg-green-50 px-6 font-black text-green-700 transition hover:bg-green-100"
          >
            Edit details
          </Link>
        }
      />

      <WorkspaceMetricStrip
        title="Customer activity"
        metrics={[
          { label: 'Views', value: props.viewCount, tone: 'blue' },
          { label: 'Clicks', value: props.clickCount, tone: 'green' },
          {
            label: 'Click rate',
            value: `${props.conversionRate}%`,
            description: 'Clicks divided by views',
            tone: 'amber',
          },
        ]}
      />

      <BusinessDashboardContent {...props} />
    </WorkspaceShell>
  )
}

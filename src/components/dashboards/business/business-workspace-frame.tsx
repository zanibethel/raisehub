'use client'

import type { ComponentProps } from 'react'

import BusinessDashboardContent from './business-dashboard-content'
import {
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
  const bottomNavigation: WorkspaceBottomNavItem[] = [
    { href: '/dashboard', label: 'Dashboard', icon: <DashboardIcon />, active: true },
    { href: '#business-offers', label: 'Offers', icon: <OffersIcon /> },
    { href: '#business-performance', label: 'Reports', icon: <ReportsIcon /> },
    { href: '/support', label: 'Help', icon: <HelpIcon /> },
    { href: '#business-redemption-settings', label: 'More', icon: <MoreIcon /> },
  ]

  return (
    <WorkspaceShell bottomNavigation={bottomNavigation}>
      <BusinessDashboardContent {...props} />
    </WorkspaceShell>
  )
}

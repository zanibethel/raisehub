'use client'

import Link from 'next/link'
import type { ComponentProps } from 'react'

import {
  WorkspaceShell,
  type WorkspaceIdentity,
} from '@/components/workspace/workspace-shell'
import { buildWorkspaceNavigation } from '@/components/workspace/workspace-navigation'
import OrganizationDashboardContent, {
  type OrganizationWorkspaceView,
} from './organization-dashboard-content'

type Props = ComponentProps<typeof OrganizationDashboardContent> & {
  organizationName: string
  organizationLocation: string
  view?: OrganizationWorkspaceView
}

function DashboardIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5"><path d="M3 11 12 3l9 8" /><path d="M5 10v10h14V10" /></svg>
}

function CampaignsIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5"><path d="M4 5h16v14H4z" /><path d="M8 3v4M16 3v4M8 11h8M8 15h5" /></svg>
}

function ReportsIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5"><path d="M4 20V10" /><path d="M10 20V4" /><path d="M16 20v-7" /><path d="M22 20H2" /></svg>
}

function HelpIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5"><circle cx="12" cy="12" r="9" /><path d="M9.5 9a2.5 2.5 0 1 1 4.2 1.8c-.9.7-1.7 1.2-1.7 2.7" /><path d="M12 17h.01" /></svg>
}

function MoreIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
}

export default function OrganizationWorkspaceFrame({
  organizationName,
  organizationLocation,
  view = 'dashboard',
  ...props
}: Props) {
  const bottomNavigation = buildWorkspaceNavigation({
    workLabel: 'Campaigns',
    workHref: '/dashboard/campaigns',
    reportsHref: '/dashboard/reports',
    helpHref: '/support',
    activeSlot:
      view === 'campaigns'
        ? 'work'
        : view === 'reports'
          ? 'reports'
          : 'dashboard',
    icons: {
      dashboard: <DashboardIcon />,
      work: <CampaignsIcon />,
      reports: <ReportsIcon />,
      help: <HelpIcon />,
      more: <MoreIcon />,
    },
  })

  const identity: WorkspaceIdentity = {
    eyebrow:
      view === 'dashboard'
        ? 'Organization workspace'
        : view === 'campaigns'
          ? 'Campaign management'
          : 'Fundraising reports',
    title: organizationName,
    subtitle:
      view === 'dashboard'
        ? organizationLocation
        : view === 'campaigns'
          ? 'Create campaigns, manage sellers, and prepare payouts.'
          : 'Review fundraising totals, supporters, sellers, and fees.',
    detail:
      view === 'dashboard'
        ? `${props.activeCampaigns} active campaign${props.activeCampaigns === 1 ? '' : 's'}`
        : view === 'campaigns'
          ? `${props.totalCampaigns} total campaign${props.totalCampaigns === 1 ? '' : 's'}`
          : `$${props.totalFundsRaised.toLocaleString()} raised across all campaigns`,
    tone: 'blue',
    image: (
      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-lg font-black text-blue-700">
        {organizationName.trim().charAt(0).toUpperCase() || 'O'}
      </span>
    ),
    action: view === 'dashboard' ? (
      <Link
        href="/dashboard/campaigns"
        className="inline-flex min-h-8 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 px-3 text-xs font-bold text-blue-700"
      >
        Manage
      </Link>
    ) : (
      <Link
        href="/dashboard"
        className="inline-flex min-h-8 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700"
      >
        Dashboard
      </Link>
    ),
  }

  return (
    <WorkspaceShell identity={identity} bottomNavigation={bottomNavigation}>
      <OrganizationDashboardContent view={view} {...props} />
    </WorkspaceShell>
  )
}

'use client'

import Link from 'next/link'
import type { ComponentProps } from 'react'

import BusinessCommandCenter from './business-command-center'
import BusinessDashboardContent from './business-dashboard-content'
import type { BusinessWorkspaceView } from './business-dashboard'
import {
  WorkspaceShell,
  type WorkspaceIdentity,
} from '@/components/workspace/workspace-shell'
import { buildWorkspaceNavigation } from '@/components/workspace/workspace-navigation'

type BusinessWorkspaceFrameProps = ComponentProps<typeof BusinessDashboardContent> & {
  view?: BusinessWorkspaceView
}

function DashboardIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5"><path d="M3 11 12 3l9 8" /><path d="M5 10v10h14V10" /></svg>
}

function OffersIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5"><path d="M20 12 12 20 4 12V4h8Z" /><circle cx="9" cy="9" r="1" /></svg>
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

export default function BusinessWorkspaceFrame({
  view = 'dashboard',
  ...props
}: BusinessWorkspaceFrameProps) {
  const bottomNavigation = buildWorkspaceNavigation({
    workLabel: 'Offers',
    workHref: '/dashboard/offers',
    reportsHref: '/dashboard/reports',
    activeSlot: view === 'offers' ? 'work' : view === 'reports' ? 'reports' : 'dashboard',
    icons: {
      dashboard: <DashboardIcon />,
      work: <OffersIcon />,
      reports: <ReportsIcon />,
      help: <HelpIcon />,
      more: <MoreIcon />,
    },
  })

  const businessName =
    props.profile?.business_name || props.profile?.display_name || 'Business workspace'

  const identity: WorkspaceIdentity = {
    eyebrow: view === 'dashboard' ? 'Business details' : view === 'offers' ? 'Offer management' : 'Business reporting',
    title: businessName,
    subtitle:
      view === 'dashboard'
        ? props.profile?.phone || 'RaiseHub business partner'
        : view === 'offers'
          ? 'Create, edit, pause, and review your customer offers.'
          : 'Review customer activity, redemptions, and offer performance.',
    detail:
      view === 'dashboard'
        ? props.profile?.address || 'Add your address so customers know where to visit.'
        : view === 'offers'
          ? props.isGrowthPlan
            ? `${props.activeOffersCount} active offers · Growth plan`
            : `${props.activeOffersCount} of ${props.activeOfferLimit} active offer slots are currently in use.`
          : `${props.totalRedemptions} total redemptions recorded.`,
    tone: 'green',
    image: props.profile?.logo_url ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={props.profile.logo_url} alt="" className="h-12 w-12 rounded-xl border border-slate-200 bg-white object-contain" />
    ) : (
      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-100 text-lg font-black text-green-700">
        {businessName.trim().charAt(0).toUpperCase() || 'B'}
      </span>
    ),
    action: view === 'dashboard' ? (
      <Link href="/dashboard/offers#business-profile" className="inline-flex min-h-8 items-center justify-center rounded-lg border border-green-200 bg-green-50 px-3 text-xs font-bold text-green-700">
        Edit
      </Link>
    ) : (
      <Link href="/dashboard" className="inline-flex min-h-8 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700">
        Dashboard
      </Link>
    ),
  }

  return (
    <WorkspaceShell identity={identity} bottomNavigation={bottomNavigation}>
      {view === 'dashboard' ? (
        <BusinessCommandCenter {...props} />
      ) : (
        <BusinessDashboardContent {...props} view={view} />
      )}
    </WorkspaceShell>
  )
}

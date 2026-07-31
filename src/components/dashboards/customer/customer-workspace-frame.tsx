'use client'

import type { ReactNode } from 'react'

import {
  WorkspaceShell,
  type WorkspaceIdentity,
} from '@/components/workspace/workspace-shell'
import { buildWorkspaceNavigation } from '@/components/workspace/workspace-navigation'

export type CustomerWorkspaceView = 'dashboard' | 'deals' | 'activity'

type Props = {
  view?: CustomerWorkspaceView
  customerEmail?: string | null
  hasActivePass: boolean
  availableOfferCount: number
  children: ReactNode
}

function DashboardIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5"><path d="M3 11 12 3l9 8" /><path d="M5 10v10h14V10" /></svg>
}

function DealsIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5"><path d="M20 12 12 20 4 12V4h8Z" /><circle cx="9" cy="9" r="1" /></svg>
}

function ActivityIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5"><path d="M4 20V10" /><path d="M10 20V4" /><path d="M16 20v-7" /><path d="M22 20H2" /></svg>
}

function HelpIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5"><circle cx="12" cy="12" r="9" /><path d="M9.5 9a2.5 2.5 0 1 1 4.2 1.8c-.9.7-1.7 1.2-1.7 2.7" /><path d="M12 17h.01" /></svg>
}

function MoreIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
}

export default function CustomerWorkspaceFrame({
  view = 'dashboard',
  customerEmail,
  hasActivePass,
  availableOfferCount,
  children,
}: Props) {
  const bottomNavigation = buildWorkspaceNavigation({
    workLabel: 'Deals',
    workHref: '/dashboard/deals',
    reportsLabel: 'Activity',
    reportsHref: '/dashboard/activity',
    helpHref: '/support',
    activeSlot: view === 'deals' ? 'work' : view === 'activity' ? 'reports' : 'dashboard',
    icons: {
      dashboard: <DashboardIcon />,
      work: <DealsIcon />,
      reports: <ActivityIcon />,
      help: <HelpIcon />,
      more: <MoreIcon />,
    },
  })

  const identity: WorkspaceIdentity = {
    eyebrow:
      view === 'dashboard'
        ? 'Customer workspace'
        : view === 'deals'
          ? 'Local deals'
          : 'Pass activity',
    title: 'My RaiseHub Pass',
    subtitle:
      view === 'dashboard'
        ? customerEmail || 'RaiseHub supporter'
        : view === 'deals'
          ? 'Browse, save, and use participating business offers.'
          : 'Review redemptions, savings, and fundraiser support history.',
    detail: hasActivePass
      ? `${availableOfferCount} active ${availableOfferCount === 1 ? 'deal' : 'deals'} available`
      : 'Support a fundraiser to unlock participating offers.',
    tone: hasActivePass ? 'green' : 'amber',
    image: (
      <span className={`flex h-12 w-12 items-center justify-center rounded-xl text-lg font-black ${hasActivePass ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
        $
      </span>
    ),
  }

  return (
    <WorkspaceShell identity={identity} bottomNavigation={bottomNavigation}>
      {children}
    </WorkspaceShell>
  )
}

'use client'

import type { ReactNode } from 'react'

import {
  WorkspaceShell,
  type WorkspaceIdentity,
} from '@/components/workspace/workspace-shell'
import { buildWorkspaceNavigation } from '@/components/workspace/workspace-navigation'

export type OwnerWorkspaceView =
  | 'dashboard'
  | 'manage'
  | 'demo'
  | 'support'
  | 'more'

type Props = {
  view?: OwnerWorkspaceView
  detail?: string
  children: ReactNode
}

function DashboardIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5"><path d="M3 11 12 3l9 8" /><path d="M5 10v10h14V10" /></svg>
}

function ManageIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5"><path d="M4 6h16M4 12h16M4 18h16" /><circle cx="8" cy="6" r="1.5" /><circle cx="16" cy="12" r="1.5" /><circle cx="10" cy="18" r="1.5" /></svg>
}

function DemoIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5"><path d="M9 3h6M10 3v5l-5 9a2 2 0 0 0 1.7 3h10.6a2 2 0 0 0 1.7-3l-5-9V3" /><path d="M8 14h8" /></svg>
}

function SupportIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5"><path d="M4 5h16v11H8l-4 4z" /><path d="M8 9h8M8 13h5" /></svg>
}

function MoreIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
}

export default function OwnerWorkspaceShell({
  view = 'dashboard',
  detail = 'Platform command center',
  children,
}: Props) {
  const bottomNavigation = buildWorkspaceNavigation({
    workLabel: 'Manage',
    workHref: '/dashboard/owner/manage',
    reportsLabel: 'Demo',
    reportsHref: '/dashboard/owner/demos',
    helpHref: '/dashboard/owner/support/requests',
    activeSlot:
      view === 'manage'
        ? 'work'
        : view === 'demo'
          ? 'reports'
          : view === 'support'
            ? 'help'
            : view === 'more'
              ? 'more'
              : 'dashboard',
    icons: {
      dashboard: <DashboardIcon />,
      work: <ManageIcon />,
      reports: <DemoIcon />,
      help: <SupportIcon />,
      more: <MoreIcon />,
    },
  })

  const identity: WorkspaceIdentity = {
    eyebrow: 'Owner workspace',
    title: 'RaiseHub',
    subtitle: 'Operate the platform, assist users, and manage demo experiences.',
    detail,
    tone: 'blue',
    image: (
      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-950 text-lg font-black text-white">
        RH
      </span>
    ),
  }

  return (
    <WorkspaceShell identity={identity} bottomNavigation={bottomNavigation}>
      {children}
    </WorkspaceShell>
  )
}

'use client'

import type { ReactNode } from 'react'

export type WorkspaceNavigationSlot = 'dashboard' | 'work' | 'reports' | 'help' | 'more'

export type WorkspaceNavigationItem = {
  slot: WorkspaceNavigationSlot
  label: string
  href?: string
  icon: ReactNode
  active?: boolean
  onSelect?: () => void
}

export type WorkspaceNavigationConfig = {
  dashboard: WorkspaceNavigationItem
  work: WorkspaceNavigationItem
  reports: WorkspaceNavigationItem
  help: WorkspaceNavigationItem
  more: WorkspaceNavigationItem
}

export function workspaceNavigationItems(
  config: WorkspaceNavigationConfig
): WorkspaceNavigationItem[] {
  return [
    config.dashboard,
    config.work,
    config.reports,
    config.help,
    config.more,
  ]
}

export function openWorkspaceMenu() {
  window.dispatchEvent(new Event('raisehub:open-workspace-menu'))
}

export function buildWorkspaceNavigation({
  workLabel,
  workHref,
  reportsLabel = 'Reports',
  reportsHref,
  helpHref = '/support',
  activeSlot = 'dashboard',
  icons,
}: {
  workLabel: string
  workHref: string
  reportsLabel?: string
  reportsHref: string
  helpHref?: string
  activeSlot?: WorkspaceNavigationSlot
  icons: Record<WorkspaceNavigationSlot, ReactNode>
}): WorkspaceNavigationItem[] {
  return workspaceNavigationItems({
    dashboard: {
      slot: 'dashboard',
      label: 'Dashboard',
      href: '/dashboard',
      icon: icons.dashboard,
      active: activeSlot === 'dashboard',
    },
    work: {
      slot: 'work',
      label: workLabel,
      href: workHref,
      icon: icons.work,
      active: activeSlot === 'work',
    },
    reports: {
      slot: 'reports',
      label: reportsLabel,
      href: reportsHref,
      icon: icons.reports,
      active: activeSlot === 'reports',
    },
    help: {
      slot: 'help',
      label: 'Help',
      href: helpHref,
      icon: icons.help,
      active: activeSlot === 'help',
    },
    more: {
      slot: 'more',
      label: 'More',
      icon: icons.more,
      onSelect: openWorkspaceMenu,
      active: activeSlot === 'more',
    },
  })
}

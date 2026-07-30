'use client'

import type { ReactNode } from 'react'

export type WorkspaceTopBarProps = {
  workspaceName: string
  workspaceLabel?: string | null
  avatar?: ReactNode
  workspaceSelector?: ReactNode
  notificationControl?: ReactNode
  menuControl?: ReactNode
  environmentLabel?: string | null
}

function DefaultAvatar({ name }: { name: string }) {
  const initial = name.trim().charAt(0).toUpperCase() || 'R'

  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-black text-white shadow-sm">
      {initial}
    </span>
  )
}

export default function WorkspaceTopBar({
  workspaceName,
  workspaceLabel,
  avatar,
  workspaceSelector,
  notificationControl,
  menuControl,
  environmentLabel,
}: WorkspaceTopBarProps) {
  return (
    <header className="py-3">
      <div className="flex min-w-0 items-center gap-3">
        {avatar ?? <DefaultAvatar name={workspaceName} />}

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <p className="truncate text-base font-black text-slate-950 sm:text-lg">
              {workspaceName}
            </p>
            {workspaceSelector ? <div className="shrink-0">{workspaceSelector}</div> : null}
          </div>

          {workspaceLabel || environmentLabel ? (
            <p className="mt-0.5 truncate text-xs font-semibold text-slate-500">
              {[workspaceLabel, environmentLabel].filter(Boolean).join(' · ')}
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {notificationControl}
          {menuControl}
        </div>
      </div>
    </header>
  )
}

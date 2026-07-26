'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

type WorkspaceItem = 'profile' | 'payouts'
export type WorkspaceStatus = 'checking' | 'complete' | 'attention'

type WorkspaceStatusContextValue = {
  reportStatus: (item: WorkspaceItem, status: WorkspaceStatus) => void
}

const WorkspaceStatusContext = createContext<WorkspaceStatusContextValue | null>(null)
const ignoreStandaloneStatus = (_item: WorkspaceItem, _status: WorkspaceStatus) => undefined

function StatusItem({ label, status }: { label: string; status: WorkspaceStatus }) {
  const isComplete = status === 'complete'
  const isChecking = status === 'checking'
  const symbol = isComplete ? '✓' : isChecking ? '•' : '⚠'
  const symbolClassName = isComplete ? 'text-green-600' : isChecking ? 'text-gray-400' : 'text-amber-600'
  const statusLabel = isComplete ? `${label} complete` : isChecking ? `${label} status loading` : `${label} needs attention`

  return (
    <span className="inline-flex items-center gap-1.5" aria-label={statusLabel}>
      <span aria-hidden="true" className={symbolClassName}>{symbol}</span>
      {label}
    </span>
  )
}

export function useWorkspaceStatusReporter() {
  const context = useContext(WorkspaceStatusContext)
  return context?.reportStatus ?? ignoreStandaloneStatus
}

export function WorkspaceStatusReporter({ item, status }: { item: WorkspaceItem; status: WorkspaceStatus }) {
  const reportStatus = useWorkspaceStatusReporter()
  useEffect(() => {
    reportStatus(item, status)
  }, [item, reportStatus, status])
  return null
}

export default function OrganizationWorkspaceStatus({ children }: { children: React.ReactNode }) {
  const [statuses, setStatuses] = useState<Record<WorkspaceItem, WorkspaceStatus>>({ profile: 'checking', payouts: 'checking' })
  const reportStatus = useCallback((item: WorkspaceItem, status: WorkspaceStatus) => {
    setStatuses((current) => current[item] === status ? current : { ...current, [item]: status })
  }, [])
  const value = useMemo(() => ({ reportStatus }), [reportStatus])
  const needsAttention = Object.values(statuses).some((status) => status === 'attention')

  return (
    <WorkspaceStatusContext.Provider value={value}>
      <details className={`group rounded-2xl border bg-white/90 shadow-sm backdrop-blur ${needsAttention ? 'border-amber-200' : 'border-blue-100'}`}>
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <p className={`text-xs font-bold uppercase tracking-wide ${needsAttention ? 'text-amber-700' : 'text-blue-700'}`}>Workspace status</p>
            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-semibold text-gray-800">
              <StatusItem label="Profile" status={statuses.profile} />
              <StatusItem label="Payouts" status={statuses.payouts} />
            </div>
          </div>
          <span className={`shrink-0 rounded-full px-3 py-2 text-sm font-semibold group-open:hidden ${needsAttention ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'}`}>{needsAttention ? 'Review' : 'Manage'}</span>
          <span className="hidden shrink-0 rounded-full bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 group-open:inline">Hide</span>
        </summary>
        <div className="divide-y divide-blue-100 border-t border-blue-100 px-4 sm:px-5 [&>#organization-setup]:rounded-none [&>#organization-setup]:border-0 [&>#organization-setup]:bg-transparent [&>#organization-setup]:px-0 [&>#organization-setup]:py-4 [&>#organization-setup]:shadow-none [&>#organization-setup]:backdrop-blur-none">{children}</div>
      </details>
    </WorkspaceStatusContext.Provider>
  )
}

'use client'

import { useMemo, useState } from 'react'

import WorkspaceCard from './workspace-card'
import type {
  WorkspaceCardData,
  WorkspaceRole,
} from '@/lib/types/identity-access'

type WorkspaceFilter = 'all' | WorkspaceRole
type EnvironmentFilter = 'production' | 'demo' | 'all'

type WorkspaceSelectorProps = {
  workspaces: WorkspaceCardData[]
  initialRole?: WorkspaceFilter
  initialEnvironment?: EnvironmentFilter
  initialSearch?: string
}

const filterOptions: { value: WorkspaceFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'business', label: 'Businesses' },
  { value: 'organization', label: 'Organizations' },
  { value: 'customer', label: 'Customers' },
]

const environmentOptions: {
  value: EnvironmentFilter
  label: string
}[] = [
  { value: 'production', label: 'Production' },
  { value: 'demo', label: 'Demo' },
  { value: 'all', label: 'All data' },
]

function isWorkspaceFilter(value?: string): value is WorkspaceFilter {
  return ['all', 'business', 'organization', 'customer'].includes(value ?? '')
}

function isEnvironmentFilter(value?: string): value is EnvironmentFilter {
  return ['production', 'demo', 'all'].includes(value ?? '')
}

export default function WorkspaceSelector({
  workspaces,
  initialRole = 'all',
  initialEnvironment = 'production',
  initialSearch = '',
}: WorkspaceSelectorProps) {
  const [searchQuery, setSearchQuery] = useState(initialSearch)
  const [activeFilter, setActiveFilter] = useState<WorkspaceFilter>(
    isWorkspaceFilter(initialRole) ? initialRole : 'all'
  )
  const [environmentFilter, setEnvironmentFilter] =
    useState<EnvironmentFilter>(
      isEnvironmentFilter(initialEnvironment)
        ? initialEnvironment
        : 'production'
    )

  const filteredWorkspaces = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase()

    return workspaces.filter((workspace) => {
      const matchesRole =
        activeFilter === 'all' || workspace.role === activeFilter
      const matchesEnvironment =
        environmentFilter === 'all' ||
        (environmentFilter === 'demo' ? workspace.isDemo : !workspace.isDemo)
      const searchableText = [
        workspace.name,
        workspace.subtitle,
        workspace.status,
        workspace.role,
        workspace.isDemo ? 'demo' : 'production',
        ...(workspace.missingSetupItems ?? []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      const matchesSearch =
        normalizedQuery.length === 0 || searchableText.includes(normalizedQuery)

      return matchesRole && matchesEnvironment && matchesSearch
    })
  }, [activeFilter, environmentFilter, searchQuery, workspaces])

  return (
    <section
      id="workspace-results"
      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-6"
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-700">
            Workspaces
          </p>
          <h2 className="mt-1 text-xl font-bold text-slate-950 sm:text-2xl">
            Find an account
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-5 text-slate-600">
            Search and enter read-only Support Mode without changing your Owner identity.
          </p>
        </div>

        <div className="w-full lg:max-w-md">
          <label
            htmlFor="workspace-search"
            className="text-sm font-semibold text-slate-700"
          >
            Search workspaces
          </label>
          <input
            id="workspace-search"
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search by name, role, or status..."
            className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-[auto_1fr] sm:items-end">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
            Environment
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {environmentOptions.map((option) => {
              const isActive = environmentFilter === option.value
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setEnvironmentFilter(option.value)}
                  aria-pressed={isActive}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                    isActive
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50'
                  }`}
                >
                  {option.label}
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 sm:justify-end">
          {filterOptions.map((option) => {
            const isActive = activeFilter === option.value
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setActiveFilter(option.value)}
                aria-pressed={isActive}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  isActive
                    ? 'border-blue-600 bg-blue-600 text-white'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50'
                }`}
              >
                {option.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-4 border-t border-slate-100 pt-3">
        <p className="text-xs text-slate-600 sm:text-sm">
          Showing <span className="font-bold text-slate-900">{filteredWorkspaces.length}</span>{' '}
          of <span className="font-bold text-slate-900">{workspaces.length}</span>
        </p>

        {searchQuery || activeFilter !== 'all' || environmentFilter !== 'production' ? (
          <button
            type="button"
            onClick={() => {
              setSearchQuery('')
              setActiveFilter('all')
              setEnvironmentFilter('production')
            }}
            className="text-xs font-semibold text-blue-700 hover:text-blue-800 sm:text-sm"
          >
            Clear filters
          </button>
        ) : null}
      </div>

      {filteredWorkspaces.length > 0 ? (
        <div className="mt-3 grid gap-2.5 md:grid-cols-2 xl:grid-cols-3">
          {filteredWorkspaces.map((workspace) => (
            <WorkspaceCard
              key={`${workspace.role}-${workspace.id}`}
              workspace={workspace}
            />
          ))}
        </div>
      ) : (
        <div className="mt-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
          <h3 className="font-bold text-slate-900">No matching workspaces</h3>
          <p className="mt-1 text-sm text-slate-600">
            Try a different search or clear the active filters.
          </p>
        </div>
      )}
    </section>
  )
}

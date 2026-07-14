'use client'

import { useMemo, useState } from 'react'

import WorkspaceCard from './workspace-card'
import type {
  WorkspaceCardData,
  WorkspaceRole,
} from '@/lib/types/identity-access'

// =============================================================================
// Types
// =============================================================================

type WorkspaceSelectorProps = {
  workspaces: WorkspaceCardData[]
}

type WorkspaceFilter = 'all' | WorkspaceRole

// =============================================================================
// Filter options
// =============================================================================

const filterOptions: {
  value: WorkspaceFilter
  label: string
}[] = [
  {
    value: 'all',
    label: 'All',
  },
  {
    value: 'business',
    label: 'Businesses',
  },
  {
    value: 'organization',
    label: 'Organizations',
  },
  {
    value: 'customer',
    label: 'Customers',
  },
]

// =============================================================================
// Component
// =============================================================================

export default function WorkspaceSelector({
  workspaces,
}: WorkspaceSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] =
    useState<WorkspaceFilter>('all')

  const filteredWorkspaces = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase()

    return workspaces.filter((workspace) => {
      const matchesRole =
        activeFilter === 'all' ||
        workspace.role === activeFilter

      const searchableText = [
        workspace.name,
        workspace.subtitle,
        workspace.status,
        workspace.role,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      const matchesSearch =
        normalizedQuery.length === 0 ||
        searchableText.includes(normalizedQuery)

      return matchesRole && matchesSearch
    })
  }, [activeFilter, searchQuery, workspaces])

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-700">
            Workspaces
          </p>

          <h2 className="mt-2 text-2xl font-bold text-slate-950">
            Find an account
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Search businesses, organizations, and customers without changing
            your permanent owner identity.
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
            className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {filterOptions.map((option) => {
          const isActive = activeFilter === option.value

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setActiveFilter(option.value)}
              aria-pressed={isActive}
              className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
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

      <div className="mt-6 flex items-center justify-between gap-4">
        <p className="text-sm text-slate-600">
          Showing{' '}
          <span className="font-bold text-slate-900">
            {filteredWorkspaces.length}
          </span>{' '}
          of{' '}
          <span className="font-bold text-slate-900">
            {workspaces.length}
          </span>{' '}
          workspaces
        </p>

        {searchQuery || activeFilter !== 'all' ? (
          <button
            type="button"
            onClick={() => {
              setSearchQuery('')
              setActiveFilter('all')
            }}
            className="text-sm font-semibold text-blue-700 hover:text-blue-800"
          >
            Clear filters
          </button>
        ) : null}
      </div>

      {filteredWorkspaces.length > 0 ? (
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredWorkspaces.map((workspace) => (
            <WorkspaceCard
              key={`${workspace.role}-${workspace.id}`}
              workspace={workspace}
            />
          ))}
        </div>
      ) : (
        <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
          <h3 className="font-bold text-slate-900">
            No matching workspaces
          </h3>

          <p className="mt-2 text-sm text-slate-600">
            Try a different search or clear the active role filter.
          </p>
        </div>
      )}
    </section>
  )
}
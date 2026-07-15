'use client'

import Link from 'next/link'
import { useActionState } from 'react'

import {
  createDemoGroupAction,
  type CreateDemoGroupActionState,
} from '@/app/dashboard/owner/demo-groups/actions'

// =============================================================================
// State
// =============================================================================

const initialState: CreateDemoGroupActionState = {
  success: false,
  message: null,
  groupKey: null,
}

// =============================================================================
// Component
// =============================================================================

export default function CreateDemoGroupForm() {
  const [
    state,
    formAction,
    isPending,
  ] = useActionState(
    createDemoGroupAction,
    initialState
  )

  return (
    <details className="group overflow-hidden rounded-2xl border border-blue-200 bg-white shadow-sm">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-4 transition hover:bg-blue-50 sm:p-5">
        <span>
          <span className="block font-bold text-slate-950">
            Create Demo Group
          </span>

          <span className="mt-1 block text-sm text-slate-600">
            Start a reusable scenario with an empty group.
          </span>
        </span>

        <span className="text-xl font-bold text-blue-700 transition group-open:rotate-45">
          +
        </span>
      </summary>

      <form
        action={formAction}
        className="space-y-4 border-t border-blue-100 p-4 sm:p-5"
      >
        <div>
          <label
            htmlFor="demo-group-name"
            className="block text-sm font-bold text-slate-900"
          >
            Group name
          </label>

          <input
            id="demo-group-name"
            name="name"
            type="text"
            required
            placeholder="School Fundraiser"
            className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>

        <div>
          <label
            htmlFor="demo-group-type"
            className="block text-sm font-bold text-slate-900"
          >
            Scenario type
          </label>

          <select
            id="demo-group-type"
            name="scenarioType"
            defaultValue="custom"
            className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          >
            <option value="custom">
              Custom
            </option>

            <option value="school">
              School fundraiser
            </option>

            <option value="business">
              Business
            </option>

            <option value="organization">
              Organization
            </option>

            <option value="customer">
              Customer
            </option>

            <option value="platform_test">
              Platform test
            </option>

            <option value="mixed">
              Mixed experience
            </option>
          </select>
        </div>

        <div>
          <label
            htmlFor="demo-group-description"
            className="block text-sm font-bold text-slate-900"
          >
            Description
          </label>

          <textarea
            id="demo-group-description"
            name="description"
            rows={3}
            placeholder="What this scenario demonstrates."
            className="mt-2 w-full resize-none rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>

        {state.message ? (
          <div
            className={`rounded-xl border px-3 py-2.5 text-sm font-medium ${
              state.success
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : 'border-rose-200 bg-rose-50 text-rose-800'
            }`}
          >
            {state.message}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={isPending}
            className="rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending
              ? 'Creating...'
              : 'Create Group'}
          </button>

          {state.success &&
          state.groupKey ? (
            <Link
              href={`/dashboard/owner/demo-groups/${encodeURIComponent(
                state.groupKey
              )}`}
              className="text-sm font-bold text-blue-700 hover:text-blue-900"
            >
              Open new group →
            </Link>
          ) : null}
        </div>
      </form>
    </details>
  )
}

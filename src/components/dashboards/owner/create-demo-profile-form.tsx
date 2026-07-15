'use client'

import { useActionState } from 'react'

import {
  createDemoProfileAction,
  type CreateDemoProfileActionState,
} from '@/app/dashboard/owner/demo-groups/[groupKey]/actions'

// =============================================================================
// Types
// =============================================================================

type CreateDemoProfileFormProps = {
  groupKey: string
}

// =============================================================================
// State
// =============================================================================

const initialState: CreateDemoProfileActionState = {
  success: false,
  message: null,
}

// =============================================================================
// Component
// =============================================================================

export default function CreateDemoProfileForm({
  groupKey,
}: CreateDemoProfileFormProps) {
  const [
    state,
    formAction,
    isPending,
  ] = useActionState(
    createDemoProfileAction,
    initialState
  )

  return (
    <details className="group overflow-hidden rounded-2xl border border-blue-200 bg-white shadow-sm">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-4 transition hover:bg-blue-50 sm:p-5">
        <span className="min-w-0">
          <span className="block font-bold text-slate-950">
            Create Demo Profile
          </span>

          <span className="mt-1 block text-sm leading-5 text-slate-600">
            Add a portable identity to this scenario.
          </span>
        </span>

        <span className="shrink-0 text-xl font-bold text-blue-700 transition group-open:rotate-45">
          +
        </span>
      </summary>

      <form
        action={formAction}
        className="space-y-4 border-t border-blue-100 p-4 sm:p-5"
      >
        <input
          type="hidden"
          name="groupKey"
          value={groupKey}
        />

        <div>
          <label
            htmlFor="demo-profile-label"
            className="block text-sm font-bold text-slate-900"
          >
            Profile name
          </label>

          <input
            id="demo-profile-label"
            name="label"
            type="text"
            required
            placeholder="Elysian Hair Salon"
            className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>

        <div>
          <label
            htmlFor="demo-profile-role"
            className="block text-sm font-bold text-slate-900"
          >
            Experience role
          </label>

          <select
            id="demo-profile-role"
            name="role"
            defaultValue="business"
            className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          >
            <option value="customer">
              Customer
            </option>

            <option value="business">
              Business
            </option>

            <option value="organization">
              Organization
            </option>

            <option value="admin">
              Admin
            </option>

            <option value="owner">
              Owner
            </option>

            <option value="support">
              Support
            </option>
          </select>
        </div>

        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <input
            name="isPrimary"
            type="checkbox"
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-blue-500"
          />

          <span>
            <span className="block text-sm font-bold text-slate-900">
              Primary profile for this role
            </span>

            <span className="mt-0.5 block text-xs leading-5 text-slate-600">
              Makes this the default identity when previewing this role.
            </span>
          </span>
        </label>

        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5">
          <p className="text-xs font-medium leading-5 text-amber-800">
            This creates a portable demo identity first. Linking it to a full RaiseHub account and seeded experience comes next.
          </p>
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

        <button
          type="submit"
          disabled={isPending}
          className="rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending
            ? 'Creating...'
            : 'Create Profile'}
        </button>
      </form>
    </details>
  )
}

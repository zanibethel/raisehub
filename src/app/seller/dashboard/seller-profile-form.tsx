'use client'

import { useActionState } from 'react'

import {
  updateSellerProfileAction,
  type SellerProfileActionState,
} from './actions'

const initialState: SellerProfileActionState = {
  success: false,
  message: '',
}

type Props = {
  displayName: string
  bio: string
  avatarUrl: string
}

export default function SellerProfileForm({
  displayName,
  bio,
  avatarUrl,
}: Props) {
  const [state, formAction, pending] = useActionState(
    updateSellerProfileAction,
    initialState
  )

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="seller-display-name" className="text-sm font-semibold text-gray-800">
          Display name
        </label>
        <input
          id="seller-display-name"
          name="displayName"
          required
          minLength={2}
          maxLength={80}
          defaultValue={displayName}
          className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
        />
      </div>

      <div>
        <label htmlFor="seller-bio" className="text-sm font-semibold text-gray-800">
          Short story <span className="font-normal text-gray-500">(optional)</span>
        </label>
        <textarea
          id="seller-bio"
          name="bio"
          rows={3}
          maxLength={280}
          defaultValue={bio}
          placeholder="Why does this fundraiser matter to you?"
          className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
        />
      </div>

      <details className="rounded-xl border border-gray-200 bg-gray-50 p-4">
        <summary className="cursor-pointer text-sm font-semibold text-gray-800">
          Profile image <span className="font-normal text-gray-500">(optional)</span>
        </summary>
        <div className="mt-3">
          <label htmlFor="seller-avatar-url" className="sr-only">
            Profile image URL
          </label>
          <input
            id="seller-avatar-url"
            name="avatarUrl"
            type="url"
            inputMode="url"
            defaultValue={avatarUrl}
            placeholder="https://…"
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
          <p className="mt-2 text-xs text-gray-500">Paste a secure hosted image URL if you want to add a photo.</p>
        </div>
      </details>

      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-11 items-center justify-center rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? 'Saving…' : 'Save seller profile'}
      </button>

      {state.message ? (
        <p
          className={`rounded-xl px-4 py-3 text-sm ${
            state.success
              ? 'border border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border border-red-200 bg-red-50 text-red-700'
          }`}
          role="status"
        >
          {state.message}
        </p>
      ) : null}
    </form>
  )
}

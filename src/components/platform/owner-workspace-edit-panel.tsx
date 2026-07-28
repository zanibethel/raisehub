'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

import type { WorkspaceCardData } from '@/lib/types/identity-access'

type Props = { workspace: WorkspaceCardData }

export default function OwnerWorkspaceEditPanel({ workspace }: Props) {
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSaving(true)
    setMessage(null)

    const formData = new FormData(event.currentTarget)
    const response = await fetch('/api/owner/workspaces/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workspaceId: workspace.id,
        workspaceRole: workspace.role,
        businessName: formData.get('businessName'),
        displayName: formData.get('displayName'),
        email: formData.get('email'),
        phone: formData.get('phone'),
        address: formData.get('address'),
        websiteUrl: formData.get('websiteUrl'),
        description: formData.get('description'),
      }),
    })

    const result = (await response.json().catch(() => ({}))) as { error?: string }
    setIsSaving(false)

    if (!response.ok) {
      setMessage(result.error ?? 'Unable to save workspace details.')
      return
    }

    setMessage('Workspace details updated by Owner.')
    setIsEditing(false)
    router.refresh()
  }

  if (!isEditing) {
    return (
      <div className="border-b border-slate-200 bg-amber-50 p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-amber-800">Owner override</p>
            <p className="mt-1 text-sm leading-6 text-amber-950">
              Support Mode stays read-only until you deliberately enable editing.
            </p>
          </div>
          <button
            type="button"
            onClick={() => { setIsEditing(true); setMessage(null) }}
            className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-800"
          >
            Edit as Owner
          </button>
        </div>
        {message ? <p className="mt-3 text-sm font-semibold text-green-800">{message}</p> : null}
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="border-b border-amber-300 bg-amber-50 p-4 sm:p-6">
      <div className="rounded-xl border border-amber-300 bg-white p-4">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-amber-800">Editing as RaiseHub Owner</p>
        <p className="mt-2 text-sm leading-6 text-slate-700">
          Changes save directly to this client workspace. Review carefully before saving.
        </p>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {workspace.role === 'business' ? (
          <label className="text-sm font-semibold text-slate-700">Business name
            <input name="businessName" defaultValue={workspace.businessName ?? workspace.name} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5" />
          </label>
        ) : (
          <label className="text-sm font-semibold text-slate-700">Display name
            <input name="displayName" defaultValue={workspace.displayName ?? workspace.name} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5" />
          </label>
        )}
        <label className="text-sm font-semibold text-slate-700">Email
          <input name="email" type="email" defaultValue={workspace.email ?? ''} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5" />
        </label>
        <label className="text-sm font-semibold text-slate-700">Phone
          <input name="phone" defaultValue={workspace.phone ?? ''} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5" />
        </label>
        <label className="text-sm font-semibold text-slate-700">Address
          <input name="address" defaultValue={workspace.address ?? ''} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5" />
        </label>
        {workspace.role === 'business' ? (
          <label className="text-sm font-semibold text-slate-700 sm:col-span-2">Website
            <input name="websiteUrl" defaultValue={workspace.websiteUrl ?? ''} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5" />
          </label>
        ) : null}
        {workspace.role === 'business' ? (
          <label className="text-sm font-semibold text-slate-700 sm:col-span-2">Description
            <textarea name="description" rows={4} defaultValue={workspace.description ?? ''} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5" />
          </label>
        ) : null}
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <button disabled={isSaving} className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60">
          {isSaving ? 'Saving…' : 'Save Owner changes'}
        </button>
        <button type="button" onClick={() => { setIsEditing(false); setMessage(null) }} className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700">
          Cancel
        </button>
      </div>
      {message ? <p className="mt-3 text-sm font-semibold text-rose-700">{message}</p> : null}
    </form>
  )
}

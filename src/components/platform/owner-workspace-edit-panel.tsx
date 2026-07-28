'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

import type { WorkspaceCardData } from '@/lib/types/identity-access'

type WorkspaceManagerData = WorkspaceCardData & {
  address?: string | null
  websiteUrl?: string | null
  logoUrl?: string | null
  description?: string | null
  category?: string | null
  facebookUrl?: string | null
  instagramUrl?: string | null
  tiktokUrl?: string | null
}

type Props = { workspace: WorkspaceManagerData }

export default function OwnerWorkspaceEditPanel({ workspace }: Props) {
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const nextIsDemo = formData.get('environment') === 'demo'

    if (nextIsDemo !== Boolean(workspace.isDemo)) {
      const confirmed = window.confirm(
        nextIsDemo
          ? 'Move this workspace to Demo? It will be excluded from production workspace reporting and discovery.'
          : 'Move this workspace to Production? Confirm this is a real workspace that should be eligible for production reporting and visibility.'
      )
      if (!confirmed) return
    }

    setIsSaving(true)
    setMessage(null)

    const response = await fetch('/api/owner/workspaces/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workspaceId: workspace.id,
        workspaceRole: workspace.role,
        name: formData.get('name'),
        email: formData.get('email'),
        phone: formData.get('phone'),
        address: formData.get('address'),
        websiteUrl: formData.get('websiteUrl'),
        logoUrl: formData.get('logoUrl'),
        description: formData.get('description'),
        category: formData.get('category'),
        facebookUrl: formData.get('facebookUrl'),
        instagramUrl: formData.get('instagramUrl'),
        tiktokUrl: formData.get('tiktokUrl'),
        isDemo: nextIsDemo,
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
            <p className="mt-1 text-sm leading-6 text-amber-950">Support Mode is locked until you deliberately enable editing.</p>
          </div>
          <button type="button" onClick={() => { setIsEditing(true); setMessage(null) }} className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-800">Enable Owner Editing</button>
        </div>
        {message ? <p className="mt-3 text-sm font-semibold text-green-800">{message}</p> : null}
      </div>
    )
  }

  const businessFields = workspace.role === 'business'
  const organizationFields = workspace.role === 'organization'

  return (
    <form onSubmit={handleSubmit} className="border-b border-amber-300 bg-amber-50 p-4 sm:p-6">
      <div className="rounded-xl border border-amber-300 bg-white p-4">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-amber-800">Owner Editing Enabled</p>
        <p className="mt-2 text-sm leading-6 text-slate-700">Changes write directly to this workspace. Environment changes also affect production reporting and discovery.</p>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-semibold text-slate-700">Account name<input name="name" defaultValue={workspace.name} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5" /></label>
        <label className="text-sm font-semibold text-slate-700">Data environment<select name="environment" defaultValue={workspace.isDemo ? 'demo' : 'production'} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5"><option value="production">Production</option><option value="demo">Demo</option></select></label>
        <label className="text-sm font-semibold text-slate-700">Email<input name="email" type="email" defaultValue={workspace.email ?? ''} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5" /></label>
        <label className="text-sm font-semibold text-slate-700">Phone<input name="phone" defaultValue={workspace.phone ?? ''} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5" /></label>
        <label className="text-sm font-semibold text-slate-700 sm:col-span-2">Address<input name="address" defaultValue={workspace.address ?? ''} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5" /></label>

        {(businessFields || organizationFields) ? <>
          <label className="text-sm font-semibold text-slate-700">Website<input name="websiteUrl" type="url" defaultValue={workspace.websiteUrl ?? ''} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5" /></label>
          <label className="text-sm font-semibold text-slate-700">Logo URL<input name="logoUrl" type="url" defaultValue={workspace.logoUrl ?? ''} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5" /></label>
          <label className="text-sm font-semibold text-slate-700 sm:col-span-2">Description<textarea name="description" rows={4} defaultValue={workspace.description ?? ''} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5" /></label>
        </> : null}

        {businessFields ? <>
          <label className="text-sm font-semibold text-slate-700 sm:col-span-2">Category<input name="category" defaultValue={workspace.category ?? ''} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5" /></label>
          <label className="text-sm font-semibold text-slate-700">Facebook URL<input name="facebookUrl" type="url" defaultValue={workspace.facebookUrl ?? ''} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5" /></label>
          <label className="text-sm font-semibold text-slate-700">Instagram URL<input name="instagramUrl" type="url" defaultValue={workspace.instagramUrl ?? ''} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5" /></label>
          <label className="text-sm font-semibold text-slate-700 sm:col-span-2">TikTok URL<input name="tiktokUrl" type="url" defaultValue={workspace.tiktokUrl ?? ''} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5" /></label>
        </> : null}
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <button disabled={isSaving} className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60">{isSaving ? 'Saving…' : 'Save Owner Changes'}</button>
        <button type="button" onClick={() => { setIsEditing(false); setMessage(null) }} className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700">Disable Editing</button>
      </div>
      {message ? <p className="mt-3 text-sm font-semibold text-rose-700">{message}</p> : null}
    </form>
  )
}

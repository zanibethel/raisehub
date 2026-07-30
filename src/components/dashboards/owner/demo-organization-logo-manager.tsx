'use client'

import { useEffect, useState } from 'react'

type DemoOrganization = {
  id: string
  name: string
  logoUrl: string | null
  demoGroup: string | null
}

type ResponsePayload = {
  organizations?: DemoOrganization[]
  error?: string
  logoUrl?: string
}

export default function DemoOrganizationLogoManager() {
  const [organizations, setOrganizations] = useState<DemoOrganization[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function loadOrganizations() {
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/owner/demo-organization-logos', { cache: 'no-store' })
      const payload = (await response.json()) as ResponsePayload
      if (!response.ok) throw new Error(payload.error || 'Demo organizations could not be loaded.')
      setOrganizations(payload.organizations ?? [])
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Demo organizations could not be loaded.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadOrganizations()
  }, [])

  async function uploadLogo(organization: DemoOrganization, file: File | null) {
    if (!file) return
    setBusyId(organization.id)
    setMessage('')
    setError('')

    try {
      const formData = new FormData()
      formData.set('organizationId', organization.id)
      formData.set('logo', file)
      const response = await fetch('/api/owner/demo-organization-logos', { method: 'POST', body: formData })
      const payload = (await response.json()) as ResponsePayload
      if (!response.ok) throw new Error(payload.error || 'Logo could not be uploaded.')

      setOrganizations((current) => current.map((item) =>
        item.id === organization.id ? { ...item, logoUrl: payload.logoUrl ?? item.logoUrl } : item
      ))
      setMessage(`${organization.name} logo updated.`)
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Logo could not be uploaded.')
    } finally {
      setBusyId(null)
    }
  }

  async function removeLogo(organization: DemoOrganization) {
    setBusyId(organization.id)
    setMessage('')
    setError('')

    try {
      const response = await fetch('/api/owner/demo-organization-logos', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId: organization.id }),
      })
      const payload = (await response.json()) as ResponsePayload
      if (!response.ok) throw new Error(payload.error || 'Logo could not be removed.')

      setOrganizations((current) => current.map((item) =>
        item.id === organization.id ? { ...item, logoUrl: null } : item
      ))
      setMessage(`${organization.name} logo removed.`)
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : 'Logo could not be removed.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <section className="mt-5 rounded-3xl border border-blue-200 bg-white shadow-sm">
      <div className="border-b border-blue-100 p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">Demo presentation</p>
            <h2 className="mt-1 text-xl font-bold text-slate-950 sm:text-2xl">Demo Organization Logos</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Upload polished logos for Demo organizations. These owner-only controls can update only canonical organizations marked as Demo.
            </p>
          </div>
          <button type="button" onClick={() => void loadOrganizations()} disabled={loading || busyId !== null} className="w-fit rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
            Refresh
          </button>
        </div>
        {message ? <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800" role="status">{message}</p> : null}
        {error ? <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-800" role="alert">{error}</p> : null}
      </div>

      <div className="p-4 sm:p-6">
        {loading ? (
          <p className="text-sm text-slate-600">Loading Demo organizations…</p>
        ) : organizations.length === 0 ? (
          <p className="text-sm text-slate-600">No Demo organizations are available yet.</p>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {organizations.map((organization) => {
              const isBusy = busyId === organization.id
              return (
                <article key={organization.id} className="flex min-w-0 items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    {organization.logoUrl ? (
                      <img src={organization.logoUrl} alt={`${organization.name} logo`} className="h-full w-full object-contain p-1" />
                    ) : (
                      <span className="text-lg font-black text-blue-700">
                        {organization.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-bold text-slate-950">{organization.name}</h3>
                    <p className="mt-1 truncate text-xs text-slate-500">{organization.demoGroup || 'Demo organization'}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <label className={`cursor-pointer rounded-lg bg-blue-700 px-3 py-2 text-xs font-bold text-white hover:bg-blue-800 ${isBusy ? 'pointer-events-none opacity-50' : ''}`}>
                        {organization.logoUrl ? 'Replace logo' : 'Upload logo'}
                        <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="sr-only" disabled={isBusy} onChange={(event) => {
                          const file = event.target.files?.[0] ?? null
                          void uploadLogo(organization, file)
                          event.currentTarget.value = ''
                        }} />
                      </label>
                      {organization.logoUrl ? (
                        <button type="button" onClick={() => void removeLogo(organization)} disabled={isBusy} className="rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-50">Remove</button>
                      ) : null}
                      {isBusy ? <span className="text-xs font-semibold text-slate-500">Saving…</span> : null}
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}
        <p className="mt-4 text-xs leading-5 text-slate-500">Best results: square PNG or WebP, around 512 × 512, no larger than 5 MB.</p>
      </div>
    </section>
  )
}

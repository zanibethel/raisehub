'use client'

import { useEffect, useState } from 'react'

type DemoBusiness = {
  id: string
  name: string
  logoUrl: string | null
  demoGroup: string | null
}

type LogoManagerResponse = {
  businesses?: DemoBusiness[]
  error?: string
  logoUrl?: string
}

export default function DemoBusinessLogoManager() {
  const [businesses, setBusinesses] = useState<DemoBusiness[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function loadBusinesses() {
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/owner/demo-business-logos', { cache: 'no-store' })
      const payload = (await response.json()) as LogoManagerResponse

      if (!response.ok) throw new Error(payload.error || 'Demo businesses could not be loaded.')
      setBusinesses(payload.businesses ?? [])
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Demo businesses could not be loaded.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadBusinesses()
  }, [])

  async function uploadLogo(business: DemoBusiness, file: File | null) {
    if (!file) return

    setBusyId(business.id)
    setMessage('')
    setError('')

    try {
      const formData = new FormData()
      formData.set('profileId', business.id)
      formData.set('logo', file)

      const response = await fetch('/api/owner/demo-business-logos', {
        method: 'POST',
        body: formData,
      })
      const payload = (await response.json()) as LogoManagerResponse

      if (!response.ok) throw new Error(payload.error || 'Logo could not be uploaded.')

      setBusinesses((current) =>
        current.map((item) =>
          item.id === business.id ? { ...item, logoUrl: payload.logoUrl ?? item.logoUrl } : item
        )
      )
      setMessage(`${business.name} logo updated.`)
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Logo could not be uploaded.')
    } finally {
      setBusyId(null)
    }
  }

  async function removeLogo(business: DemoBusiness) {
    setBusyId(business.id)
    setMessage('')
    setError('')

    try {
      const response = await fetch('/api/owner/demo-business-logos', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId: business.id }),
      })
      const payload = (await response.json()) as LogoManagerResponse

      if (!response.ok) throw new Error(payload.error || 'Logo could not be removed.')

      setBusinesses((current) =>
        current.map((item) => (item.id === business.id ? { ...item, logoUrl: null } : item))
      )
      setMessage(`${business.name} logo removed.`)
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : 'Logo could not be removed.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <section className="mt-5 rounded-3xl border border-emerald-200 bg-white shadow-sm">
      <div className="border-b border-emerald-100 p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">Demo presentation</p>
            <h2 className="mt-1 text-xl font-bold text-slate-950 sm:text-2xl">Demo Business Logos</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Upload polished logos for Demo businesses. These controls are owner-only and can update only records marked as Demo.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadBusinesses()}
            disabled={loading || busyId !== null}
            className="w-fit rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Refresh
          </button>
        </div>

        {message ? (
          <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800" role="status">
            {message}
          </p>
        ) : null}
        {error ? (
          <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-800" role="alert">
            {error}
          </p>
        ) : null}
      </div>

      <div className="p-4 sm:p-6">
        {loading ? (
          <p className="text-sm text-slate-600">Loading Demo businesses…</p>
        ) : businesses.length === 0 ? (
          <p className="text-sm text-slate-600">No Demo business profiles are available yet.</p>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {businesses.map((business) => {
              const isBusy = busyId === business.id

              return (
                <article key={business.id} className="flex min-w-0 items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    {business.logoUrl ? (
                      <img src={business.logoUrl} alt={`${business.name} logo`} className="h-full w-full object-contain p-1" />
                    ) : (
                      <span className="text-lg font-black text-blue-700" aria-label="No logo uploaded">
                        {business.name
                          .split(/\s+/)
                          .slice(0, 2)
                          .map((part) => part[0])
                          .join('')
                          .toUpperCase()}
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-bold text-slate-950">{business.name}</h3>
                    <p className="mt-1 truncate text-xs text-slate-500">{business.demoGroup || 'Demo business'}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <label className={`cursor-pointer rounded-lg bg-blue-700 px-3 py-2 text-xs font-bold text-white hover:bg-blue-800 ${isBusy ? 'pointer-events-none opacity-50' : ''}`}>
                        {business.logoUrl ? 'Replace logo' : 'Upload logo'}
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp,image/gif"
                          className="sr-only"
                          disabled={isBusy}
                          onChange={(event) => {
                            const file = event.target.files?.[0] ?? null
                            void uploadLogo(business, file)
                            event.currentTarget.value = ''
                          }}
                        />
                      </label>

                      {business.logoUrl ? (
                        <button
                          type="button"
                          onClick={() => void removeLogo(business)}
                          disabled={isBusy}
                          className="rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Remove
                        </button>
                      ) : null}

                      {isBusy ? <span className="text-xs font-semibold text-slate-500">Saving…</span> : null}
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}

        <p className="mt-4 text-xs leading-5 text-slate-500">
          Best results: square PNG or WebP, around 512 × 512, no larger than 5 MB.
        </p>
      </div>
    </section>
  )
}

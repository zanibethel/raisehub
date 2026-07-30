'use client'

import { useState } from 'react'

type Props = {
  organizationId: string
  initialLogoUrl: string
}

export default function OrganizationLogoManager({ organizationId, initialLogoUrl }: Props) {
  const [logoUrl, setLogoUrl] = useState(initialLogoUrl)
  const [file, setFile] = useState<File | null>(null)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function uploadLogo() {
    if (!file) {
      setMessage('Choose an image first.')
      return
    }

    setLoading(true)
    setMessage('')
    const formData = new FormData()
    formData.set('organizationId', organizationId)
    formData.set('logo', file)

    const response = await fetch('/api/organization/logo', { method: 'POST', body: formData })
    const result = (await response.json().catch(() => ({}))) as { logoUrl?: string; error?: string }

    if (!response.ok || !result.logoUrl) {
      setMessage(result.error ?? 'Logo could not be uploaded.')
      setLoading(false)
      return
    }

    setLogoUrl(result.logoUrl)
    setFile(null)
    setMessage('Organization logo saved.')
    setLoading(false)
  }

  async function removeLogo() {
    setLoading(true)
    setMessage('')
    const response = await fetch('/api/organization/logo', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ organizationId }),
    })
    const result = (await response.json().catch(() => ({}))) as { error?: string }

    if (!response.ok) {
      setMessage(result.error ?? 'Logo could not be removed.')
      setLoading(false)
      return
    }

    setLogoUrl('')
    setFile(null)
    setMessage('Organization logo removed.')
    setLoading(false)
  }

  return (
    <details className="group rounded-2xl border border-blue-100 bg-white/90 shadow-xl backdrop-blur">
      <summary className="cursor-pointer list-none px-5 py-4 sm:px-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            {logoUrl ? (
              <img src={logoUrl} alt="Organization logo" className="h-12 w-12 rounded-xl border border-gray-200 object-cover" />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-dashed border-blue-200 bg-blue-50 text-lg font-bold text-blue-700">O</div>
            )}
            <div className="min-w-0">
              <p className="font-bold text-gray-900">Organization logo</p>
              <p className="mt-1 truncate text-sm text-gray-600">Shown on campaigns and organization surfaces</p>
            </div>
          </div>
          <span className="shrink-0 rounded-full bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 group-open:hidden">Manage</span>
        </div>
      </summary>

      <div className="space-y-4 border-t border-blue-100 p-5 sm:p-6">
        <p className="text-sm leading-6 text-gray-600">Upload a square PNG, JPG, WebP, or GIF up to 5 MB. Replacing a logo removes the previous stored file.</p>
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          className="block w-full rounded-xl border border-gray-300 bg-white p-3 text-sm"
        />
        <div className="flex flex-col gap-3 sm:flex-row">
          <button type="button" onClick={uploadLogo} disabled={loading || !file} className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50">
            {loading ? 'Saving…' : logoUrl ? 'Replace logo' : 'Upload logo'}
          </button>
          {logoUrl ? (
            <button type="button" onClick={removeLogo} disabled={loading} className="rounded-xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-bold text-red-700 hover:bg-red-100 disabled:opacity-50">Remove logo</button>
          ) : null}
        </div>
        {message ? <p className="text-sm text-gray-700" role="status">{message}</p> : null}
      </div>
    </details>
  )
}

'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

type SeedResponse = {
  error?: string
  groupKey?: string
}

export default function SeedCuratedDemoButton() {
  const router = useRouter()
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>(
    'idle'
  )
  const [message, setMessage] = useState<string | null>(null)

  async function handleSeed() {
    if (status === 'loading') return

    setStatus('loading')
    setMessage('Creating the Lakeview demo accounts and connected scenario...')

    try {
      const response = await fetch('/api/owner/demo/seed-curated', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      const payload = (await response.json().catch(() => ({}))) as SeedResponse

      if (!response.ok) {
        throw new Error(
          payload.error ?? 'The Lakeview demo could not be created. Please try again.'
        )
      }

      const groupKey = payload.groupKey ?? 'lakeview_launch_2026'

      setStatus('success')
      setMessage('Lakeview demo created. Opening the completed scenario...')
      router.push(`/dashboard/owner/demo-groups/${encodeURIComponent(groupKey)}`)
      router.refresh()
    } catch (error) {
      setStatus('error')
      setMessage(
        error instanceof Error
          ? error.message
          : 'The Lakeview demo could not be created. Please try again.'
      )
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleSeed}
        disabled={status === 'loading'}
        className="inline-flex min-h-12 w-full items-center justify-center rounded-2xl bg-blue-700 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-800 disabled:cursor-wait disabled:opacity-70 sm:w-auto"
      >
        {status === 'loading' ? 'Creating Lakeview demo…' : 'Create Lakeview Demo'}
      </button>

      {message ? (
        <p
          role="status"
          className={`mt-3 text-sm font-semibold ${
            status === 'error'
              ? 'text-rose-700'
              : status === 'success'
                ? 'text-emerald-700'
                : 'text-slate-600'
          }`}
        >
          {message}
        </p>
      ) : null}
    </div>
  )
}

'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

type BusinessLifecycleBannerProps = {
  businessId: string
  status: string
  archivedAt?: string | null
  archiveReason?: string | null
  restoreRequestedAt?: string | null
}

function formatDate(value?: string | null) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export default function BusinessLifecycleBanner({
  businessId,
  status,
  archivedAt,
  archiveReason,
  restoreRequestedAt,
}: BusinessLifecycleBannerProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (status !== 'archived' && status !== 'restore_requested') return null

  const isRequested = status === 'restore_requested'
  const archivedDate = formatDate(archivedAt)
  const requestedDate = formatDate(restoreRequestedAt)

  async function requestRestoration() {
    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/business/workspace/restoration-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId }),
      })
      const data = (await response.json().catch(() => ({}))) as { error?: string }

      if (!response.ok) throw new Error(data.error || 'Could not request restoration.')
      router.refresh()
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Could not request restoration.'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="rounded-2xl border border-amber-300 bg-amber-50 p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-amber-800">
            {isRequested ? 'Restoration requested' : 'Business archived'}
          </p>
          <h2 className="mt-1 text-xl font-bold text-amber-950">
            {isRequested
              ? 'RaiseHub is reviewing this business workspace.'
              : "This business isn't currently live on RaiseHub."}
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-amber-900">
            Your supporter account remains active. You can continue updating this
            business profile, offers, images, payout setup, and settings, but the
            business and its offers are hidden from production until restored.
          </p>

          <div className="mt-3 space-y-1 text-xs text-amber-800">
            {archiveReason ? <p>Archive reason: {archiveReason}</p> : null}
            {archivedDate ? <p>Archived: {archivedDate}</p> : null}
            {requestedDate ? <p>Requested: {requestedDate}</p> : null}
          </div>

          {error ? <p className="mt-3 text-sm font-semibold text-red-700">{error}</p> : null}
        </div>

        {!isRequested ? (
          <button
            type="button"
            onClick={requestRestoration}
            disabled={isSubmitting}
            className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl bg-amber-900 px-4 py-2 text-sm font-bold text-white transition hover:bg-amber-950 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? 'Submitting…' : 'Request Restoration'}
          </button>
        ) : (
          <span className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-full border border-blue-300 bg-blue-50 px-4 py-2 text-sm font-bold text-blue-800">
            Review pending
          </span>
        )}
      </div>
    </section>
  )
}

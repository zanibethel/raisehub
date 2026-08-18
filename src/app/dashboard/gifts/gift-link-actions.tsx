'use client'

import { useState } from 'react'

import { regenerateGiftClaimLinkAction } from './actions'

export default function GiftLinkActions({ giftId }: { giftId: string }) {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [claimPath, setClaimPath] = useState('')

  async function regenerate() {
    if (loading) return
    setLoading(true)
    setMessage('')

    const result = await regenerateGiftClaimLinkAction(giftId)

    if (result.status === 'error') {
      setMessage(result.message)
      setLoading(false)
      return
    }

    setClaimPath(result.claimPath)
    setMessage('New private gift link created. Any previous unclaimed link is now invalid.')
    setLoading(false)
  }

  async function copy() {
    if (!claimPath) return
    await navigator.clipboard.writeText(`${window.location.origin}${claimPath}`)
    setMessage('Gift link copied.')
  }

  async function share() {
    if (!claimPath) return
    const url = `${window.location.origin}${claimPath}`

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Your RaiseHub Gift Pass',
          text: 'Open this private link to claim your RaiseHub Pass.',
          url,
        })
        return
      } catch {
        // Falling back to copy is intentional when the share sheet is dismissed.
      }
    }

    await navigator.clipboard.writeText(url)
    setMessage('Gift link copied.')
  }

  return (
    <div className="space-y-2">
      {!claimPath ? (
        <button
          type="button"
          onClick={regenerate}
          disabled={loading}
          className="w-full rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-60"
        >
          {loading ? 'Generating…' : 'Generate New Gift Link'}
        </button>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={copy}
            className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white"
          >
            Copy Link
          </button>
          <button
            type="button"
            onClick={share}
            className="rounded-xl border border-emerald-300 bg-white px-4 py-2.5 text-sm font-bold text-emerald-800"
          >
            Share Gift
          </button>
        </div>
      )}
      {message ? <p className="text-xs text-slate-600" aria-live="polite">{message}</p> : null}
    </div>
  )
}

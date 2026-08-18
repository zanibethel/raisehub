'use client'

import { useState } from 'react'

import { regenerateGiftClaimLinkAction } from '@/app/dashboard/gifts/actions'

export default function GiftSharePanel({ giftId }: { giftId: string }) {
  const [claimPath, setClaimPath] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  async function generateLink() {
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
    setMessage('Private gift link created. Any previous unclaimed link is now invalid.')
    setLoading(false)
  }

  function giftUrl() {
    return `${window.location.origin}${claimPath}`
  }

  async function copyLink() {
    if (!claimPath) return
    await navigator.clipboard.writeText(giftUrl())
    setMessage('Gift link copied. Send it only to the intended recipient.')
  }

  async function shareGift() {
    if (!claimPath) return
    const url = giftUrl()

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Your RaiseHub Gift Pass',
          text: 'I sent you a RaiseHub Pass. Open this private link to claim six months of local savings.',
          url,
        })
        return
      } catch {
        // The recipient may cancel the native share sheet; copying remains safe.
      }
    }

    await navigator.clipboard.writeText(url)
    setMessage('Gift link copied because native sharing is unavailable here.')
  }

  return (
    <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-950">
      <p className="font-bold">Share your gift securely</p>
      <p className="mt-1 text-sm">
        Generate the private claim link only when you are ready to send it. The recipient’s six-month pass begins when they claim it.
      </p>

      {!claimPath ? (
        <button
          type="button"
          onClick={generateLink}
          disabled={loading}
          className="mt-4 w-full rounded-xl bg-emerald-700 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-60"
        >
          {loading ? 'Generating…' : 'Generate Private Gift Link'}
        </button>
      ) : (
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={copyLink}
            className="rounded-xl bg-emerald-700 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-800"
          >
            Copy Gift Link
          </button>
          <button
            type="button"
            onClick={shareGift}
            className="rounded-xl border border-emerald-300 bg-white px-4 py-3 text-sm font-bold text-emerald-800 hover:bg-emerald-100"
          >
            Share Gift
          </button>
        </div>
      )}

      {message ? (
        <p className="mt-3 text-sm font-semibold" aria-live="polite">
          {message}
        </p>
      ) : null}
    </div>
  )
}

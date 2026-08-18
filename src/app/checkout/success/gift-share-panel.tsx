'use client'

import { useState } from 'react'

export default function GiftSharePanel({ claimPath }: { claimPath: string }) {
  const [message, setMessage] = useState('')

  function giftUrl() {
    return `${window.location.origin}${claimPath}`
  }

  async function copyLink() {
    await navigator.clipboard.writeText(giftUrl())
    setMessage('Gift link copied. Send it only to the intended recipient.')
  }

  async function shareGift() {
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
      <p className="font-bold">Your private gift link is ready</p>
      <p className="mt-1 text-sm">
        The recipient’s six-month pass begins when they claim it. Treat this link like a gift code and send it only to them.
      </p>
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
      {message ? <p className="mt-3 text-sm font-semibold" aria-live="polite">{message}</p> : null}
    </div>
  )
}

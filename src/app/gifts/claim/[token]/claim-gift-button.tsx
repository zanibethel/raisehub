'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

import { claimGiftPassAction } from '@/app/gifts/actions'

export default function ClaimGiftButton({ token }: { token: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [claimed, setClaimed] = useState(false)

  async function handleClaim() {
    if (loading || claimed) return
    setLoading(true)
    setMessage('')

    const result = await claimGiftPassAction(token)

    if (result.status === 'error') {
      setMessage(result.message)
      setLoading(false)
      return
    }

    setClaimed(true)
    setLoading(false)
    setMessage(
      result.alreadyClaimed
        ? 'This gift is already active on your account.'
        : `Gift claimed! Your pass is active through ${new Date(result.expiresAt).toLocaleDateString()}.`
    )
    router.refresh()
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={handleClaim}
        disabled={loading || claimed}
        className="w-full rounded-xl bg-emerald-700 px-5 py-3 font-bold text-white hover:bg-emerald-800 disabled:opacity-60"
      >
        {loading ? 'Claiming Gift…' : claimed ? 'Gift Claimed ✓' : 'Claim My RaiseHub Pass'}
      </button>
      {message ? (
        <div
          className={`rounded-xl border p-3 text-sm ${claimed ? 'border-green-200 bg-green-50 text-green-900' : 'border-red-200 bg-red-50 text-red-700'}`}
          aria-live="polite"
        >
          {message}
        </div>
      ) : null}
      {claimed ? (
        <a
          href="/dashboard"
          className="block w-full rounded-xl border border-blue-200 bg-blue-50 px-5 py-3 text-center font-bold text-blue-800"
        >
          Open My Pass
        </a>
      ) : null}
    </div>
  )
}

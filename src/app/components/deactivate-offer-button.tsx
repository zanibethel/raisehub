'use client'

import { useState } from 'react'
import { deactivateOfferAction } from '@/app/dashboard/actions'

type DeactivateOfferButtonProps = {
  offerId: string
  offerTitle: string | null
}

export default function DeactivateOfferButton({
  offerId,
  offerTitle,
}: DeactivateOfferButtonProps) {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  // =========================================
  // 📴 DEACTIVATE OFFER
  // =========================================
  async function handleDeactivate() {
    const confirmed = window.confirm(
      `Deactivate "${offerTitle || 'this offer'}"? This will hide it from customers but keep history.`
    )

    if (!confirmed) return

    setLoading(true)
    setMessage('')

    const result = await deactivateOfferAction(offerId)

    if (result.error) {
      setMessage(result.error)
      setLoading(false)
      return
    }

    setMessage('Offer deactivated.')
    setLoading(false)
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleDeactivate}
        disabled={loading}
        className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
      >
        {loading ? 'Deactivating...' : 'Deactivate Offer'}
      </button>

      {message ? <p className="mt-2 text-xs text-red-600">{message}</p> : null}
    </div>
  )
}
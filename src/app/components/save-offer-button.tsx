'use client'

import { useState } from 'react'
import { addSavedOfferAction } from '@/app/offers/actions'

type SaveOfferButtonProps = {
  offerId: string
}

export default function SaveOfferButton({ offerId }: SaveOfferButtonProps) {
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSave() {
    setLoading(true)
    setMessage('')

    const result = await addSavedOfferAction(offerId)

    if (result.status === 'already-saved') {
      setMessage('Already on your pass.')
      setLoading(false)
      return
    }

    if (result.status === 'error') {
      setMessage(result.message)
      setLoading(false)
      return
    }

    setMessage('Added to your pass!')
    setLoading(false)

    window.location.reload()
  }

  return (
    <div className="mt-4">
      <button
        onClick={handleSave}
        disabled={loading}
        className="w-full rounded-lg bg-yellow-500 px-4 py-2 text-sm font-medium text-white hover:bg-yellow-600 disabled:opacity-50"
      >
        {loading ? 'Adding...' : 'Add to My Pass'}
      </button>

      {message ? (
        <p className="mt-2 text-xs text-gray-500">{message}</p>
      ) : null}
    </div>
  )
}

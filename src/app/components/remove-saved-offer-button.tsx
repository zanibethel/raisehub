'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type RemoveSavedOfferButtonProps = {
  offerId: string
}

export default function RemoveSavedOfferButton({
  offerId,
}: RemoveSavedOfferButtonProps) {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  async function handleRemove() {
    setLoading(true)
    setMessage('')

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setMessage('Please log in first.')
      setLoading(false)
      return
    }

    const { error } = await supabase
      .from('saved_offers')
      .delete()
      .eq('user_id', user.id)
      .eq('offer_id', offerId)

    if (error) {
      setMessage(error.message)
      setLoading(false)
      return
    }

    setMessage('Removed from your pass.')
    setLoading(false)

    window.location.reload()
  }

  return (
    <div className="mt-4">
      <button
        onClick={handleRemove}
        disabled={loading}
        className="w-full rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-100 disabled:opacity-50"
      >
        {loading ? 'Removing...' : 'Remove from Pass'}
      </button>

      {message ? (
        <p className="mt-2 text-xs text-gray-500">{message}</p>
      ) : null}
    </div>
  )
}
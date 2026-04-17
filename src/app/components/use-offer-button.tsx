'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type UseOfferButtonProps = {
  offerId: string
}

export default function UseOfferButton({ offerId }: UseOfferButtonProps) {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  async function handleUseOffer() {
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

    const { error } = await supabase.from('redemptions').insert({
      offer_id: offerId,
      user_id: user.id,
    })

    if (error) {
      if (error.code === '23505') {
        setMessage('You already used this offer.')
      } else {
        setMessage(error.message)
      }
      setLoading(false)
      return
    }

    setMessage('Offer used successfully!')
    setLoading(false)
    window.location.reload()
  }

  return (
    <div className="mt-4">
      <button
        onClick={handleUseOffer}
        disabled={loading}
        className="w-full rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
      >
        {loading ? 'Using...' : 'Use Offer'}
      </button>

      {message ? (
        <p className="mt-2 text-xs text-gray-500">{message}</p>
      ) : null}
    </div>
  )
}
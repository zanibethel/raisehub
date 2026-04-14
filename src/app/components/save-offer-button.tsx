'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type SaveOfferButtonProps = {
  offerId: string
}

export default function SaveOfferButton({ offerId }: SaveOfferButtonProps) {
  const supabase = createClient()
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSave() {
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

    const { error } = await supabase.from('saved_offers').insert({
      user_id: user.id,
      offer_id: offerId,
    })

    if (error) {
      if (error.code === '23505') {
        setMessage('Already saved.')
      } else {
        setMessage(error.message)
      }
      setLoading(false)
      return
    }

    setMessage('Saved to your pass!')
    setLoading(false)
  }

  return (
    <div className="mt-4">
      <button
        onClick={handleSave}
        disabled={loading}
        className="w-full rounded-lg bg-yellow-500 px-4 py-2 text-sm font-medium text-white hover:bg-yellow-600 disabled:opacity-50"
      >
        {loading ? 'Saving...' : 'Save for Pass'}
      </button>

      {message ? (
        <p className="mt-2 text-xs text-gray-500">{message}</p>
      ) : null}
    </div>
  )
}
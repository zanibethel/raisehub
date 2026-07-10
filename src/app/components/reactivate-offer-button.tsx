'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { reactivateOfferAction } from '@/app/dashboard/actions'

type ReactivateOfferButtonProps = {
  offerId: string
  offerTitle: string | null
}

export default function ReactivateOfferButton({
  offerId,
  offerTitle,
}: ReactivateOfferButtonProps) {
  const router = useRouter()

  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  async function handleReactivate() {
    setLoading(true)
    setMessage('')

    const result = await reactivateOfferAction(offerId)

    if (result.error) {
      setMessage(result.error)
      setLoading(false)
      return
    }

    router.refresh()
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleReactivate}
        disabled={loading}
        className="rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm font-semibold text-green-700 hover:bg-green-100 disabled:opacity-50"
      >
        {loading
          ? 'Reactivating...'
          : `Reactivate${offerTitle ? ` ${offerTitle}` : ' Offer'}`}
      </button>

      {message ? (
        <p className="mt-2 rounded-lg bg-red-50 p-3 text-xs text-red-700">
          {message}
        </p>
      ) : null}
    </div>
  )
}

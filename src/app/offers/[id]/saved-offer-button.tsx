'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

import {
  addSavedOfferAction,
  removeSavedOfferAction,
} from '@/app/offers/actions'

type SavedOfferButtonProps = {
  offerId: string
  initiallySaved: boolean
}

export default function SavedOfferButton({
  offerId,
  initiallySaved,
}: SavedOfferButtonProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isSaved, setIsSaved] = useState(initiallySaved)
  const [message, setMessage] = useState<string | null>(null)

  function handleToggle() {
    setMessage(null)

    startTransition(async () => {
      const result = isSaved
        ? await removeSavedOfferAction(offerId)
        : await addSavedOfferAction(offerId)

      if (result.status === 'error') {
        setMessage(result.message)
        return
      }

      const nextSaved = isSaved
        ? result.status !== 'success'
        : true

      setIsSaved(nextSaved)
      setMessage(
        nextSaved
          ? 'Deal saved to My Pass.'
          : 'Deal removed from My Pass.'
      )
      router.refresh()
    })
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleToggle}
        disabled={isPending}
        aria-pressed={isSaved}
        className={
          isSaved
            ? 'inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-green-200 bg-white px-5 py-3 text-center text-sm font-semibold text-green-700 transition hover:bg-green-50 disabled:cursor-wait disabled:opacity-70'
            : 'inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-green-700 px-5 py-3 text-center text-sm font-semibold text-white transition hover:bg-green-800 disabled:cursor-wait disabled:opacity-70'
        }
      >
        {isPending
          ? 'Updating…'
          : isSaved
            ? 'Remove Saved Deal'
            : 'Save Deal'}
      </button>

      {message ? (
        <p
          aria-live="polite"
          className="mt-2 text-center text-sm text-gray-600"
        >
          {message}
        </p>
      ) : null}
    </div>
  )
}

'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

import { rejectRedemptionAction } from '@/app/redemptions/actions'

type Props = {
  redemptionId: string
}

export default function BusinessRedemptionRejectButton({ redemptionId }: Props) {
  const router = useRouter()
  const [message, setMessage] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleReject() {
    const confirmed = window.confirm(
      'Report this redemption as unauthorized? It will remain in the audit trail but will not count toward confirmed redemptions, customer value, savings, or future rewards.'
    )

    if (!confirmed) return

    setMessage('')

    startTransition(async () => {
      const result = await rejectRedemptionAction(redemptionId)

      if (!result.success) {
        setMessage(result.error)
        return
      }

      setMessage('Redemption rejected.')
      router.refresh()
    })
  }

  return (
    <div className="mt-2 sm:mt-0">
      <button
        type="button"
        onClick={handleReject}
        disabled={isPending}
        className="inline-flex min-h-9 items-center justify-center rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-bold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? 'Reporting…' : 'Report unauthorized'}
      </button>
      {message ? (
        <p aria-live="polite" className="mt-1 max-w-48 text-xs leading-4 text-slate-500">
          {message}
        </p>
      ) : null}
    </div>
  )
}

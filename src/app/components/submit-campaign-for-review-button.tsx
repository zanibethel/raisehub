'use client'

import Link from 'next/link'
import { useState } from 'react'

import { submitCampaignForReviewAction } from '@/app/organization/actions'

type Props = {
  campaignId: string
  campaignName: string
  disabled?: boolean
  disabledReason?: string
}

export default function SubmitCampaignForReviewButton({
  campaignId,
  campaignName,
  disabled = false,
  disabledReason,
}: Props) {
  const [agreed, setAgreed] = useState(false)
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState('')

  async function handleSubmit() {
    if (disabled || !agreed || pending) return

    setPending(true)
    setMessage('')

    const result = await submitCampaignForReviewAction(campaignId)

    if (result.error) {
      setMessage(result.error)
      setPending(false)
      return
    }

    setMessage('Campaign submitted for RaiseHub review.')
    window.location.reload()
  }

  return (
    <div className="w-full rounded-xl border border-blue-200 bg-white p-3">
      <label className="flex items-start gap-2 text-xs leading-5 text-gray-700">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(event) => setAgreed(event.target.checked)}
          disabled={disabled || pending}
          className="mt-1"
        />
        <span>
          I confirm that “{campaignName}” is accurate and complies with the{' '}
          <Link href="/terms" className="font-semibold text-blue-700 underline">
            Terms
          </Link>{' '}
          and{' '}
          <Link
            href="/fundraising-policy"
            className="font-semibold text-blue-700 underline"
          >
            Fundraising and Payout Policy
          </Link>
          .
        </span>
      </label>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={disabled || !agreed || pending}
        className="mt-3 w-full rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? 'Submitting…' : 'Submit for review'}
      </button>

      {disabledReason ? (
        <p className="mt-2 text-xs font-medium text-amber-700">{disabledReason}</p>
      ) : null}

      {message ? (
        <p className="mt-2 text-xs font-medium text-blue-700">{message}</p>
      ) : null}
    </div>
  )
}

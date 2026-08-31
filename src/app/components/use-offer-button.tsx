'use client'

import { useEffect, useState } from 'react'

import {
  getRedemptionClaimStatusAction,
  startRedemptionAction,
} from '@/app/redemptions/actions'
import { getUseOfferGuidance } from './use-offer-guidance'

type UseOfferButtonProps = {
  offerId: string
}

type ActiveClaim = {
  id: string
  code: string
  expiresAt: string
}

function getSecondsRemaining(expiresAt: string): number {
  const expires = new Date(expiresAt).getTime()
  if (Number.isNaN(expires)) return 0
  return Math.max(0, Math.ceil((expires - Date.now()) / 1000))
}

function formatCountdown(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`
}

export default function UseOfferButton({ offerId }: UseOfferButtonProps) {
  const guidance = getUseOfferGuidance()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [claim, setClaim] = useState<ActiveClaim | null>(null)
  const [secondsRemaining, setSecondsRemaining] = useState(0)
  const [confirmed, setConfirmed] = useState(false)

  useEffect(() => {
    if (!claim || confirmed) return

    setSecondsRemaining(getSecondsRemaining(claim.expiresAt))

    const timer = window.setInterval(() => {
      setSecondsRemaining(getSecondsRemaining(claim.expiresAt))
    }, 1000)

    const poller = window.setInterval(async () => {
      const result = await getRedemptionClaimStatusAction(claim.id)
      if (!result.success) return

      if (result.status === 'confirmed') {
        setConfirmed(true)
        setMessage('✓ Confirmed by the business. Your redemption is complete.')
        window.clearInterval(poller)
        window.setTimeout(() => window.location.reload(), 1400)
      } else if (result.status === 'expired' || result.status === 'cancelled') {
        setClaim(null)
        setMessage('The confirmation code expired. Generate a new code when staff is ready.')
        window.clearInterval(poller)
      }
    }, 2000)

    return () => {
      window.clearInterval(timer)
      window.clearInterval(poller)
    }
  }, [claim, confirmed])

  useEffect(() => {
    if (claim && secondsRemaining === 0 && !confirmed) {
      setClaim(null)
      setMessage('The confirmation code expired. Generate a new code when staff is ready.')
    }
  }, [claim, secondsRemaining, confirmed])

  async function handleUseOffer() {
    const approved = window.confirm(guidance.confirmationMessage)
    if (!approved) return

    setLoading(true)
    setMessage('')
    setConfirmed(false)

    const result = await startRedemptionAction(offerId)

    if (!result.success) {
      setMessage(result.error)
      setLoading(false)
      return
    }

    setClaim({
      id: result.claim.id,
      code: result.claim.code,
      expiresAt: result.claim.expiresAt,
    })
    setSecondsRemaining(getSecondsRemaining(result.claim.expiresAt))
    setMessage('Show this code to business staff. The deal is not counted as used until they confirm it.')
    setLoading(false)
  }

  if (claim || confirmed) {
    return (
      <div className="mt-4 overflow-hidden rounded-2xl border border-green-200 bg-green-50 p-4 text-center shadow-sm">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-green-700">
          {confirmed ? 'Redemption confirmed' : 'Staff confirmation required'}
        </p>

        {!confirmed && claim ? (
          <>
            <p className="mt-3 text-sm font-semibold text-gray-700">
              Ask the business to open RaiseHub → Confirm Redemption and enter:
            </p>
            <div className="mx-auto mt-3 max-w-xs rounded-2xl border-2 border-dashed border-green-300 bg-white px-4 py-5">
              <p className="select-all font-mono text-4xl font-black tracking-[0.18em] text-gray-950 sm:text-5xl">
                {claim.code}
              </p>
            </div>
            <p className="mt-3 text-sm font-bold text-amber-700">
              Expires in {formatCountdown(secondsRemaining)}
            </p>
            <p className="mt-2 text-xs leading-5 text-gray-600">
              Keep this screen open. RaiseHub will update automatically when staff confirms the redemption.
            </p>
          </>
        ) : null}

        {message ? (
          <p
            aria-live="polite"
            className={`mt-3 rounded-xl px-3 py-2 text-xs leading-5 ${
              confirmed
                ? 'bg-white font-semibold text-green-800'
                : 'text-gray-600'
            }`}
          >
            {message}
          </p>
        ) : null}
      </div>
    )
  }

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={handleUseOffer}
        disabled={loading}
        className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-green-700 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? guidance.loadingLabel : guidance.buttonLabel}
      </button>

      <p className="mt-2 text-center text-xs leading-5 text-gray-500">
        Start redemption only when you are at the business and a staff member is ready. Staff confirmation is required.
      </p>

      {message ? (
        <p aria-live="polite" className="mt-2 rounded-xl px-3 py-2 text-center text-xs leading-5 text-gray-600">
          {message}
        </p>
      ) : null}
    </div>
  )
}

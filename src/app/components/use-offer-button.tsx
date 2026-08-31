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
  const [redemptionStarted, setRedemptionStarted] = useState(false)
  const [redemptionStatus, setRedemptionStatus] = useState('pending')

  useEffect(() => {
    if (!claim || !redemptionStarted) return

    setSecondsRemaining(getSecondsRemaining(claim.expiresAt))

    const timer = window.setInterval(() => {
      setSecondsRemaining(getSecondsRemaining(claim.expiresAt))
    }, 1000)

    const poller = window.setInterval(async () => {
      const result = await getRedemptionClaimStatusAction(claim.id)
      if (!result.success) return

      if (result.redemptionStatus) {
        setRedemptionStatus(result.redemptionStatus)
      }

      if (result.redemptionStatus === 'confirmed') {
        setMessage('✓ Verified. This redemption is confirmed.')
        window.clearInterval(poller)
      } else if (result.redemptionStatus === 'rejected') {
        setMessage('The business reported a problem with this redemption. It will not count toward confirmed activity or savings.')
        window.clearInterval(poller)
      }
    }, 4000)

    return () => {
      window.clearInterval(timer)
      window.clearInterval(poller)
    }
  }, [claim, redemptionStarted])

  async function handleUseOffer() {
    const approved = window.confirm(guidance.confirmationMessage)
    if (!approved) return

    setLoading(true)
    setMessage('')
    setRedemptionStatus('pending')

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
    setRedemptionStarted(true)
    setRedemptionStatus(result.redemptionStatus || 'pending')
    setMessage('Redeemed. No business action is required. The business has 24 hours to report an unauthorized redemption; otherwise RaiseHub confirms it automatically.')
    setLoading(false)
  }

  if (redemptionStarted) {
    const codeActive = Boolean(claim && secondsRemaining > 0)
    const rejected = redemptionStatus === 'rejected'
    const confirmed = redemptionStatus === 'confirmed'

    return (
      <div
        className={`mt-4 overflow-hidden rounded-2xl border p-4 text-center shadow-sm ${
          rejected
            ? 'border-red-200 bg-red-50'
            : 'border-green-200 bg-green-50'
        }`}
      >
        <p
          className={`text-xs font-bold uppercase tracking-[0.18em] ${
            rejected ? 'text-red-700' : 'text-green-700'
          }`}
        >
          {rejected
            ? 'Redemption reported'
            : confirmed
              ? 'Redemption confirmed'
              : 'Offer redeemed'}
        </p>

        {!rejected ? (
          <>
            <div className="mt-3 rounded-2xl border border-white/80 bg-white/80 p-4">
              <p className="text-lg font-black text-slate-950">
                ✓ Show this screen to staff
              </p>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Your redemption is recorded now. It auto-confirms after the 24-hour business review window unless the business reports a problem.
              </p>
            </div>

            {codeActive && claim ? (
              <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-blue-700">
                  Optional instant verification
                </p>
                <p className="mt-2 text-sm leading-6 text-blue-950">
                  Staff may enter this code in RaiseHub to confirm immediately. This is optional and is the same path future QR/POS verification can use.
                </p>
                <div className="mx-auto mt-3 max-w-xs rounded-2xl border-2 border-dashed border-blue-300 bg-white px-4 py-4">
                  <p className="select-all font-mono text-3xl font-black tracking-[0.18em] text-gray-950 sm:text-4xl">
                    {claim.code}
                  </p>
                </div>
                <p className="mt-2 text-xs font-bold text-blue-700">
                  Verification code expires in {formatCountdown(secondsRemaining)}
                </p>
              </div>
            ) : (
              <p className="mt-3 text-xs leading-5 text-slate-500">
                The optional instant-verification code has expired. Your redemption remains recorded and the 24-hour review window is unchanged.
              </p>
            )}
          </>
        ) : null}

        {message ? (
          <p
            aria-live="polite"
            className={`mt-3 rounded-xl px-3 py-2 text-xs leading-5 ${
              rejected
                ? 'bg-white font-semibold text-red-800'
                : 'bg-white font-semibold text-green-800'
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
        Redeem when you are using the offer at the business. Staff does not need to approve each redemption.
      </p>

      {message ? (
        <p aria-live="polite" className="mt-2 rounded-xl px-3 py-2 text-center text-xs leading-5 text-gray-600">
          {message}
        </p>
      ) : null}
    </div>
  )
}

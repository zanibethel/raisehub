'use client'

import {
  useState,
} from 'react'

import {
  createClient,
} from '@/lib/supabase/client'
import {
  getUseOfferGuidance,
} from './use-offer-guidance'

// =============================================================================
// Types
// =============================================================================

type UseOfferButtonProps = {
  offerId: string
}

function getRedemptionErrorMessage(message: string): string | null {
  if (message.includes('single-use offer has already been redeemed')) {
    return 'This single-use offer has already been redeemed.'
  }

  if (message.includes('once every 24 hours')) {
    return 'This offer can be used again after 24 hours from your last redemption.'
  }

  if (message.includes('once every 7 days')) {
    return 'This offer can be used again after 7 days from your last redemption.'
  }

  if (
    message.includes('offer is paused') ||
    message.includes('business is paused') ||
    message.includes('offer has expired')
  ) {
    return 'This offer is no longer available right now.'
  }

  if (message.includes('active RaiseHub Pass is required')) {
    return 'An active RaiseHub Pass is required to redeem this offer.'
  }

  if (message.includes('redemption rate limit exceeded')) {
    return 'Too many redemption attempts were made. Please wait a moment and try again.'
  }

  return null
}

// =============================================================================
// Component
// =============================================================================

export default function UseOfferButton({
  offerId,
}: UseOfferButtonProps) {
  const supabase =
    createClient()

  const guidance =
    getUseOfferGuidance()

  const [loading, setLoading] =
    useState(false)

  const [message, setMessage] =
    useState('')

  const [success, setSuccess] =
    useState(false)

  async function handleUseOffer() {
    const confirmed =
      window.confirm(
        guidance.confirmationMessage
      )

    if (!confirmed) {
      return
    }

    setLoading(true)
    setMessage('')
    setSuccess(false)

    const {
      data: {
        user,
      },
    } =
      await supabase.auth.getUser()

    if (!user) {
      setMessage(
        guidance.signInRequiredMessage
      )
      setLoading(false)
      return
    }

    const {
      error,
    } =
      await supabase
        .from('redemptions')
        .insert({
          offer_id: offerId,
          user_id: user.id,
        })

    if (error) {
      const ruleMessage = getRedemptionErrorMessage(error.message)

      if (ruleMessage) {
        setMessage(ruleMessage)
      } else if (
        error.code === '23505'
      ) {
        setMessage(
          guidance.alreadyUsedMessage
        )
      } else {
        setMessage(
          'We could not redeem this offer. Please try again or ask the business for help.'
        )
      }

      setLoading(false)
      return
    }

    setSuccess(true)
    setMessage(
      'Redeemed just now. Show this confirmation to the staff member.'
    )

    setLoading(false)

    setTimeout(() => {
      window.location.reload()
    }, 1800)
  }

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={handleUseOffer}
        disabled={loading || success}
        className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-green-700 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {success
          ? '✓ Redeemed Just Now'
          : loading
            ? guidance.loadingLabel
            : guidance.buttonLabel}
      </button>

      <p className="mt-2 text-center text-xs leading-5 text-gray-500">
        Redeem only when a staff
        member is ready to confirm
        your offer.
      </p>

      {message ? (
        <p
          aria-live="polite"
          className={`mt-2 rounded-xl px-3 py-2 text-center text-xs leading-5 ${
            success
              ? 'bg-green-50 font-semibold text-green-800'
              : 'text-gray-600'
          }`}
        >
          {message}
        </p>
      ) : null}
    </div>
  )
}

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
      if (
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

    setMessage(
      guidance.successMessage
    )

    setLoading(false)

    setTimeout(() => {
      window.location.reload()
    }, 500)
  }

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={handleUseOffer}
        disabled={loading}
        className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-green-700 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading
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
          className="mt-2 text-center text-xs leading-5 text-gray-600"
        >
          {message}
        </p>
      ) : null}
    </div>
  )
}
'use client'

import {
  CheckoutElementsProvider,
  PaymentElement,
  useCheckoutElements,
} from '@stripe/react-stripe-js/checkout'
import { loadStripe, type Appearance } from '@stripe/stripe-js'
import { useState, type FormEvent } from 'react'

type StripeElementsCheckoutProps = {
  clientSecret: string
  totalAmount: number
  onBack: () => void
}

const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim()
const stripePromise = publishableKey ? loadStripe(publishableKey) : null

const appearance: Appearance = {
  theme: 'stripe',
  variables: {
    colorPrimary: '#2563eb',
    colorBackground: '#ffffff',
    colorText: '#0f172a',
    colorDanger: '#b91c1c',
    borderRadius: '10px',
    fontFamily:
      'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
}

function PaymentForm({
  totalAmount,
  onBack,
}: {
  totalAmount: number
  onBack: () => void
}) {
  const checkoutState = useCheckoutElements()
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (checkoutState.type === 'loading') {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-600">
        Loading secure payment options…
      </div>
    )
  }

  if (checkoutState.type === 'error') {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        <p className="font-bold">Secure payment options could not load.</p>
        <p className="mt-1">{checkoutState.error.message}</p>
        <button
          type="button"
          onClick={onBack}
          className="mt-3 inline-flex rounded-lg border border-red-300 bg-white px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-50"
        >
          Change purchase details
        </button>
      </div>
    )
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting) return

    setSubmitting(true)
    setMessage('')

    const result = await checkoutState.checkout.confirm()

    if (result.type === 'error') {
      setMessage(result.error.message)
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-700">
          Pay securely
        </p>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          Your payment details are securely collected by Stripe without leaving RaiseHub.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4">
        <PaymentElement />
      </div>

      {message ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">
          {message}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting
          ? 'Confirming payment…'
          : `Pay $${totalAmount.toFixed(2)} securely`}
      </button>

      <button
        type="button"
        onClick={onBack}
        disabled={submitting}
        className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Change purchase details
      </button>

      <p className="text-center text-xs leading-5 text-slate-500">
        Stripe handles card and wallet details directly. RaiseHub does not receive your full payment credentials.
      </p>
    </form>
  )
}

export default function StripeElementsCheckout({
  clientSecret,
  totalAmount,
  onBack,
}: StripeElementsCheckoutProps) {
  if (!stripePromise) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <p className="font-bold">Embedded checkout is temporarily unavailable.</p>
        <p className="mt-1">
          Return to the purchase details and try again. RaiseHub can fall back to Stripe-hosted checkout.
        </p>
        <button
          type="button"
          onClick={onBack}
          className="mt-3 inline-flex rounded-lg bg-amber-900 px-3 py-2 text-xs font-bold text-white hover:bg-amber-800"
        >
          Back
        </button>
      </div>
    )
  }

  return (
    <CheckoutElementsProvider
      stripe={stripePromise}
      options={{
        clientSecret,
        elementsOptions: { appearance },
      }}
    >
      <PaymentForm totalAmount={totalAmount} onBack={onBack} />
    </CheckoutElementsProvider>
  )
}

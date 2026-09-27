'use client'

import { useSearchParams } from 'next/navigation'
import { useMemo, useState } from 'react'

const QUICK_AMOUNTS = [5, 10, 25, 50] as const

export default function WebPortalSupportCheckout() {
  const searchParams = useSearchParams()
  const checkoutStatus = searchParams.get('checkout')
  const [amount, setAmount] = useState('10')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const parsedAmount = useMemo(() => Number(amount), [amount])

  async function startCheckout() {
    setMessage('')

    if (
      !Number.isFinite(parsedAmount) ||
      parsedAmount < 3 ||
      parsedAmount > 500
    ) {
      setMessage('Choose an amount between $3 and $500.')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/webportal/support/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          amount: parsedAmount,
          email: email.trim() || undefined,
        }),
      })

      const data = (await response.json()) as {
        url?: string
        error?: string
      }

      if (!response.ok || !data.url) {
        throw new Error(data.error || 'Checkout could not be started.')
      }

      window.location.href = data.url
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Checkout could not be started.'
      )
      setLoading(false)
    }
  }

  return (
    <div className="mt-7">
      {checkoutStatus === 'success' ? (
        <div className="mb-5 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm font-bold text-green-900">
          Thank you for supporting WebPortal. Your payment was received through Stripe.
        </div>
      ) : null}

      {checkoutStatus === 'canceled' ? (
        <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-900">
          Checkout was canceled. Nothing was charged.
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {QUICK_AMOUNTS.map((quickAmount) => {
          const selected = parsedAmount === quickAmount
          return (
            <button
              key={quickAmount}
              type="button"
              onClick={() => setAmount(String(quickAmount))}
              className={
                selected
                  ? 'min-h-14 rounded-2xl border-2 border-cyan-500 bg-cyan-50 px-4 text-lg font-black text-cyan-900 shadow-sm'
                  : 'min-h-14 rounded-2xl border border-slate-200 bg-white px-4 text-lg font-black text-slate-800 shadow-sm hover:border-cyan-300 hover:bg-cyan-50/60'
              }
            >
              {'$'}{quickAmount}
            </button>
          )
        })}
      </div>

      <div className="mt-4">
        <label
          htmlFor="webportal-support-amount"
          className="mb-2 block text-sm font-black text-slate-800"
        >
          Or enter another amount
        </label>
        <div className="flex min-h-12 items-center rounded-xl border border-slate-300 bg-white focus-within:border-cyan-500 focus-within:ring-4 focus-within:ring-cyan-100">
          <span className="pl-4 text-lg font-black text-slate-500">$</span>
          <input
            id="webportal-support-amount"
            inputMode="decimal"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            className="min-h-12 w-full rounded-xl bg-transparent px-2 py-3 text-lg font-black outline-none"
            aria-describedby="webportal-support-limit"
          />
        </div>
        <p id="webportal-support-limit" className="mt-2 text-xs text-slate-500">
          Minimum $3 · Maximum $500
        </p>
      </div>

      <div className="mt-4">
        <label
          htmlFor="webportal-support-email"
          className="mb-2 block text-sm font-black text-slate-800"
        >
          Email <span className="font-medium text-slate-400">(optional)</span>
        </label>
        <input
          id="webportal-support-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
        />
      </div>

      {message ? (
        <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">
          {message}
        </p>
      ) : null}

      <button
        type="button"
        disabled={loading}
        onClick={startCheckout}
        className="mt-5 min-h-14 w-full rounded-2xl bg-cyan-600 px-5 text-base font-black text-white shadow-lg shadow-cyan-900/10 transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading
          ? 'Opening secure checkout…'
          : Number.isFinite(parsedAmount) && parsedAmount > 0
            ? 'Support WebPortal with $' + parsedAmount.toFixed(2)
            : 'Continue to secure checkout'}
      </button>

      <p className="mt-4 text-center text-xs leading-5 text-slate-500">
        Payment is processed securely by Stripe. Support is voluntary and is not represented as a tax-deductible charitable contribution.
      </p>
    </div>
  )
}

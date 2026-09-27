'use client'

import { useSearchParams } from 'next/navigation'
import { useState } from 'react'

type PlanCode = 'seven_day' | 'month_once' | 'month_recurring'

const plans: Array<{
  code: PlanCode
  title: string
  price: string
  detail: string
}> = [
  {
    code: 'seven_day',
    title: '7 days',
    price: '$10',
    detail: 'One-time placement for 7 days after approval.',
  },
  {
    code: 'month_once',
    title: '30 days',
    price: '$25',
    detail: 'One-time placement for 30 days after approval.',
  },
  {
    code: 'month_recurring',
    title: 'Monthly',
    price: '$25/mo',
    detail: 'Renews monthly until canceled.',
  },
]

export default function WebPortalAdvertiseCheckout() {
  const searchParams = useSearchParams()
  const checkoutStatus = searchParams.get('checkout')

  const [planCode, setPlanCode] = useState<PlanCode>('month_once')
  const [businessName, setBusinessName] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [adText, setAdText] = useState('')
  const [destinationUrl, setDestinationUrl] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function startCheckout(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage('')
    setLoading(true)

    try {
      const response = await fetch('/api/webportal/advertise/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          planCode,
          businessName,
          contactEmail,
          adText,
          destinationUrl,
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
    <form onSubmit={startCheckout} className="mt-7">
      {checkoutStatus === 'success' ? (
        <div className="mb-5 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm font-bold text-green-900">
          Payment received. Your ad is now pending review. Your paid placement time begins only after the ad is approved and activated.
        </div>
      ) : null}

      {checkoutStatus === 'canceled' ? (
        <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-900">
          Checkout was canceled. Nothing was charged and the ad was not submitted as paid.
        </div>
      ) : null}

      <fieldset>
        <legend className="text-sm font-black text-slate-900">
          Choose your placement
        </legend>

        <div className="mt-3 grid gap-3">
          {plans.map((plan) => {
            const selected = plan.code === planCode
            return (
              <label
                key={plan.code}
                className={
                  selected
                    ? 'flex cursor-pointer items-start gap-3 rounded-2xl border-2 border-blue-500 bg-blue-50 p-4 shadow-sm'
                    : 'flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:border-blue-300'
                }
              >
                <input
                  type="radio"
                  name="webportal-ad-plan"
                  value={plan.code}
                  checked={selected}
                  onChange={() => setPlanCode(plan.code)}
                  className="mt-1 h-5 w-5"
                />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-3">
                    <span className="font-black text-slate-950">{plan.title}</span>
                    <span className="text-lg font-black text-blue-700">{plan.price}</span>
                  </span>
                  <span className="mt-1 block text-sm leading-5 text-slate-600">
                    {plan.detail}
                  </span>
                </span>
              </label>
            )
          })}
        </div>
      </fieldset>

      <div className="mt-6 grid gap-4">
        <div>
          <label htmlFor="webportal-ad-business" className="mb-2 block text-sm font-black text-slate-800">
            Business name
          </label>
          <input
            id="webportal-ad-business"
            value={businessName}
            onChange={(event) => setBusinessName(event.target.value)}
            maxLength={100}
            required
            autoComplete="organization"
            placeholder="Your business"
            className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
          />
        </div>

        <div>
          <label htmlFor="webportal-ad-email" className="mb-2 block text-sm font-black text-slate-800">
            Contact email
          </label>
          <input
            id="webportal-ad-email"
            type="email"
            value={contactEmail}
            onChange={(event) => setContactEmail(event.target.value)}
            maxLength={160}
            required
            autoComplete="email"
            placeholder="you@business.com"
            className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
          />
        </div>

        <div>
          <div className="mb-2 flex items-end justify-between gap-3">
            <label htmlFor="webportal-ad-text" className="text-sm font-black text-slate-800">
              Short ad message
            </label>
            <span className="text-xs font-bold text-slate-400">{adText.length}/90</span>
          </div>
          <textarea
            id="webportal-ad-text"
            value={adText}
            onChange={(event) => setAdText(event.target.value)}
            maxLength={90}
            required
            rows={3}
            placeholder="Fresh tacos, local service, special offer..."
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
          />
          <p className="mt-2 text-xs leading-5 text-slate-500">
            Keep this short. It will be shown on a TV banner next to a QR code.
          </p>
        </div>

        <div>
          <label htmlFor="webportal-ad-url" className="mb-2 block text-sm font-black text-slate-800">
            QR destination
          </label>
          <input
            id="webportal-ad-url"
            type="url"
            value={destinationUrl}
            onChange={(event) => setDestinationUrl(event.target.value)}
            maxLength={500}
            required
            placeholder="https://yourbusiness.com"
            className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
          />
          <p className="mt-2 text-xs leading-5 text-slate-500">
            The QR code shown with your ad will open this page.
          </p>
        </div>
      </div>

      {message ? (
        <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">
          {message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={loading}
        className="mt-6 min-h-14 w-full rounded-2xl bg-blue-700 px-5 text-base font-black text-white shadow-lg shadow-blue-900/10 transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? 'Opening secure checkout…' : 'Continue to secure checkout'}
      </button>

      <div className="mt-4 space-y-1 text-center text-xs leading-5 text-slate-500">
        <p>Ads are reviewed before they appear. Paid placement time begins at activation, not checkout.</p>
        <p>Recurring monthly placement renews at $25/month until canceled. Placement does not guarantee scans, clicks, or sales.</p>
      </div>
    </form>
  )
}

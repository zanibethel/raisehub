'use client'

import { FormEvent, useState } from 'react'

type SubmitState = 'idle' | 'submitting' | 'success' | 'error'

export default function SupportContactForm() {
  const [state, setState] = useState<SubmitState>('idle')
  const [message, setMessage] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setState('submitting')
    setMessage('')

    const form = event.currentTarget
    const formData = new FormData(form)

    try {
      const response = await fetch('/api/support/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: String(formData.get('name') ?? ''),
          email: String(formData.get('email') ?? ''),
          topic: String(formData.get('topic') ?? ''),
          message: String(formData.get('message') ?? ''),
          pageUrl: window.location.href,
        }),
      })

      const result = (await response.json()) as { error?: string }

      if (!response.ok) {
        throw new Error(result.error || 'Your request could not be submitted.')
      }

      form.reset()
      setState('success')
      setMessage('Your message was sent. RaiseHub Support will review it as soon as possible.')
    } catch (error) {
      setState('error')
      setMessage(error instanceof Error ? error.message : 'Your request could not be submitted.')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-bold text-slate-800">Name</span>
          <input name="name" required maxLength={120} className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 px-3 text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
        </label>

        <label className="block">
          <span className="text-sm font-bold text-slate-800">Email</span>
          <input name="email" type="email" required maxLength={254} className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 px-3 text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
        </label>
      </div>

      <label className="block">
        <span className="text-sm font-bold text-slate-800">What do you need help with?</span>
        <select name="topic" required defaultValue="" className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
          <option value="" disabled>Select a topic</option>
          <option value="account">Account or sign in</option>
          <option value="campaign">Campaign or organization</option>
          <option value="business">Business or offer</option>
          <option value="purchase">Purchase or coupon pass</option>
          <option value="redemption">Offer redemption</option>
          <option value="payout">Payout or payment</option>
          <option value="technical">Technical problem</option>
          <option value="other">Something else</option>
        </select>
      </label>

      <label className="block">
        <span className="text-sm font-bold text-slate-800">Message</span>
        <textarea name="message" required minLength={10} maxLength={4000} rows={6} placeholder="Tell us what happened, what you expected, and any steps you already tried." className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-3 text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
      </label>

      <button type="submit" disabled={state === 'submitting'} className="inline-flex min-h-11 items-center justify-center rounded-xl bg-blue-600 px-5 text-sm font-black text-white hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60">
        {state === 'submitting' ? 'Sending…' : 'Contact RaiseHub Support'}
      </button>

      {message ? (
        <p role="status" className={`rounded-xl border p-3 text-sm font-semibold ${state === 'success' ? 'border-green-200 bg-green-50 text-green-800' : 'border-rose-200 bg-rose-50 text-rose-800'}`}>
          {message}
        </p>
      ) : null}
    </form>
  )
}

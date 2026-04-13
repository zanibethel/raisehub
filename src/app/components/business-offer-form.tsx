'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Props = {
  businessId: string
}

export default function BusinessOfferForm({ businessId }: Props) {
  const supabase = createClient()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [discountText, setDiscountText] = useState('')
  const [usageRule, setUsageRule] = useState('one-time')
  const [expiresAt, setExpiresAt] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    const { error } = await supabase.from('offers').insert({
      business_id: businessId,
      title,
      description,
      discount_text: discountText,
      usage_rule: usageRule,
      expires_at: expiresAt || null,
    })

    if (error) {
      setMessage(error.message)
      setLoading(false)
      return
    }

    setTitle('')
    setDescription('')
    setDiscountText('')
    setUsageRule('one-time')
    setExpiresAt('')
    setMessage('Offer created successfully.')
    setLoading(false)

    window.location.reload()
  }

  return (
    <div className="rounded-2xl border border-green-100 bg-white/90 p-6 shadow-xl backdrop-blur">
      <h2 className="text-lg font-semibold text-green-700">Create offer</h2>
      <p className="mt-2 text-sm text-gray-600">
        Add a fundraiser offer for your business.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <input
          className="w-full rounded-lg border border-gray-300 p-3 outline-none focus:border-green-500"
          type="text"
          placeholder="Offer title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />

        <textarea
          className="w-full rounded-lg border border-gray-300 p-3 outline-none focus:border-green-500"
          placeholder="Short description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
        />

        <input
          className="w-full rounded-lg border border-gray-300 p-3 outline-none focus:border-green-500"
          type="text"
          placeholder='Discount text (example: "$10 off any service")'
          value={discountText}
          onChange={(e) => setDiscountText(e.target.value)}
          required
        />

        <select
          className="w-full rounded-lg border border-gray-300 p-3 outline-none focus:border-green-500"
          value={usageRule}
          onChange={(e) => setUsageRule(e.target.value)}
        >
          <option value="one-time">One-time</option>
          <option value="monthly">Once per month</option>
          <option value="multi-use">Multiple uses</option>
        </select>

        <input
          className="w-full rounded-lg border border-gray-300 p-3 outline-none focus:border-green-500"
          type="date"
          value={expiresAt}
          onChange={(e) => setExpiresAt(e.target.value)}
        />

        <button
          disabled={loading}
          className="w-full rounded-lg bg-green-600 px-4 py-3 font-medium text-white hover:bg-green-700 disabled:opacity-50"
        >
          {loading ? 'Creating offer...' : 'Create Offer'}
        </button>
      </form>

      {message ? (
        <p className="mt-4 text-sm text-green-600">{message}</p>
      ) : null}
    </div>
  )
}
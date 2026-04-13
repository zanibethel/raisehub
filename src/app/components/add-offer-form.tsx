'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

function getTodayLocalDate() {
  return new Date().toISOString().split('T')[0]
}

function getSixMonthsFromTodayLocalDate() {
  const date = new Date()
  date.setMonth(date.getMonth() + 6)
  return date.toISOString().split('T')[0]
}

export default function AddOfferForm() {
  const supabase = createClient()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [discount, setDiscount] = useState('')
  const [startsAt, setStartsAt] = useState(getTodayLocalDate())
  const [endsAt, setEndsAt] = useState(getSixMonthsFromTodayLocalDate())
  const [message, setMessage] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setMessage('Not authenticated')
      return
    }

    const { error } = await supabase.from('offers').insert({
      business_id: user.id,
      title,
      description,
      discount,
      starts_at: startsAt,
      ends_at: endsAt,
    })

    if (error) {
      setMessage(error.message)
      return
    }

    setMessage('Offer created!')
    setTitle('')
    setDescription('')
    setDiscount('')
    setStartsAt(getTodayLocalDate())
    setEndsAt(getSixMonthsFromTodayLocalDate())
  }

  return (
    <div className="mt-6 rounded-2xl border border-green-100 bg-white/90 p-6 shadow-xl backdrop-blur">
      <h2 className="text-lg font-semibold text-green-700">Create Offer</h2>

      <form onSubmit={handleSubmit} className="mt-4 space-y-3">
        <input
          className="w-full rounded-lg border border-gray-300 p-2"
          placeholder="Title (e.g. 10% off haircut)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />

        <input
          className="w-full rounded-lg border border-gray-300 p-2"
          placeholder="Discount (e.g. 10% off)"
          value={discount}
          onChange={(e) => setDiscount(e.target.value)}
        />

        <textarea
          className="w-full rounded-lg border border-gray-300 p-2"
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-600">
              Starts on
            </label>
            <input
              className="w-full rounded-lg border border-gray-300 p-2"
              type="date"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-600">
              Ends on
            </label>
            <input
              className="w-full rounded-lg border border-gray-300 p-2"
              type="date"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
            />
          </div>
        </div>

        <button className="rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700">
          Create Offer
        </button>
      </form>

      {message && (
        <p className="mt-2 text-sm text-gray-600">{message}</p>
      )}
    </div>
  )
}
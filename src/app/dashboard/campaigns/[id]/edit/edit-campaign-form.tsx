'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

import { updateCampaignAction } from '@/app/organization/actions'

type EditCampaignFormProps = {
  campaignId: string
  initialName: string
  initialDescription: string
  initialGoalAmount: string
  initialPassPrice: string
  initialStartsAt: string
  initialEndsAt: string
}

export default function EditCampaignForm({
  campaignId,
  initialName,
  initialDescription,
  initialGoalAmount,
  initialPassPrice,
  initialStartsAt,
  initialEndsAt,
}: EditCampaignFormProps) {
  const router = useRouter()

  const [name, setName] = useState(initialName)
  const [description, setDescription] = useState(initialDescription)
  const [goalAmount, setGoalAmount] = useState(initialGoalAmount)
  const [passPrice, setPassPrice] = useState(initialPassPrice)
  const [startsAt, setStartsAt] = useState(initialStartsAt)
  const [endsAt, setEndsAt] = useState(initialEndsAt)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setMessage('')

    const result = await updateCampaignAction({
      campaignId,
      name,
      description,
      goal_amount: Number(goalAmount) || 0,
      pass_price: Number(passPrice) || 0,
      starts_at: startsAt,
      ends_at: endsAt,
    })

    if (result.error) {
      setMessage(result.error)
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Campaign Name
        </label>

        <input
          className="w-full rounded-lg border border-gray-300 p-2"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Description
        </label>

        <textarea
          className="w-full rounded-lg border border-gray-300 p-2"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={4}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Goal Amount ($)
          </label>

          <input
            className="w-full rounded-lg border border-gray-300 p-2"
            type="number"
            min="0"
            value={goalAmount}
            onChange={(event) => setGoalAmount(event.target.value)}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Pass Price ($)
          </label>

          <input
            className="w-full rounded-lg border border-gray-300 p-2"
            type="number"
            min="0"
            value={passPrice}
            onChange={(event) => setPassPrice(event.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Starts On
          </label>

          <input
            className="w-full rounded-lg border border-gray-300 p-2"
            type="date"
            value={startsAt}
            onChange={(event) => setStartsAt(event.target.value)}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Ends On
          </label>

          <input
            className="w-full rounded-lg border border-gray-300 p-2"
            type="date"
            value={endsAt}
            onChange={(event) => setEndsAt(event.target.value)}
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Saving...' : 'Save Campaign'}
      </button>

      {message ? (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {message}
        </p>
      ) : null}
    </form>
  )
}

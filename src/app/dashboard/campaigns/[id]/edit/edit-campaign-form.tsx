'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

import { updateCampaignAction } from '@/app/organization/actions'

type EditCampaignFormProps = {
  campaignId: string
  initialName: string
  initialDescription: string
  initialGoalAmount: string

  // Retained until the edit page removes its legacy pass_price
  // selection in the next independently build-safe commit.
  initialPassPrice: string

  initialStartsAt: string
  initialEndsAt: string
}

export default function EditCampaignForm({
  campaignId,
  initialName,
  initialDescription,
  initialGoalAmount,
  initialStartsAt,
  initialEndsAt,
}: EditCampaignFormProps) {
  const router = useRouter()

  const [name, setName] = useState(initialName)
  const [description, setDescription] = useState(
    initialDescription
  )
  const [goalAmount, setGoalAmount] = useState(
    initialGoalAmount
  )
  const [startsAt, setStartsAt] = useState(
    initialStartsAt
  )
  const [endsAt, setEndsAt] = useState(initialEndsAt)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault()
    setLoading(true)
    setMessage('')

    const goalValue = Number(goalAmount)

    if (
      goalAmount.trim() === '' ||
      !Number.isFinite(goalValue) ||
      goalValue < 0
    ) {
      setMessage(
        'Enter a valid fundraising goal before saving the campaign.'
      )
      setLoading(false)
      return
    }

    try {
      const result = await updateCampaignAction({
        campaignId,
        name,
        description,
        goal_amount: goalValue,
        starts_at: startsAt,
        ends_at: endsAt,
      })

      if (result.error) {
        setMessage(result.error)
        return
      }

      router.push('/dashboard')
      router.refresh()
    } finally {
      setLoading(false)
    }
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
          onChange={(event) =>
            setName(event.target.value)
          }
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
          onChange={(event) =>
            setDescription(event.target.value)
          }
          rows={4}
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Fundraising Goal ($)
        </label>

        <input
          className="w-full rounded-lg border border-gray-300 p-2"
          type="number"
          min="0"
          step="0.01"
          value={goalAmount}
          onChange={(event) =>
            setGoalAmount(event.target.value)
          }
        />

        <p className="mt-1 text-xs text-gray-500">
          Enter the amount your organization wants to
          receive after RaiseHub fees.
        </p>
      </div>

      <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
        <p className="text-sm font-semibold text-blue-800">
          Pricing managed by RaiseHub
        </p>

        <p className="mt-1 text-sm leading-6 text-blue-700">
          The campaign&apos;s pass price and platform fee
          are controlled by RaiseHub-managed pricing.
          Saving this campaign will automatically keep its
          pricing synchronized with the current applicable
          pricing rule.
        </p>
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
            onChange={(event) =>
              setStartsAt(event.target.value)
            }
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
            onChange={(event) =>
              setEndsAt(event.target.value)
            }
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
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
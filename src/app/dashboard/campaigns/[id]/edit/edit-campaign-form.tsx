'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

import { updateCampaignAction } from '@/app/organization/actions'

type EditCampaignFormProps = {
  campaignId: string
  initialName: string
  initialDescription: string
  initialGoalAmount: string
  initialStartsAt: string
  initialEndsAt: string
  passPrice: number
  platformFeePercent: number
  organizationPassEarnings: number
  pricingScope: string
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value)
}

export default function EditCampaignForm({
  campaignId,
  initialName,
  initialDescription,
  initialGoalAmount,
  initialStartsAt,
  initialEndsAt,
  passPrice,
  platformFeePercent,
  organizationPassEarnings,
  pricingScope,
}: EditCampaignFormProps) {
  const router = useRouter()

  const [name, setName] = useState(initialName)
  const [description, setDescription] = useState(initialDescription)
  const [goalAmount, setGoalAmount] = useState(initialGoalAmount)
  const [startsAt, setStartsAt] = useState(initialStartsAt)
  const [endsAt, setEndsAt] = useState(initialEndsAt)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const hasSpecialPricing =
    pricingScope === 'campaign' ||
    pricingScope === 'organization' ||
    pricingScope === 'town' ||
    pricingScope === 'state'

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
          onChange={(event) => setGoalAmount(event.target.value)}
        />
        <p className="mt-1 text-xs text-gray-500">
          Enter the amount your organization wants to receive after RaiseHub fees.
        </p>
      </div>

      <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-blue-900">
              Pricing managed by RaiseHub
            </p>
            <p className="mt-1 text-xs font-medium text-blue-700">
              {hasSpecialPricing
                ? 'Special managed pricing currently applies'
                : 'Standard managed pricing'}
            </p>
          </div>
          <div className="rounded-lg border border-blue-200 bg-white px-4 py-3 text-right shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              RaiseHub Pass
            </p>
            <p className="mt-1 text-2xl font-bold text-blue-900">
              {formatCurrency(passPrice)}
            </p>
          </div>
        </div>

        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg bg-white/80 p-3">
            <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Platform fee
            </dt>
            <dd className="mt-1 font-semibold text-gray-900">
              {platformFeePercent}%
            </dd>
          </div>
          <div className="rounded-lg bg-white/80 p-3">
            <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Organization receives per pass
            </dt>
            <dd className="mt-1 font-semibold text-gray-900">
              {formatCurrency(organizationPassEarnings)}
            </dd>
          </div>
        </dl>

        <p className="mt-4 text-sm leading-6 text-blue-800">
          RaiseHub keeps this campaign synchronized with the current applicable pricing rule. Special pricing may apply to qualifying campaigns or organizations in limited circumstances.
        </p>

        <Link
          href="/pricing-guidelines"
          className="mt-3 inline-flex text-sm font-semibold text-blue-800 underline decoration-blue-300 underline-offset-4 hover:text-blue-950"
        >
          View pricing guidelines
        </Link>
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

'use client'

import { useState } from 'react'

import { createCampaignAction } from '@/app/organization/actions'

type CreateCampaignFormProps = {
  id?: string
  pricing: {
    passPrice: number
    platformFeePercent: number
    organizationPassEarnings: number
    usedFallback: boolean
  }
}

const ORGANIZATION_SETUP_ERROR =
  'Complete your organization name, town, and state before creating a campaign.'

function formatCurrency(value: number) {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value)
}

function returnToOrganizationSetup() {
  const setupSection = document.getElementById('organization-setup')

  if (!setupSection) {
    return
  }

  setupSection.scrollIntoView({
    behavior: 'smooth',
    block: 'start',
  })

  window.setTimeout(() => {
    const missingField = setupSection.querySelector<HTMLElement>(
      'input:invalid, select:invalid, textarea:invalid'
    )
    const fallbackField = setupSection.querySelector<HTMLElement>(
      'input, select, textarea'
    )

    ;(missingField ?? fallbackField)?.focus({ preventScroll: true })
  }, 450)
}

export default function CreateCampaignForm({
  id,
  pricing,
}: CreateCampaignFormProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [goalAmount, setGoalAmount] = useState('1000')
  const [startsAt, setStartsAt] = useState('')
  const [endsAt, setEndsAt] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const goalNumber = Number(goalAmount) || 0
  const passesNeeded =
    goalNumber > 0 && pricing.organizationPassEarnings > 0
      ? Math.ceil(goalNumber / pricing.organizationPassEarnings)
      : 0
  const projectedOrganizationEarnings =
    passesNeeded * pricing.organizationPassEarnings

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
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
        'Enter a valid fundraising goal before creating the campaign.'
      )
      setLoading(false)
      return
    }

    try {
      const result = await createCampaignAction({
        name,
        description,
        goal_amount: goalValue,
        starts_at: startsAt,
        ends_at: endsAt,
      })

      if (result.error) {
        setMessage(result.error)

        if (result.error === ORGANIZATION_SETUP_ERROR) {
          returnToOrganizationSetup()
        }

        return
      }

      setMessage('Campaign created!')
      setName('')
      setDescription('')
      setGoalAmount('1000')
      setStartsAt('')
      setEndsAt('')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      id={id}
      className="rounded-2xl border border-blue-100 bg-white/90 p-6 shadow-xl backdrop-blur"
    >
      <h2 className="text-lg font-semibold text-blue-700">
        Create Campaign
      </h2>

      <p className="mt-2 text-sm text-gray-600">
        Start a fundraising campaign powered by local business deals.
      </p>

      <p className="mt-3 text-xs font-medium text-gray-600">
        <span className="font-bold text-red-600" aria-hidden="true">*</span>{' '}
        Required fields
      </p>

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <label className="block text-sm font-medium text-gray-700">
          Campaign name{' '}
          <span className="font-bold text-red-600" aria-hidden="true">*</span>
          <span className="sr-only"> required</span>
          <input
            className="mt-1 w-full rounded-lg border border-gray-300 p-2"
            placeholder="Campaign name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
        </label>

        <textarea
          className="w-full rounded-lg border border-gray-300 p-2"
          placeholder="Short description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />

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
              <p className="text-sm font-semibold text-blue-800">
                Fundraising Estimate
              </p>
              <p className="mt-1 text-xs text-blue-700">
                Calculated from RaiseHub-managed pricing.
              </p>
            </div>

            {pricing.usedFallback ? (
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                Temporary fallback pricing
              </span>
            ) : null}
          </div>

          <p className="mt-4 text-2xl font-bold text-blue-900">
            {passesNeeded.toLocaleString()} passes needed
          </p>

          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div className="rounded-lg bg-white/70 p-3">
              <dt className="text-blue-700">Current pass price</dt>
              <dd className="mt-1 font-semibold text-blue-900">
                {formatCurrency(pricing.passPrice)}
              </dd>
            </div>

            <div className="rounded-lg bg-white/70 p-3">
              <dt className="text-blue-700">RaiseHub fee</dt>
              <dd className="mt-1 font-semibold text-blue-900">
                {pricing.platformFeePercent}%
              </dd>
            </div>

            <div className="rounded-lg bg-white/70 p-3">
              <dt className="text-blue-700">
                Organization earns per pass
              </dt>
              <dd className="mt-1 font-semibold text-blue-900">
                {formatCurrency(pricing.organizationPassEarnings)}
              </dd>
            </div>

            <div className="rounded-lg bg-white/70 p-3">
              <dt className="text-blue-700">Estimated amount raised</dt>
              <dd className="mt-1 font-semibold text-blue-900">
                {formatCurrency(projectedOrganizationEarnings)}
              </dd>
            </div>
          </dl>

          <p className="mt-3 text-xs leading-5 text-blue-700">
            Pass totals round up so the campaign reaches or exceeds the fundraising goal.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-600">
              Starts on
            </label>
            <input
              className="w-full rounded-lg border border-gray-300 p-2"
              type="date"
              value={startsAt}
              onChange={(event) => setStartsAt(event.target.value)}
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
              onChange={(event) => setEndsAt(event.target.value)}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? 'Creating...' : 'Create Campaign'}
        </button>
      </form>

      {message ? (
        <p
          className={`mt-3 rounded-lg p-3 text-sm ${
            message === 'Campaign created!'
              ? 'bg-green-50 text-green-700'
              : 'bg-red-50 text-red-700'
          }`}
        >
          {message}
        </p>
      ) : null}
    </div>
  )
}

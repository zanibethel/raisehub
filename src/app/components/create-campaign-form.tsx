'use client'

import Link from 'next/link'
import { useState } from 'react'

import { createCampaignAction } from '@/app/organization/actions'

type CreateCampaignFormProps = {
  id?: string
  organizationId: string | null
  pricing: {
    passPrice: number
    platformFeePercent: number
    organizationPassEarnings: number
    usedFallback: boolean
  }
}

const ORGANIZATION_SETUP_ERROR =
  'Complete your organization name, town, and state before creating a campaign.'
const DEFAULT_CAMPAIGN_LENGTH_DAYS = 42

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value)
}

function formatDateInputValue(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function addDays(dateValue: string, days: number) {
  const [year, month, day] = dateValue.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  date.setDate(date.getDate() + days)
  return formatDateInputValue(date)
}

function getDefaultCampaignDates() {
  const startsAt = formatDateInputValue(new Date())
  return {
    startsAt,
    endsAt: addDays(startsAt, DEFAULT_CAMPAIGN_LENGTH_DAYS),
  }
}

function returnToOrganizationSetup() {
  const setupSection = document.getElementById('organization-setup')

  if (!setupSection) return

  setupSection.scrollIntoView({ behavior: 'smooth', block: 'start' })

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
  organizationId,
  pricing,
}: CreateCampaignFormProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [goalAmount, setGoalAmount] = useState('1000')
  const [defaultDates] = useState(getDefaultCampaignDates)
  const [startsAt, setStartsAt] = useState(defaultDates.startsAt)
  const [endsAt, setEndsAt] = useState(defaultDates.endsAt)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const goalNumber = Number(goalAmount) || 0
  const passesNeeded =
    goalNumber > 0 && pricing.organizationPassEarnings > 0
      ? Math.ceil(goalNumber / pricing.organizationPassEarnings)
      : 0
  const projectedOrganizationEarnings =
    passesNeeded * pricing.organizationPassEarnings

  function handleStartDateChange(nextStartDate: string) {
    setStartsAt(nextStartDate)

    if (!nextStartDate) return

    if (!endsAt || endsAt < nextStartDate) {
      setEndsAt(addDays(nextStartDate, DEFAULT_CAMPAIGN_LENGTH_DAYS))
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setMessage('')

    const goalValue = Number(goalAmount)

    if (goalAmount.trim() === '' || !Number.isFinite(goalValue) || goalValue < 0) {
      setMessage('Enter a valid fundraising goal before creating the campaign.')
      setLoading(false)
      return
    }

    if (startsAt && endsAt && endsAt < startsAt) {
      setMessage('Campaign end date must be on or after the start date.')
      setLoading(false)
      return
    }

    try {
      const result = await createCampaignAction({
        organizationId,
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

      const nextDefaults = getDefaultCampaignDates()
      setMessage('Campaign created!')
      setName('')
      setDescription('')
      setGoalAmount('1000')
      setStartsAt(nextDefaults.startsAt)
      setEndsAt(nextDefaults.endsAt)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div id={id} className="scroll-mt-6">
      <p className="text-xs font-medium text-gray-600">
        <span className="font-bold text-red-600" aria-hidden="true">*</span>{' '}Required fields
      </p>

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <label className="block text-sm font-medium text-gray-700">
          Campaign name <span className="font-bold text-red-600" aria-hidden="true">*</span>
          <span className="sr-only"> required</span>
          <input className="mt-1 w-full rounded-lg border border-gray-300 p-2" placeholder="Campaign name" value={name} onChange={(event) => setName(event.target.value)} required />
        </label>

        <textarea className="w-full rounded-lg border border-gray-300 p-2" placeholder="Short description" value={description} onChange={(event) => setDescription(event.target.value)} />

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Fundraising Goal ($)</label>
          <input className="w-full rounded-lg border border-gray-300 p-2" type="number" min="0" step="0.01" value={goalAmount} onChange={(event) => setGoalAmount(event.target.value)} />
          <p className="mt-1 text-xs text-gray-500">Enter the amount your organization wants to receive after RaiseHub fees.</p>
        </div>

        <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-blue-900">Pricing managed by RaiseHub</p>
              <p className="mt-1 text-xs font-medium text-blue-700">Standard managed pricing</p>
            </div>
            <div className="rounded-lg border border-blue-200 bg-white px-4 py-3 text-right shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">RaiseHub Pass</p>
              <p className="mt-1 text-2xl font-bold text-blue-900">{formatCurrency(pricing.passPrice)}</p>
            </div>
          </div>

          {pricing.usedFallback ? (
            <span className="mt-3 inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
              Temporary fallback pricing
            </span>
          ) : null}

          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div className="rounded-lg bg-white/80 p-3">
              <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">Platform fee on pass</dt>
              <dd className="mt-1 font-semibold text-gray-900">{pricing.platformFeePercent}%</dd>
            </div>
            <div className="rounded-lg bg-white/80 p-3">
              <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">Organization receives per pass</dt>
              <dd className="mt-1 font-semibold text-gray-900">{formatCurrency(pricing.organizationPassEarnings)}</dd>
            </div>
          </dl>

          <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-4 text-green-900">
            <p className="text-sm font-bold">Donations: 100% to the organization</p>
            <p className="mt-1 text-xs leading-5">
              RaiseHub does not keep a percentage of optional donations. The platform fee applies only to the fundraising pass price.
            </p>
          </div>

          <div className="mt-4 rounded-lg bg-white/80 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Fundraising estimate</p>
            <p className="mt-1 text-xl font-bold text-blue-900">{passesNeeded.toLocaleString()} passes needed</p>
            <p className="mt-1 text-sm text-gray-700">Estimated organization earnings: {formatCurrency(projectedOrganizationEarnings)}</p>
          </div>

          <p className="mt-3 text-xs leading-5 text-blue-700">Pass totals round up so the campaign reaches or exceeds the fundraising goal.</p>
          <Link href="/pricing-guidelines" className="mt-3 inline-flex text-sm font-semibold text-blue-800 underline decoration-blue-300 underline-offset-4 hover:text-blue-950">
            View pricing guidelines
          </Link>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div><label className="mb-1 block text-sm font-medium text-gray-600">Starts on</label><input className="w-full rounded-lg border border-gray-300 p-2" type="date" min={defaultDates.startsAt} value={startsAt} onChange={(event) => handleStartDateChange(event.target.value)} /></div>
          <div><label className="mb-1 block text-sm font-medium text-gray-600">Ends on</label><input className="w-full rounded-lg border border-gray-300 p-2" type="date" min={startsAt || defaultDates.startsAt} value={endsAt} onChange={(event) => setEndsAt(event.target.value)} /></div>
        </div>
        <p className="text-xs text-gray-500">Campaigns default to six weeks. You can adjust either date before publishing.</p>
        <button type="submit" disabled={loading || !organizationId} className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">{loading ? 'Creating...' : 'Create Campaign'}</button>
      </form>

      {message ? <p className={`mt-3 rounded-lg p-3 text-sm ${message === 'Campaign created!' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{message}</p> : null}
    </div>
  )
}

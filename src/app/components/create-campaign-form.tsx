'use client'

import { useState } from 'react'
import { createCampaignAction } from '@/app/organization/actions'

export default function CreateCampaignForm() {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [goalAmount, setGoalAmount] = useState('1000')
  const [passPrice, setPassPrice] = useState('20')
  const [startsAt, setStartsAt] = useState('')
  const [endsAt, setEndsAt] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

// =========================================
// 🧮 LIVE FUNDRAISING CALCULATOR (WITH PLATFORM CUT)
// =========================================
const PLATFORM_FEE_PERCENT = 25

const goalNumber = Number(goalAmount) || 0
const passPriceNumber = Number(passPrice) || 0

const orgEarningsPerPass =
  passPriceNumber > 0
    ? passPriceNumber * (1 - PLATFORM_FEE_PERCENT / 100)
    : 0

const passesNeeded =
  goalNumber > 0 && orgEarningsPerPass > 0
    ? Math.ceil(goalNumber / orgEarningsPerPass)
    : 0

  // =========================================
  // 💾 CREATE CAMPAIGN
  // =========================================
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    const result = await createCampaignAction({
      name,
      description,
      goal_amount: goalNumber,
      pass_price: passPriceNumber,
      starts_at: startsAt,
      ends_at: endsAt,
    })

    if (result.error) {
      setMessage(result.error)
      setLoading(false)
      return
    }

    setMessage('Campaign created!')
    setName('')
    setDescription('')
    setGoalAmount('1000')
    setPassPrice('20')
    setStartsAt('')
    setEndsAt('')
    setLoading(false)
  }

  return (
    <div className="rounded-2xl border border-blue-100 bg-white/90 p-6 shadow-xl backdrop-blur">
      {/* =========================================
          🏷️ FORM HEADER
      ========================================= */}
      <h2 className="text-lg font-semibold text-blue-700">
        Create Campaign
      </h2>

      <p className="mt-2 text-sm text-gray-600">
        Start a fundraising campaign powered by local business deals.
      </p>

      {/* =========================================
          📝 CAMPAIGN FORM
      ========================================= */}
      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <input
          className="w-full rounded-lg border border-gray-300 p-2"
          placeholder="Campaign name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <textarea
          className="w-full rounded-lg border border-gray-300 p-2"
          placeholder="Short description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        {/* =========================================
            💰 GOAL + PASS PRICE FIELDS
        ========================================= */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Fundraising Goal ($)
            </label>
            <input
              className="w-full rounded-lg border border-gray-300 p-2"
              type="number"
              min="0"
              value={goalAmount}
              onChange={(e) => setGoalAmount(e.target.value)}
            />
            <p className="mt-1 text-xs text-gray-500">
              Total amount this campaign hopes to raise.
            </p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Pass Price ($ per supporter)
            </label>
            <input
              className="w-full rounded-lg border border-gray-300 p-2"
              type="number"
              min="10"
              max="25"
              value={passPrice}
              onChange={(e) => setPassPrice(e.target.value)}
            />
            <p className="mt-1 text-xs text-gray-500">
              Suggested range: $10–$25 per pass.
            </p>
          </div>
        </div>

{/* =========================================
    🧮 FUNDRAISING ESTIMATE (WITH PLATFORM CUT)
========================================= */}
<div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
  <p className="text-sm font-medium text-blue-700">
    Fundraising Estimate
  </p>

  <p className="mt-1 text-2xl font-bold text-blue-800">
    {passesNeeded.toLocaleString()} passes needed
  </p>
<p className="mt-2 text-sm font-medium text-blue-800">
  You’ll raise: ${(passesNeeded * orgEarningsPerPass).toLocaleString()}
</p>
  <p className="mt-2 text-sm text-blue-700">
    Pass price: ${passPriceNumber || 0}
  </p>

  <p className="text-sm text-blue-700">
    RaiseHub platform fee: {PLATFORM_FEE_PERCENT}%
  </p>

  <p className="text-sm text-blue-700">
    Organization earns: ${orgEarningsPerPass.toFixed(2)} per pass
  </p>

  <p className="mt-2 text-xs text-blue-700">
    To reach ${goalNumber.toLocaleString()}, you’ll need about{' '}
    {passesNeeded.toLocaleString()} supporters.
  </p>
  
</div>

        {/* =========================================
            📅 CAMPAIGN DATES
        ========================================= */}
        <div className="grid gap-3 sm:grid-cols-2">
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

        {/* =========================================
            🔘 SUBMIT BUTTON
        ========================================= */}
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Creating...' : 'Create Campaign'}
        </button>
      </form>

      {message ? <p className="mt-2 text-sm text-gray-600">{message}</p> : null}
    </div>
  )
}
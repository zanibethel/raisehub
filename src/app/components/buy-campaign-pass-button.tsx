'use client'

import Link from 'next/link'
import { useState } from 'react'
import { purchaseCampaignPassAction } from '@/app/campaigns/actions'

type OrganizationOption = {
  id: string
  business_name: string | null
  display_name: string | null
}

type BuyCampaignPassButtonProps = {
  campaignId: string
  passPrice: number
  organizations?: OrganizationOption[]
  defaultOrganizationId?: string | null
  sellerName?: string
  hasActivePass?: boolean
}

export default function BuyCampaignPassButton({
  campaignId,
  passPrice,
  organizations = [],
  defaultOrganizationId = null,
  sellerName = '',
  hasActivePass = false,
}: BuyCampaignPassButtonProps) {
  const [selectedOrganizationId, setSelectedOrganizationId] = useState(
    defaultOrganizationId ?? organizations[0]?.id ?? ''
  )
  const [donationAmount, setDonationAmount] = useState(hasActivePass ? '10' : '0')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [purchaseComplete, setPurchaseComplete] = useState(false)

  // =========================================
  // 🧮 PURCHASE TOTALS
  // If pass is already active, only donation is charged.
  // =========================================
  const donationNumber = Number(donationAmount) || 0
  const effectivePassPrice = hasActivePass ? 0 : passPrice
  const totalAmount = effectivePassPrice + donationNumber

  const selectedOrganization = organizations.find(
    (organization) => organization.id === selectedOrganizationId
  )

  const selectedOrganizationName =
    selectedOrganization?.display_name ||
    selectedOrganization?.business_name ||
    'this organization'

  // =========================================
  // 💳 PURCHASE / DONATION ACTION
  // =========================================
  async function handleBuyPass() {
    if (loading || purchaseComplete) return

    if (totalAmount <= 0) {
      setMessage('Please choose a donation amount.')
      return
    }

    setLoading(true)
    setMessage('')

    const result = await purchaseCampaignPassAction({
      campaign_id: campaignId,
      pass_price: effectivePassPrice,
      selected_organization_id: selectedOrganizationId || undefined,
      donation_amount: donationNumber,
      seller_name: sellerName || undefined,
    })

    if (result.error) {
      setMessage(result.error || 'Something went wrong. Please try again.')
      setLoading(false)
      return
    }

    setPurchaseComplete(true)
    setLoading(false)
  }

  // =========================================
  // ✅ SUCCESS STATE
  // =========================================
  if (purchaseComplete) {
    return (
      <div className="rounded-2xl border border-green-100 bg-green-50 p-5">
        <p className="text-lg font-semibold text-green-800">
          🎉 Thank you for your support!
        </p>

        <p className="mt-2 text-sm text-green-700">
          Your ${totalAmount.toFixed(2)}{' '}
          {hasActivePass ? 'donation' : 'pass purchase'} has been recorded for{' '}
          {selectedOrganizationName}
          {sellerName ? ` in support of ${sellerName}` : ''}.
        </p>

        {donationNumber > 0 ? (
          <p className="mt-2 text-sm text-green-700">
            This includes a ${donationNumber.toFixed(2)} donation add-on.
          </p>
        ) : null}

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <Link
            href="/dashboard"
            className="rounded-lg bg-green-600 px-4 py-2 text-center text-sm font-medium text-white hover:bg-green-700"
          >
            View My Pass
          </Link>

          <Link
            href="/campaigns"
            className="rounded-lg border border-green-200 bg-white px-4 py-2 text-center text-sm font-medium text-green-700 hover:bg-green-100"
          >
            Browse More Fundraisers
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* =========================================
          ✅ ACTIVE PASS NOTICE
      ========================================= */}
      {hasActivePass ? (
  <div className="rounded-xl border border-green-100 bg-green-50 p-4 text-sm text-green-800">
    <p>✅ Pass already active. You can make an additional donation below.</p>

    <Link
      href="/dashboard"
      className="mt-3 inline-flex rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
    >
      View My Pass
    </Link>
  </div>
) : null}

      {/* =========================================
          🏫 ORGANIZATION SUPPORT DROPDOWN
      ========================================= */}
      {organizations.length > 0 ? (
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Organization to support
          </label>

          <select
            value={selectedOrganizationId}
            onChange={(e) => setSelectedOrganizationId(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white p-2 text-sm"
          >
            {organizations.map((organization) => {
              const name =
                organization.display_name ||
                organization.business_name ||
                'Organization'

              return (
                <option key={organization.id} value={organization.id}>
                  {name}
                </option>
              )
            })}
          </select>
        </div>
      ) : null}

      {/* =========================================
          💝 OPTIONAL DONATION ADD-ON
      ========================================= */}
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">
          {hasActivePass ? 'Additional donation' : 'Optional donation add-on'}
        </label>

        <div className="flex flex-wrap gap-2">
          {(hasActivePass ? ['5', '10', '25'] : ['0', '10', '25']).map(
            (amount) => (
              <button
                key={amount}
                type="button"
                onClick={() => setDonationAmount(amount)}
                className={`rounded-lg border px-4 py-2 text-sm font-medium transition ${
                  donationAmount === amount
                    ? 'border-blue-600 bg-blue-600 text-white'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-blue-400'
                }`}
              >
                {amount === '0' ? 'No donation' : `$${amount}`}
              </button>
            )
          )}

          <button
            type="button"
            onClick={() => setDonationAmount('')}
            className={`rounded-lg border px-4 py-2 text-sm font-medium transition ${
              !['0', '5', '10', '25'].includes(donationAmount)
                ? 'border-blue-600 bg-blue-600 text-white'
                : 'border-gray-300 bg-white text-gray-700 hover:border-blue-400'
            }`}
          >
            Custom
          </button>
        </div>

        {!['0', '5', '10', '25'].includes(donationAmount) ? (
          <input
            type="number"
            min="0"
            step="1"
            value={donationAmount}
            onChange={(e) => setDonationAmount(e.target.value)}
            className="mt-3 w-full rounded-lg border border-gray-300 p-2 text-sm"
            placeholder="Enter custom amount"
          />
        ) : null}

        <p className="mt-2 text-xs text-gray-500">
          Donations go directly toward the selected organization.
        </p>
      </div>

      {/* =========================================
          💵 TOTAL SUMMARY
      ========================================= */}
      <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
        {!hasActivePass ? (
          <div className="flex items-center justify-between text-sm text-blue-800">
            <span>Pass price</span>
            <span>${passPrice.toFixed(2)}</span>
          </div>
        ) : null}

        <div className="mt-1 flex items-center justify-between text-sm text-blue-800">
          <span>{hasActivePass ? 'Donation' : 'Donation add-on'}</span>
          <span>${donationNumber.toFixed(2)}</span>
        </div>

        <div className="mt-3 flex items-center justify-between border-t border-blue-200 pt-3 font-semibold text-blue-900">
          <span>Total today</span>
          <span>${totalAmount.toFixed(2)}</span>
        </div>
      </div>

      {/* =========================================
          💳 SUPPORT BUTTON
      ========================================= */}
      <button
        type="button"
        onClick={handleBuyPass}
        disabled={loading}
        className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {loading
          ? 'Processing...'
          : hasActivePass
            ? `Donate Again - $${totalAmount.toFixed(2)}`
            : `Support Campaign - $${totalAmount.toFixed(2)}`}
      </button>

      {message ? <p className="text-sm text-red-600">{message}</p> : null}
    </div>
  )
}
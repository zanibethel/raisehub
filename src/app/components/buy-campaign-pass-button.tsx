'use client'

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
}

export default function BuyCampaignPassButton({
  campaignId,
  passPrice,
  organizations = [],
  defaultOrganizationId = null,
}: BuyCampaignPassButtonProps) {
  const [selectedOrganizationId, setSelectedOrganizationId] = useState(
    defaultOrganizationId ?? organizations[0]?.id ?? ''
  )
  const [donationAmount, setDonationAmount] = useState('0')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const donationNumber = Number(donationAmount) || 0
  const totalAmount = passPrice + donationNumber

  // =========================================
  // 💳 SIMULATED PURCHASE
  // Later this can be replaced with Stripe checkout.
  // =========================================
  async function handleBuyPass() {
    setLoading(true)
    setMessage('')

    const result = await purchaseCampaignPassAction({
      campaign_id: campaignId,
      pass_price: passPrice,
      selected_organization_id: selectedOrganizationId || undefined,
      donation_amount: donationNumber,
    })

    if (result.error) {
      setMessage(result.error)
      setLoading(false)
      return
    }

    setMessage('Pass purchased successfully! Test payment recorded.')
    setLoading(false)
  }

  return (
    <div className="space-y-3">
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
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Optional donation add-on
        </label>

        <input
          type="number"
          min="0"
          step="1"
          value={donationAmount}
          onChange={(e) => setDonationAmount(e.target.value)}
          className="w-full rounded-lg border border-gray-300 p-2 text-sm"
          placeholder="0"
        />

        <p className="mt-1 text-xs text-gray-500">
          Donations go directly toward the selected organization.
        </p>
      </div>

      {/* =========================================
          💳 BUY BUTTON
      ========================================= */}
      <button
        type="button"
        onClick={handleBuyPass}
        disabled={loading}
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Processing...' : `Buy Pass - $${totalAmount}`}
      </button>

      {message ? (
        <p className="mt-2 text-sm text-gray-600">{message}</p>
      ) : null}
    </div>
  )
}
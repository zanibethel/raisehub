'use client'

import { useState } from 'react'
import { purchaseCampaignPassAction } from '@/app/campaigns/actions'

type BuyCampaignPassButtonProps = {
  campaignId: string
  passPrice: number
}

export default function BuyCampaignPassButton({
  campaignId,
  passPrice,
}: BuyCampaignPassButtonProps) {
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

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
    <div>
      <button
        type="button"
        onClick={handleBuyPass}
        disabled={loading}
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Processing...' : `Buy Pass - $${passPrice}`}
      </button>

      {message ? (
        <p className="mt-2 text-sm text-gray-600">{message}</p>
      ) : null}
    </div>
  )
}
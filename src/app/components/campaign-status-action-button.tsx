'use client'

import { useState } from 'react'

import { updateCampaignStatusAction } from '@/app/organization/actions'

type CampaignStatusActionButtonProps = {
  campaignId: string
  campaignName: string
  status: 'paused' | 'active' | 'archived'
  label: string
  pendingLabel: string
  className: string
  confirmMessage?: string
}

export default function CampaignStatusActionButton({
  campaignId,
  campaignName,
  status,
  label,
  pendingLabel,
  className,
  confirmMessage,
}: CampaignStatusActionButtonProps) {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  async function handleAction() {
    if (confirmMessage) {
      const safeCampaignName = campaignName
        .replace(/\r?\n/g, ' ')
        .replace(/"/g, '\\"')

      const confirmed = window.confirm(
        confirmMessage.replace(
          '{campaignName}',
          safeCampaignName
        )
      )

      if (!confirmed) {
        return
      }
    }

    setLoading(true)
    setMessage('')

    const result = await updateCampaignStatusAction(
      campaignId,
      status
    )

    if (result.error) {
      setMessage(result.error)
      setLoading(false)
      return
    }

    setLoading(false)
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleAction}
        disabled={loading}
        className={`${className} disabled:opacity-50`}
      >
        {loading ? pendingLabel : label}
      </button>

      {message ? (
        <p className="mt-2 text-xs text-red-600">{message}</p>
      ) : null}
    </div>
  )
}

'use client'

import { useState } from 'react'
import { archiveCampaignAction } from '@/app/organization/archive-campaign-action'

type ArchiveCampaignButtonProps = {
  campaignId: string
  campaignName: string
}

export default function ArchiveCampaignButton({
  campaignId,
  campaignName,
}: ArchiveCampaignButtonProps) {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  // =========================================
  // 🗄️ ARCHIVE CAMPAIGN
  // =========================================
  async function handleArchive() {
    const confirmed = window.confirm(
      `Archive "${campaignName}"? This will hide it from public pages but keep reports and purchase history.`
    )

    if (!confirmed) return

    setLoading(true)
    setMessage('')

    const result = await archiveCampaignAction(campaignId)

    if (result.error) {
      setMessage(result.error)
      setLoading(false)
      return
    }

    setMessage('Campaign archived.')
    setLoading(false)
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleArchive}
        disabled={loading}
        className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
      >
        {loading ? 'Archiving...' : 'Archive Campaign'}
      </button>

      {message ? <p className="mt-2 text-xs text-red-600">{message}</p> : null}
    </div>
  )
}
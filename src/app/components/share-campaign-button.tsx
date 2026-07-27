'use client'

import { useState } from 'react'

type ShareCampaignButtonProps = {
  campaignId: string
  campaignName: string
}

export default function ShareCampaignButton({
  campaignId,
  campaignName,
}: ShareCampaignButtonProps) {
  const [message, setMessage] = useState('')

  // =========================================
  // 🔗 SHARE / COPY CAMPAIGN LINK
  // =========================================
  async function handleShare() {
    const url = `${window.location.origin}/campaigns/${campaignId}`

    try {
      if (navigator.share) {
        await navigator.share({
          title: campaignName,
          text: `Support this fundraiser on RaiseHub: ${campaignName}`,
          url,
        })

        return
      }

      await navigator.clipboard.writeText(url)
      setMessage('Campaign link copied!')
    } catch (error) {
      // User canceled native share sheet — no need to show an error.
      if (error instanceof DOMException && error.name === 'AbortError') {
        return
      }

      console.error('Share failed:', error)
      setMessage('Could not share campaign. Please try again.')
    }
  }

  return (
    <div className="flex h-full min-w-0 flex-col">
      <button
        type="button"
        onClick={handleShare}
        className="flex min-h-10 w-full flex-1 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-center text-sm font-medium leading-tight text-blue-700 hover:bg-blue-100"
      >
        Share Campaign
      </button>

      {message ? (
        <p className="mt-2 text-center text-xs text-blue-700">{message}</p>
      ) : null}
    </div>
  )
}

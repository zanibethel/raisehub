'use client'

import { useState } from 'react'

type Props = {
  url: string
  campaignName: string
}

export default function ShareSellerLink({ url, campaignName }: Props) {
  const [message, setMessage] = useState<string | null>(null)

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url)
      setMessage('Seller link copied.')
    } catch {
      setMessage('Unable to copy automatically. Press and hold the link to copy it.')
    }
  }

  async function shareLink() {
    if (!navigator.share) {
      await copyLink()
      return
    }

    try {
      await navigator.share({
        title: campaignName,
        text: `Support my fundraiser through RaiseHub: ${campaignName}`,
        url,
      })
      setMessage('Share menu opened.')
    } catch {
      // Closing the native share sheet is not an error the user needs to resolve.
    }
  }

  return (
    <div className="space-y-3">
      <label htmlFor="seller-share-link" className="text-sm font-semibold text-gray-800">
        Your personal campaign link
      </label>
      <input
        id="seller-share-link"
        readOnly
        value={url}
        onFocus={(event) => event.currentTarget.select()}
        className="w-full rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-950"
      />
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={copyLink}
          className="rounded-xl border border-blue-200 bg-white px-4 py-3 text-sm font-bold text-blue-700 hover:bg-blue-50"
        >
          Copy link
        </button>
        <button
          type="button"
          onClick={shareLink}
          className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-700"
        >
          Share
        </button>
      </div>
      {message ? <p className="text-sm text-gray-600" role="status">{message}</p> : null}
    </div>
  )
}

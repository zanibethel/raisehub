'use client'

import { useState } from 'react'

type RedemptionReportProps = {
  offerId: string
  redemptionCount: number
  redemptions: { user_id: string; created_at: string }[]
  profileEmailById: Record<string, string>
}

export default function RedemptionReport({
  offerId,
  redemptionCount,
  redemptions,
  profileEmailById,
}: RedemptionReportProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="mt-4">
      <div className="rounded-lg bg-green-50 px-4 py-2 text-sm text-green-700">
        Redemptions: {redemptionCount}
      </div>

      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="mt-3 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:border-green-600 hover:text-green-700"
      >
        {isOpen ? 'Hide Redemption Report' : 'View Redemption Report'}
      </button>

      {isOpen ? (
        <div className="mt-4 rounded-lg border border-gray-200 bg-white/70 p-4">
          <p className="text-sm font-medium text-gray-800">
            Recent Redemptions
          </p>

          {redemptions.length ? (
            <div className="mt-3 space-y-2 text-sm text-gray-600">
              {redemptions.map((redemption, index) => (
                <div
                  key={`${offerId}-${redemption.user_id}-${redemption.created_at}-${index}`}
                  className="rounded-lg bg-gray-50 px-3 py-2"
                >
                  <p className="font-medium text-gray-800">
                    {profileEmailById[redemption.user_id] || 'Unknown user'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(redemption.created_at).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm text-gray-500">No redemptions yet.</p>
          )}
        </div>
      ) : null}
    </div>
  )
}
'use client'

import { useRouter } from 'next/navigation'

type UpgradePlanModalProps = {
  isOpen: boolean
  onClose: () => void
  businessId?: string | null
}

export default function UpgradePlanModal({
  isOpen,
  onClose,
  businessId,
}: UpgradePlanModalProps) {
  const router = useRouter()

  if (!isOpen) return null

  const upgradeHref = businessId
    ? `/upgrade?business=${encodeURIComponent(businessId)}`
    : '/upgrade'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <h2 className="text-xl font-semibold text-gray-900">Upgrade to Growth</h2>

        <p className="mt-3 text-sm text-gray-600">
          Free businesses can list up to 3 active offers. Growth removes that
          limit and unlocks paid growth tools as they become available.
        </p>

        <div className="mt-5 space-y-3 rounded-xl bg-gray-50 p-4">
          <div>
            <p className="font-medium text-gray-900">Free</p>
            <p className="text-sm text-gray-600">
              Up to 3 active offers with standard visibility
            </p>
          </div>

          <div>
            <p className="font-medium text-gray-900">
              Growth — $11.99/month
            </p>
            <p className="text-sm text-gray-600">
              More active offers plus Growth-tier benefits
            </p>
          </div>

          <div>
            <p className="font-medium text-gray-900">
              Growth Annual — $74.99/year
            </p>
            <p className="text-sm text-gray-600">
              The lowest effective monthly price
            </p>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={() => {
              onClose()
              router.push(upgradeHref)
            }}
            className="flex-1 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
          >
            View Growth Plans
          </button>

          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:border-gray-400"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

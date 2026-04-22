'use client'

import Link from 'next/link'

export default function UpgradePage() {
  return (
    <div className="mx-auto max-w-xl p-6">
      <h1 className="text-2xl font-semibold text-gray-900">
        Upgrade Your Plan
      </h1>

      <p className="mt-3 text-gray-600">
        You’ve reached the free limit of 3 active offers. Upgrade to unlock more
        offers, stronger promotion, and better visibility in your area.
      </p>

      <div className="mt-6 space-y-4 rounded-xl border border-gray-200 p-4">
        <div>
          <p className="font-medium text-gray-900">Pro — $11.99/month</p>
          <p className="text-sm text-gray-600">
            Unlimited offers, better placement, and increased visibility
          </p>
        </div>

        <div>
          <p className="font-medium text-gray-900">Pro Annual — $74.99/year</p>
          <p className="text-sm text-gray-600">
            Best value for growing businesses
          </p>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        <div className="w-full rounded-lg bg-green-600 px-4 py-2 text-center text-white">
          Stripe checkout coming next
        </div>

        <Link
          href="/dashboard"
          className="block w-full rounded-lg border border-gray-300 px-4 py-2 text-center text-gray-700 hover:border-gray-400"
        >
          Back to Dashboard
        </Link>
      </div>

      <p className="mt-4 text-xs text-gray-500">
        Payments coming soon — we’re preparing checkout.
      </p>
    </div>
  )
}
'use client'

import { useState } from 'react'

type OrganizationReportToggleProps = {
  grossRevenue: number
  totalFees: number
  totalEarnings: number
  totalPassesSold: number
}

export default function OrganizationReportToggle({
  grossRevenue,
  totalFees,
  totalEarnings,
  totalPassesSold,
}: OrganizationReportToggleProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="rounded-2xl border border-blue-100 bg-white/90 p-6 shadow-xl backdrop-blur">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100"
      >
        {isOpen ? 'Hide Details / Report' : 'Show Details / Report'}
      </button>

      {isOpen ? (
        <div className="mt-5 grid gap-4 sm:grid-cols-4">
          <div>
            <p className="text-sm text-gray-500">Passes Sold</p>
            <p className="mt-1 text-xl font-bold text-gray-900">
              {totalPassesSold}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">Gross Revenue</p>
            <p className="mt-1 text-xl font-bold text-gray-900">
              ${grossRevenue.toLocaleString()}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">RaiseHub Fees</p>
            <p className="mt-1 text-xl font-bold text-gray-900">
              ${totalFees.toLocaleString()}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">Organization Earned</p>
            <p className="mt-1 text-xl font-bold text-gray-900">
              ${totalEarnings.toLocaleString()}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  )
}
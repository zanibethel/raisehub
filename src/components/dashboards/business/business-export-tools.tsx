'use client'

import { useState } from 'react'

// =============================================================================
// Types
// =============================================================================

export type BusinessExportRow = {
  offerTitle: string
  offerStatus: string
  customerEmail: string
  redeemedAt: string
}

type BusinessExportToolsProps = {
  rows: BusinessExportRow[]
  businessName?: string | null
}

// =============================================================================
// CSV helpers
// =============================================================================

function escapeCsvValue(value: string): string {
  const normalizedValue = value.replace(
    /\r?\n|\r/g,
    ' '
  )

  if (
    normalizedValue.includes(',') ||
    normalizedValue.includes('"')
  ) {
    return `"${normalizedValue.replace(
      /"/g,
      '""'
    )}"`
  }

  return normalizedValue
}

function buildCsv(
  rows: BusinessExportRow[]
): string {
  const headers = [
    'Offer',
    'Offer Status',
    'Customer Email',
    'Redeemed At',
  ]

  const csvRows = rows.map((row) =>
    [
      row.offerTitle,
      row.offerStatus,
      row.customerEmail,
      row.redeemedAt,
    ]
      .map(escapeCsvValue)
      .join(',')
  )

  return [
    headers.join(','),
    ...csvRows,
  ].join('\n')
}

function createExportFilename(
  businessName?: string | null
): string {
  const date = new Date()
    .toISOString()
    .slice(0, 10)

  const safeBusinessName = (
    businessName?.trim() ||
    'business'
  )
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return `${safeBusinessName}-redemptions-${date}.csv`
}

// =============================================================================
// Component
// =============================================================================

export default function BusinessExportTools({
  rows,
  businessName,
}: BusinessExportToolsProps) {
  const [
    exportMessage,
    setExportMessage,
  ] = useState<string | null>(null)

  function handleExport() {
    if (rows.length === 0) {
      setExportMessage(
        'There are no redemption records available to export yet.'
      )

      return
    }

    try {
      const csv = buildCsv(rows)

      const blob = new Blob([csv], {
        type: 'text/csv;charset=utf-8',
      })

      const downloadUrl =
        URL.createObjectURL(blob)

      const downloadLink =
        document.createElement('a')

      downloadLink.href = downloadUrl
      downloadLink.download =
        createExportFilename(businessName)

      document.body.appendChild(
        downloadLink
      )

      downloadLink.click()
      downloadLink.remove()

      URL.revokeObjectURL(downloadUrl)

      setExportMessage(
        `${rows.length} ${
          rows.length === 1
            ? 'redemption record was'
            : 'redemption records were'
        } exported successfully.`
      )
    } catch {
      setExportMessage(
        'The export could not be created. Please refresh the dashboard and try again.'
      )
    }
  }

  return (
    <section
      aria-labelledby="business-export-tools-title"
      className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-green-700">
            Reporting tools
          </p>

          <h2
            id="business-export-tools-title"
            className="mt-1 text-xl font-bold text-gray-900"
          >
            Export Redemption Report
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
            Download this business’s redemption
            records as a CSV file for bookkeeping,
            campaign reviews, or offline analysis.
          </p>
        </div>

        <button
          type="button"
          onClick={handleExport}
          disabled={rows.length === 0}
          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-green-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-green-800 disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          Download CSV
        </button>
      </div>

      <div className="mt-5 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium text-gray-800">
            Available records
          </p>

          <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-gray-700 shadow-sm">
            {rows.length}{' '}
            {rows.length === 1
              ? 'redemption'
              : 'redemptions'}
          </span>
        </div>

        <p className="mt-2 text-xs leading-5 text-gray-500">
          The export includes the offer title,
          current offer status, customer email,
          and redemption date.
        </p>
      </div>

      {exportMessage ? (
        <p
          aria-live="polite"
          className="mt-4 text-sm font-medium text-gray-700"
        >
          {exportMessage}
        </p>
      ) : null}
    </section>
  )
}
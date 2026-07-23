'use client'

import { useState } from 'react'

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

function escapeCsvValue(value: string): string {
  const normalizedValue = value.replace(/\r?\n|\r/g, ' ')

  if (normalizedValue.includes(',') || normalizedValue.includes('"')) {
    return `"${normalizedValue.replace(/"/g, '""')}"`
  }

  return normalizedValue
}

function buildCsv(rows: BusinessExportRow[]): string {
  const headers = ['Offer', 'Offer Status', 'Customer Email', 'Redeemed At']
  const csvRows = rows.map((row) =>
    [row.offerTitle, row.offerStatus, row.customerEmail, row.redeemedAt]
      .map(escapeCsvValue)
      .join(',')
  )

  return [headers.join(','), ...csvRows].join('\n')
}

function createExportFilename(businessName?: string | null): string {
  const date = new Date().toISOString().slice(0, 10)
  const safeBusinessName = (businessName?.trim() || 'business')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return `${safeBusinessName}-redemptions-${date}.csv`
}

export default function BusinessExportTools({
  rows,
  businessName,
}: BusinessExportToolsProps) {
  const [exportMessage, setExportMessage] = useState<string | null>(null)

  function handleExport() {
    if (rows.length === 0) {
      setExportMessage('No redemption records are available yet.')
      return
    }

    try {
      const blob = new Blob([buildCsv(rows)], {
        type: 'text/csv;charset=utf-8',
      })
      const downloadUrl = URL.createObjectURL(blob)
      const downloadLink = document.createElement('a')

      downloadLink.href = downloadUrl
      downloadLink.download = createExportFilename(businessName)
      document.body.appendChild(downloadLink)
      downloadLink.click()
      downloadLink.remove()
      URL.revokeObjectURL(downloadUrl)

      setExportMessage(`${rows.length} redemption record${rows.length === 1 ? '' : 's'} exported.`)
    } catch {
      setExportMessage('The CSV could not be created. Please try again.')
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleExport}
        disabled={rows.length === 0}
        className="inline-flex min-h-10 items-center justify-center rounded-xl border border-green-200 bg-white px-3 py-2 text-xs font-bold text-green-700 transition hover:bg-green-50 disabled:cursor-not-allowed disabled:border-gray-200 disabled:text-gray-400"
      >
        Download CSV
      </button>
      {exportMessage ? (
        <span aria-live="polite" className="max-w-40 text-right text-[10px] leading-4 text-gray-500">
          {exportMessage}
        </span>
      ) : null}
    </div>
  )
}

'use client'

import { useMemo, useState } from 'react'

type CampaignSeller = {
  seller: string
  sold: number
  gross: number
  earnings: number
  lastSaleAt: string | null
}

export type CampaignPerformanceReport = {
  campaignId: string
  campaignName: string
  status: string
  createdAt: string | null
  passesSold: number
  grossRevenue: number
  organizationEarnings: number
  sellerCount: number
  supporterCount: number
  sellers: CampaignSeller[]
}

type OrganizationTopSellersSectionProps = {
  campaignReports: CampaignPerformanceReport[]
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value)
}

function formatDate(value: string | null) {
  if (!value) return 'No recorded sale'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'No recorded sale' : date.toLocaleDateString()
}

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function escapeCsv(value: string | number) {
  return `"${String(value).replaceAll('"', '""')}"`
}

export default function OrganizationTopSellersSection({
  campaignReports,
}: OrganizationTopSellersSectionProps) {
  const defaultCampaign =
    campaignReports.find((campaign) => campaign.status.toLowerCase() === 'active') ??
    campaignReports[0]
  const [selectedCampaignId, setSelectedCampaignId] = useState(defaultCampaign?.campaignId ?? '')

  const selectedCampaign = useMemo(
    () =>
      campaignReports.find((campaign) => campaign.campaignId === selectedCampaignId) ??
      defaultCampaign,
    [campaignReports, defaultCampaign, selectedCampaignId]
  )

  function downloadCsv() {
    if (!selectedCampaign) return

    const rows = [
      ['rank', 'seller', 'passes_sold', 'gross_sales', 'organization_earnings', 'last_recorded_sale'],
      ...selectedCampaign.sellers.map((seller, index) => [
        index + 1,
        seller.seller,
        seller.sold,
        seller.gross.toFixed(2),
        seller.earnings.toFixed(2),
        seller.lastSaleAt ?? '',
      ]),
    ]
    const csv = rows.map((row) => row.map(escapeCsv).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${slugify(selectedCampaign.campaignName)}-performance-report.csv`
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
  }

  if (!selectedCampaign) {
    return (
      <section className="rounded-2xl border border-yellow-100 bg-white/90 p-5 shadow-sm">
        <h2 className="text-lg font-bold text-gray-900">Campaign performance</h2>
        <p className="mt-2 text-sm text-gray-600">No campaigns are available for reporting yet.</p>
      </section>
    )
  }

  return (
    <section className="rounded-2xl border border-yellow-100 bg-white/90 p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-bold text-gray-900">Campaign performance report</h2>
          <p className="mt-1 text-sm text-gray-600">
            Select any current or historical campaign to view its recorded results.
          </p>
        </div>

        <div className="w-full sm:max-w-xs">
          <label htmlFor="performance-campaign" className="text-xs font-bold uppercase tracking-wide text-gray-600">
            Campaign
          </label>
          <select
            id="performance-campaign"
            value={selectedCampaign.campaignId}
            onChange={(event) => setSelectedCampaignId(event.target.value)}
            className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-3 text-sm font-semibold text-gray-900"
          >
            {campaignReports.map((campaign) => (
              <option key={campaign.campaignId} value={campaign.campaignId}>
                {campaign.campaignName} · {campaign.status}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Status</p>
          <p className="mt-1 font-bold capitalize text-gray-900">{selectedCampaign.status}</p>
        </div>
        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Passes sold</p>
          <p className="mt-1 font-bold text-gray-900">{selectedCampaign.passesSold.toLocaleString()}</p>
        </div>
        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Gross sales</p>
          <p className="mt-1 font-bold text-gray-900">{formatCurrency(selectedCampaign.grossRevenue)}</p>
        </div>
        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Organization earnings</p>
          <p className="mt-1 font-bold text-emerald-700">{formatCurrency(selectedCampaign.organizationEarnings)}</p>
        </div>
        <div className="rounded-xl bg-slate-50 p-3 col-span-2 lg:col-span-1">
          <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Recorded sellers</p>
          <p className="mt-1 font-bold text-gray-900">{selectedCampaign.sellerCount.toLocaleString()}</p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-bold text-gray-900">Seller results</h3>
          <p className="mt-1 text-xs text-gray-500">
            Historical sales stay attached to this campaign even when its active roster changes.
          </p>
        </div>
        <button
          type="button"
          onClick={downloadCsv}
          className="inline-flex items-center justify-center rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700 hover:bg-blue-100"
        >
          Download CSV report
        </button>
      </div>

      {selectedCampaign.sellers.length > 0 ? (
        <div className="mt-4 space-y-3">
          {selectedCampaign.sellers.map((seller, index) => (
            <div
              key={`${selectedCampaign.campaignId}:${seller.seller}`}
              className="rounded-xl border border-yellow-100 bg-yellow-50 p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="truncate font-bold text-gray-900">#{index + 1} {seller.seller}</p>
                  <p className="mt-1 text-sm text-gray-600">
                    {seller.sold.toLocaleString()} passes sold · Last sale {formatDate(seller.lastSaleAt)}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-bold text-yellow-800">{formatCurrency(seller.gross)} sales</p>
                  <p className="mt-1 text-xs font-semibold text-emerald-700">
                    {formatCurrency(seller.earnings)} earned
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-gray-600">
          No seller-attributed sales were recorded for this campaign.
        </p>
      )}
    </section>
  )
}

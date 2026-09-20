'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'

import {
  getAuthorizationStatusLabel,
  getOrganizationTypeLabel,
  getTaxExemptStatusLabel,
  maskTaxIdLast4,
} from '@/lib/organizations/compliance-profile'
import {
  loadCampaignPerformanceReportAction,
  type CampaignPerformanceReport,
} from '../organization-performance-actions'

type CampaignOption = {
  id: string
  name: string
  status: string
  created_at: string | null
}

type LegacyTopSeller = {
  seller: string
  sold: number
  earnings: number
}

type OrganizationTopSellersSectionProps = {
  campaigns: CampaignOption[]
  sellers: LegacyTopSeller[]
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

function reportValue(value: string | null | undefined) {
  return value?.trim() || 'Not provided'
}

function escapeCsv(value: string | number) {
  return `"${String(value).replaceAll('"', '""')}"`
}

export default function OrganizationTopSellersSection({
  campaigns,
}: OrganizationTopSellersSectionProps) {
  const defaultCampaign =
    campaigns.find((campaign) => campaign.status.toLowerCase() === 'active') ?? campaigns[0]
  const [selectedCampaignId, setSelectedCampaignId] = useState(defaultCampaign?.id ?? '')
  const [report, setReport] = useState<CampaignPerformanceReport | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const selectedCampaign = useMemo(
    () => campaigns.find((campaign) => campaign.id === selectedCampaignId) ?? defaultCampaign,
    [campaigns, defaultCampaign, selectedCampaignId]
  )

  useEffect(() => {
    if (!selectedCampaign?.id) return

    setError(null)
    startTransition(async () => {
      const result = await loadCampaignPerformanceReportAction(selectedCampaign.id)
      if (!result.success) {
        setReport(null)
        setError(result.error)
        return
      }
      setReport(result.data)
    })
  }, [selectedCampaign?.id])

  function downloadCsv() {
    if (!report) return

    const organization = report.organizationContext
    const rows = [
      ['campaign', report.campaignName],
      ['status', report.status],
      ['goal_amount', report.goalAmount.toFixed(2)],
      ['starts_at', report.startsAt ?? ''],
      ['ends_at', report.endsAt ?? ''],
      ['completed_at', report.completedAt ?? ''],
      ['passes_sold', report.passesSold],
      ['gross_sales', report.grossRevenue.toFixed(2)],
      ['organization_earnings', report.organizationEarnings.toFixed(2)],
      ['supporters', report.supporterCount],
      ['recorded_sellers', report.sellerCount],
      ['organization_name', organization?.organizationName ?? ''],
      ['organization_type', organization?.organizationType ?? ''],
      ['legal_entity_name', organization?.legalEntityName ?? ''],
      ['tax_id_masked', organization ? maskTaxIdLast4(organization.taxIdLast4) : 'Not provided'],
      ['tax_exempt_status', organization?.taxExemptStatus ?? ''],
      ['authorization_status', organization?.authorizationStatus ?? ''],
      ['authorization_contact_name', organization?.authorizationContactName ?? ''],
      ['authorization_contact_role', organization?.authorizationContactRole ?? ''],
      ['authorization_contact_email', organization?.authorizationContactEmail ?? ''],
      ['organization_data_source', organization?.source ?? ''],
      ['organization_data_captured_at', organization?.capturedAt ?? ''],
      [],
      ['rank', 'seller', 'passes_sold', 'gross_sales', 'organization_earnings', 'last_recorded_sale'],
      ...report.sellers.map((seller, index) => [
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
    anchor.download = `${slugify(report.campaignName)}-performance-report.csv`
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
            value={selectedCampaign.id}
            onChange={(event) => setSelectedCampaignId(event.target.value)}
            className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-3 text-sm font-semibold text-gray-900"
          >
            {campaigns.map((campaign) => (
              <option key={campaign.id} value={campaign.id}>
                {campaign.name} · {campaign.status}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isPending ? (
        <p className="mt-5 rounded-xl bg-blue-50 p-4 text-sm font-semibold text-blue-800">
          Loading campaign results…
        </p>
      ) : null}

      {error ? (
        <p className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-800">
          {error}
        </p>
      ) : null}

      {report && !isPending ? (
        <>
          <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-6">
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Status</p>
              <p className="mt-1 font-bold capitalize text-gray-900">{report.status}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Passes sold</p>
              <p className="mt-1 font-bold text-gray-900">{report.passesSold.toLocaleString()}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Gross sales</p>
              <p className="mt-1 font-bold text-gray-900">{formatCurrency(report.grossRevenue)}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Organization earnings</p>
              <p className="mt-1 font-bold text-emerald-700">{formatCurrency(report.organizationEarnings)}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Supporters</p>
              <p className="mt-1 font-bold text-gray-900">{report.supporterCount.toLocaleString()}</p>
            </div>
            <div className="col-span-2 rounded-xl bg-slate-50 p-3 lg:col-span-1">
              <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Recorded sellers</p>
              <p className="mt-1 font-bold text-gray-900">{report.sellerCount.toLocaleString()}</p>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-700">
                  Organization details
                </p>
                <h3 className="mt-1 text-lg font-black text-slate-950">
                  {report.organizationContext?.organizationName || 'Organization information'}
                </h3>
              </div>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-blue-800">
                {report.organizationContext?.source === 'completion_snapshot'
                  ? 'Snapshot from campaign close'
                  : 'Current profile values'}
              </span>
            </div>

            <p className="mt-2 text-sm leading-6 text-blue-950">
              Available organization values are included for recordkeeping. Missing values are shown
              as Not provided and do not make the campaign report incomplete.
            </p>

            <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
              {[
                ['Organization type', getOrganizationTypeLabel(report.organizationContext?.organizationType)],
                ['Legal entity', reportValue(report.organizationContext?.legalEntityName)],
                ['Tax ID', report.organizationContext ? maskTaxIdLast4(report.organizationContext.taxIdLast4) : 'Not provided'],
                ['Tax-exempt status', getTaxExemptStatusLabel(report.organizationContext?.taxExemptStatus)],
                ['Authorization', getAuthorizationStatusLabel(report.organizationContext?.authorizationStatus)],
                [
                  'Authorization contact',
                  [
                    report.organizationContext?.authorizationContactName,
                    report.organizationContext?.authorizationContactRole,
                    report.organizationContext?.authorizationContactEmail,
                  ].filter(Boolean).join(' · ') || 'Not provided',
                ],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl border border-blue-100 bg-white p-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
                  <p className="mt-1 break-words font-semibold text-slate-900">{value}</p>
                </div>
              ))}
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

          {report.sellers.length > 0 ? (
            <div className="mt-4 space-y-3">
              {report.sellers.map((seller, index) => (
                <div
                  key={`${report.campaignId}:${seller.seller}`}
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
        </>
      ) : null}
    </section>
  )
}

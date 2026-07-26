'use client'

import { ChangeEvent, useMemo, useState } from 'react'

type CampaignOption = {
  id: string
  name: string
  status: string
}

type SellerRow = {
  id: string
  name: string
  status: 'active' | 'inactive'
  claimed: boolean
  referralCode: string
  passesSold: number
  grossSales: number
}

type Props = {
  campaigns: CampaignOption[]
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function escapeCsv(value: string | number | boolean) {
  const text = String(value)
  return `"${text.replaceAll('"', '""')}"`
}

function downloadFile(filename: string, contents: string, type = 'text/csv;charset=utf-8') {
  const blob = new Blob([contents], { type })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

export default function OrganizationSellerRosterPreview({ campaigns }: Props) {
  const [selectedCampaignId, setSelectedCampaignId] = useState(campaigns[0]?.id ?? '')
  const [names, setNames] = useState('')
  const [rows, setRows] = useState<SellerRow[]>([])
  const [message, setMessage] = useState<string | null>(null)

  const selectedCampaign = campaigns.find((campaign) => campaign.id === selectedCampaignId) ?? campaigns[0]
  const activeRows = useMemo(() => rows.filter((row) => row.status === 'active'), [rows])

  function addNames() {
    const parsed = names
      .split(/\r?\n|,/)
      .map((name) => name.trim())
      .filter(Boolean)

    if (parsed.length === 0) {
      setMessage('Add at least one seller, student, or participant name.')
      return
    }

    const existing = new Set(rows.map((row) => row.name.toLowerCase()))
    const unique = parsed.filter((name) => !existing.has(name.toLowerCase()))

    const added = unique.map((name, index) => {
      const referralCode = `${slugify(name) || 'seller'}-${Math.random().toString(36).slice(2, 7)}`
      return {
        id: `${Date.now()}-${index}`,
        name,
        status: 'active' as const,
        claimed: false,
        referralCode,
        passesSold: 0,
        grossSales: 0,
      }
    })

    setRows((current) => [...current, ...added])
    setNames('')
    setMessage(
      added.length === parsed.length
        ? `${added.length} roster ${added.length === 1 ? 'entry' : 'entries'} added to this preview.`
        : `${added.length} added. ${parsed.length - added.length} duplicate ${parsed.length - added.length === 1 ? 'name was' : 'names were'} skipped.`,
    )
  }

  function handleCsvUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      const text = String(reader.result ?? '')
      const lines = text.split(/\r?\n/).filter(Boolean)
      const first = lines[0]?.toLowerCase() ?? ''
      const dataLines = first.includes('name') ? lines.slice(1) : lines
      const importedNames = dataLines
        .map((line) => line.split(',')[0]?.replace(/^"|"$/g, '').trim())
        .filter(Boolean)

      setNames(importedNames.join('\n'))
      setMessage(`${importedNames.length} names loaded for review. Select “Add to roster” to confirm.`)
    }
    reader.readAsText(file)
    event.target.value = ''
  }

  function downloadTemplate() {
    downloadFile('raisehub-seller-roster-template.csv', 'name\n"Example Seller"\n"Example Student"\n')
  }

  function downloadRoster() {
    const campaignName = selectedCampaign?.name ?? 'campaign'
    const header = [
      'seller_name',
      'status',
      'account_status',
      'referral_code',
      'personal_campaign_link',
      'passes_sold',
      'gross_sales',
    ]
    const data = rows.map((row) => [
      row.name,
      row.status,
      row.claimed ? 'claimed' : 'managed',
      row.referralCode,
      `${window.location.origin}/campaigns/${selectedCampaignId}?seller=${row.referralCode}`,
      row.passesSold,
      row.grossSales.toFixed(2),
    ])
    const csv = [header, ...data].map((line) => line.map(escapeCsv).join(',')).join('\n')
    downloadFile(`${slugify(campaignName)}-seller-roster.csv`, csv)
  }

  function copyLink(row: SellerRow) {
    const link = `${window.location.origin}/campaigns/${selectedCampaignId}?seller=${row.referralCode}`
    navigator.clipboard.writeText(link)
    setMessage(`Copied ${row.name}’s campaign link.`)
  }

  function toggleStatus(id: string) {
    setRows((current) => current.map((row) => row.id === id ? { ...row, status: row.status === 'active' ? 'inactive' : 'active' } : row))
  }

  function renameSeller(id: string) {
    const current = rows.find((row) => row.id === id)
    if (!current) return
    const next = window.prompt('Update seller display name', current.name)?.trim()
    if (!next) return
    setRows((all) => all.map((row) => row.id === id ? { ...row, name: next } : row))
  }

  if (campaigns.length === 0) return null

  return (
    <details className="group rounded-2xl border border-emerald-100 bg-white/90 shadow-xl backdrop-blur">
      <summary className="cursor-pointer list-none px-5 py-4 sm:px-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-lg font-bold text-gray-900">Seller roster & links</p>
            <p className="mt-1 text-sm text-gray-600">
              {rows.length} rostered · {activeRows.length} active · unique links ready for sharing
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 group-open:hidden">Manage</span>
          <span className="hidden shrink-0 rounded-full bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 group-open:inline">Hide</span>
        </div>
      </summary>

      <div className="space-y-5 border-t border-emerald-100 p-5 sm:p-6">
        <div>
          <label htmlFor="seller-campaign" className="text-sm font-semibold text-gray-800">Campaign</label>
          <select
            id="seller-campaign"
            value={selectedCampaignId}
            onChange={(event) => setSelectedCampaignId(event.target.value)}
            className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-3 text-sm text-gray-900"
          >
            {campaigns.map((campaign) => (
              <option key={campaign.id} value={campaign.id}>{campaign.name} · {campaign.status}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <button type="button" onClick={downloadTemplate} className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-3 text-sm font-semibold text-blue-700">CSV template</button>
          <label className="cursor-pointer rounded-xl border border-blue-200 bg-blue-50 px-3 py-3 text-center text-sm font-semibold text-blue-700">
            Upload CSV
            <input type="file" accept=".csv,text/csv" onChange={handleCsvUpload} className="sr-only" />
          </label>
          <button type="button" onClick={downloadRoster} disabled={rows.length === 0} className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm font-semibold text-emerald-700 disabled:cursor-not-allowed disabled:opacity-50">Download roster</button>
          <button type="button" className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm font-semibold text-amber-800">General invite link</button>
        </div>

        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
          <label htmlFor="seller-names" className="text-sm font-bold text-gray-900">Add sellers, students, or participants</label>
          <p className="mt-1 text-sm text-gray-600">Enter one name per line, paste a comma-separated list, or upload a CSV.</p>
          <textarea
            id="seller-names"
            value={names}
            onChange={(event) => setNames(event.target.value)}
            rows={5}
            placeholder={'Theo Perez\nEli Perez\nBenji Perez'}
            className="mt-3 w-full rounded-xl border border-blue-200 bg-white px-3 py-3 text-sm text-gray-900"
          />
          <button type="button" onClick={addNames} className="mt-3 w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-700 sm:w-auto">Add to roster</button>
        </div>

        {message ? <p className="rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-700">{message}</p> : null}

        {rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-5 py-8 text-center">
            <p className="font-semibold text-gray-900">No sellers added yet</p>
            <p className="mt-2 text-sm text-gray-600">Add a roster to generate one tracked campaign link per person. Accounts are optional.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {rows.map((row) => (
              <article key={row.id} className="rounded-2xl border border-gray-200 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-gray-900">{row.name}</p>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold">
                      <span className={row.status === 'active' ? 'rounded-full bg-green-100 px-2 py-1 text-green-800' : 'rounded-full bg-gray-200 px-2 py-1 text-gray-700'}>{row.status}</span>
                      <span className="rounded-full bg-blue-100 px-2 py-1 text-blue-800">{row.claimed ? 'Account claimed' : 'Managed — no account required'}</span>
                    </div>
                  </div>
                  <button type="button" onClick={() => renameSeller(row.id)} className="text-sm font-semibold text-blue-700">Edit</button>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-xl bg-gray-50 p-3"><p className="text-xs uppercase tracking-wide text-gray-500">Passes sold</p><p className="mt-1 font-bold text-gray-900">{row.passesSold}</p></div>
                  <div className="rounded-xl bg-gray-50 p-3"><p className="text-xs uppercase tracking-wide text-gray-500">Gross sales</p><p className="mt-1 font-bold text-gray-900">${row.grossSales.toFixed(2)}</p></div>
                </div>

                <p className="mt-4 truncate rounded-xl bg-slate-50 px-3 py-3 font-mono text-xs text-slate-600">{row.referralCode}</p>

                <div className="mt-3 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                  <button type="button" onClick={() => copyLink(row)} className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700">Copy link</button>
                  <button type="button" className="rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm font-semibold text-blue-700">QR code</button>
                  <button type="button" onClick={() => toggleStatus(row.id)} className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">{row.status === 'active' ? 'Deactivate' : 'Reactivate'}</button>
                  <button type="button" onClick={() => setRows((current) => current.filter((item) => item.id !== row.id))} className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">Remove</button>
                </div>
              </article>
            ))}
          </div>
        )}

        <p className="text-xs text-gray-500">Preview behavior is stored only in this browser session until the server actions are connected.</p>
      </div>
    </details>
  )
}

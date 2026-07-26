'use client'

import { ChangeEvent, useEffect, useMemo, useState, useTransition } from 'react'
import {
  CampaignSellerRosterRow,
  createCampaignSellersAction,
  listCampaignSellerRosterAction,
  updateCampaignSellerAction,
} from './organization-seller-roster-actions'

type CampaignOption = { id: string; name: string; status: string }
type Props = { campaigns: CampaignOption[] }

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function escapeCsv(value: string | number | boolean) {
  return `"${String(value).replaceAll('"', '""')}"`
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
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

function downloadDataUrl(filename: string, url: string) {
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
}

function formatDate(value: string | null) {
  if (!value) return 'No sales yet'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'No sales yet' : date.toLocaleDateString()
}

export default function OrganizationSellerRosterPreview({ campaigns }: Props) {
  const [selectedCampaignId, setSelectedCampaignId] = useState(campaigns[0]?.id ?? '')
  const [names, setNames] = useState('')
  const [rows, setRows] = useState<CampaignSellerRosterRow[]>([])
  const [message, setMessage] = useState<string | null>(null)
  const [creatingQrSheet, setCreatingQrSheet] = useState(false)
  const [showGeneralLinkActions, setShowGeneralLinkActions] = useState(false)
  const [isPending, startTransition] = useTransition()

  const selectedCampaign = campaigns.find((campaign) => campaign.id === selectedCampaignId) ?? campaigns[0]
  const activeRows = useMemo(() => rows.filter((row) => row.status === 'active'), [rows])

  useEffect(() => {
    if (!selectedCampaignId) return
    setShowGeneralLinkActions(false)
    startTransition(async () => {
      const result = await listCampaignSellerRosterAction(selectedCampaignId)
      if (result.success) {
        setRows(result.data)
        setMessage(null)
      } else {
        setRows([])
        setMessage(result.error)
      }
    })
  }, [selectedCampaignId])

  function campaignLink() {
    return `${window.location.origin}/campaigns/${selectedCampaignId}`
  }

  function sellerLink(row: CampaignSellerRosterRow) {
    return `${campaignLink()}?seller=${encodeURIComponent(row.referralCode)}`
  }

  function parseNames() {
    return names.split(/\r?\n|,/).map((name) => name.trim()).filter(Boolean)
  }

  function addNames() {
    const parsed = parseNames()
    if (parsed.length === 0) return setMessage('Add at least one seller, student, or participant name.')

    startTransition(async () => {
      const result = await createCampaignSellersAction(selectedCampaignId, parsed)
      if (!result.success) return setMessage(result.error)
      setRows(result.data)
      setNames('')
      setMessage(`${parsed.length} roster ${parsed.length === 1 ? 'entry was' : 'entries were'} processed. Existing duplicate names were left unchanged.`)
    })
  }

  function handleCsvUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const text = String(reader.result ?? '')
      const lines = text.split(/\r?\n/).filter(Boolean)
      const dataLines = (lines[0]?.toLowerCase() ?? '').includes('name') ? lines.slice(1) : lines
      const importedNames = dataLines
        .map((line) => line.split(',')[0]?.replace(/^"|"$/g, '').trim())
        .filter(Boolean)
      setNames(importedNames.join('\n'))
      setMessage(`${importedNames.length} names loaded for review. Select “Add to roster” to save them.`)
    }
    reader.readAsText(file)
    event.target.value = ''
  }

  function downloadTemplate() {
    downloadFile('raisehub-seller-roster-template.csv', 'name\n"Example Seller"\n"Example Student"\n')
  }

  function downloadRoster() {
    const header = ['seller_name', 'status', 'account_status', 'referral_code', 'personal_campaign_link', 'passes_sold', 'gross_sales', 'organization_earnings', 'last_sale_date']
    const data = rows.map((row) => [row.name, row.status, row.claimed ? 'claimed' : 'managed', row.referralCode, sellerLink(row), row.passesSold, row.grossSales.toFixed(2), row.organizationEarnings.toFixed(2), row.lastSaleAt ?? ''])
    const csv = [header, ...data].map((line) => line.map(escapeCsv).join(',')).join('\n')
    downloadFile(`${slugify(selectedCampaign?.name ?? 'campaign')}-seller-roster.csv`, csv)
  }

  async function downloadSellerQr(row: CampaignSellerRosterRow) {
    const QRCode = await import('qrcode')
    const dataUrl = await QRCode.toDataURL(sellerLink(row), { width: 900, margin: 3, errorCorrectionLevel: 'M' })
    downloadDataUrl(`${slugify(selectedCampaign?.name ?? 'campaign')}-${slugify(row.name)}-qr.png`, dataUrl)
    setMessage(`Downloaded ${row.name}’s QR code.`)
  }

  async function printQrSheet() {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return setMessage('Allow pop-ups for RaiseHub to generate the printable QR sheet.')

    printWindow.document.write('<!doctype html><html><body style="font-family:Arial,sans-serif;padding:32px;text-align:center"><p>Building your printable QR sheet…</p></body></html>')
    printWindow.document.close()
    setCreatingQrSheet(true)

    try {
      const QRCode = await import('qrcode')
      const campaignName = selectedCampaign?.name ?? 'Campaign'
      const generalQr = await QRCode.toDataURL(campaignLink(), { width: 560, margin: 2, errorCorrectionLevel: 'M' })
      const sellerCards = await Promise.all(activeRows.map(async (row) => ({ row, qr: await QRCode.toDataURL(sellerLink(row), { width: 560, margin: 2, errorCorrectionLevel: 'M' }) })))
      const cards = [
        `<article class="card general"><img src="${generalQr}" alt="General campaign QR code"/><h2>General campaign</h2><p>No specific seller</p><code>${escapeHtml(campaignLink())}</code></article>`,
        ...sellerCards.map(({ row, qr }) => `<article class="card"><img src="${qr}" alt="QR code for ${escapeHtml(row.name)}"/><h2>${escapeHtml(row.name)}</h2><p>Seller code: ${escapeHtml(row.referralCode)}</p><code>${escapeHtml(sellerLink(row))}</code></article>`),
      ].join('')

      printWindow.document.open()
      printWindow.document.write(`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(campaignName)} QR sheet</title><style>
        @page{size:letter;margin:.35in}*{box-sizing:border-box}body{margin:0;padding:12px;font-family:Arial,sans-serif;color:#111827}header{text-align:center;margin-bottom:18px}.actions{display:flex;justify-content:center;margin-bottom:18px}.actions button{border:0;border-radius:10px;padding:12px 18px;background:#2563eb;color:#fff;font-size:16px;font-weight:700}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.card{break-inside:avoid;border:1px dashed #94a3b8;border-radius:12px;padding:12px;text-align:center;min-height:265px}.general{border:2px solid #2563eb;background:#eff6ff}.card img{width:150px;height:150px;display:block;margin:0 auto 8px}.card h2{margin:0;font-size:16px}.card p{margin:5px 0;font-size:11px;color:#475569}.card code{display:block;margin-top:8px;font-size:8px;overflow-wrap:anywhere;color:#334155}footer{margin-top:15px;text-align:center;font-size:10px;color:#64748b}@media(max-width:700px){.grid{grid-template-columns:1fr 1fr}.card{min-height:240px}.card img{width:130px;height:130px}}@media print{body{padding:0}.actions{display:none}.grid{grid-template-columns:repeat(3,1fr)}}
      </style></head><body><header><h1>${escapeHtml(campaignName)}</h1><p>Campaign and seller QR codes</p></header><div class="actions"><button onclick="window.print()">Print or save PDF</button></div><main class="grid">${cards}</main><footer>Inactive or removed seller codes still open this campaign without seller attribution.</footer></body></html>`)
      printWindow.document.close()
      printWindow.focus()
      setMessage(`Printable QR sheet created with ${activeRows.length} active seller ${activeRows.length === 1 ? 'code' : 'codes'} plus the general campaign code.`)
    } catch {
      printWindow.close()
      setMessage('The QR sheet could not be generated. Please try again.')
    } finally {
      setCreatingQrSheet(false)
    }
  }

  async function copyGeneralCampaignLink() {
    await navigator.clipboard.writeText(campaignLink())
    setShowGeneralLinkActions(false)
    setMessage('General campaign link copied. Purchases from this link are not assigned to a specific seller.')
  }

  async function shareGeneralCampaignLink() {
    const url = campaignLink()
    if (navigator.share) {
      try {
        await navigator.share({ title: selectedCampaign?.name ?? 'RaiseHub campaign', text: `Support ${selectedCampaign?.name ?? 'this campaign'} on RaiseHub.`, url })
        setShowGeneralLinkActions(false)
        setMessage('General campaign link shared.')
        return
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return
      }
    }
    await navigator.clipboard.writeText(url)
    setShowGeneralLinkActions(false)
    setMessage('Sharing is not available in this browser, so the general campaign link was copied instead.')
  }

  function copyLink(row: CampaignSellerRosterRow) {
    navigator.clipboard.writeText(sellerLink(row))
    setMessage(`Copied ${row.name}’s campaign link.`)
  }

  function changeStatus(row: CampaignSellerRosterRow, status: CampaignSellerRosterRow['status']) {
    startTransition(async () => {
      const result = await updateCampaignSellerAction({ campaignId: selectedCampaignId, campaignSellerId: row.id, status })
      if (!result.success) return setMessage(result.error)
      setRows(result.data)
      setMessage(`${row.name} is now ${status}.`)
    })
  }

  function renameSeller(row: CampaignSellerRosterRow) {
    const next = window.prompt('Update seller display name', row.name)?.trim()
    if (!next || next === row.name) return
    startTransition(async () => {
      const result = await updateCampaignSellerAction({ campaignId: selectedCampaignId, campaignSellerId: row.id, displayName: next })
      if (!result.success) return setMessage(result.error)
      setRows(result.data)
      setMessage('Seller name updated.')
    })
  }

  if (campaigns.length === 0) return null

  return (
    <details className="group rounded-2xl border border-emerald-100 bg-white/90 shadow-xl backdrop-blur">
      <summary className="cursor-pointer list-none px-5 py-4 sm:px-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-lg font-bold text-gray-900">Seller roster & links</p>
            <p className="mt-1 text-sm text-gray-600">{rows.length} rostered · {activeRows.length} active · saved to this campaign</p>
          </div>
          <span className="shrink-0 rounded-full bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 group-open:hidden">Manage</span>
          <span className="hidden shrink-0 rounded-full bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 group-open:inline">Hide</span>
        </div>
      </summary>

      <div className="space-y-5 border-t border-emerald-100 p-5 sm:p-6">
        <div>
          <label htmlFor="seller-campaign" className="text-sm font-semibold text-gray-800">Campaign</label>
          <select id="seller-campaign" value={selectedCampaignId} onChange={(event) => setSelectedCampaignId(event.target.value)} className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-3 text-sm text-gray-900">
            {campaigns.map((campaign) => <option key={campaign.id} value={campaign.id}>{campaign.name} · {campaign.status}</option>)}
          </select>
          <p className="mt-2 text-xs text-gray-500">Only campaigns belonging to this organization workspace are available here.</p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <button type="button" onClick={downloadTemplate} className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-3 text-sm font-semibold text-blue-700">CSV template</button>
          <label className="cursor-pointer rounded-xl border border-blue-200 bg-blue-50 px-3 py-3 text-center text-sm font-semibold text-blue-700">Upload CSV<input type="file" accept=".csv,text/csv" onChange={handleCsvUpload} className="sr-only" /></label>
          <button type="button" onClick={downloadRoster} disabled={rows.length === 0} className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm font-semibold text-emerald-700 disabled:opacity-50">Download roster</button>
          <button type="button" onClick={printQrSheet} disabled={creatingQrSheet || rows.length === 0} className="rounded-xl border border-violet-200 bg-violet-50 px-3 py-3 text-sm font-semibold text-violet-700 disabled:opacity-50">{creatingQrSheet ? 'Building QR sheet…' : 'Print QR sheet'}</button>
          <button type="button" onClick={() => setShowGeneralLinkActions((current) => !current)} aria-expanded={showGeneralLinkActions} className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm font-semibold text-amber-800">Share campaign</button>
        </div>

        {showGeneralLinkActions ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p className="font-bold text-gray-900">General campaign link</p>
            <p className="mt-1 text-sm text-gray-600">This link supports the organization and campaign without assigning credit to a specific seller.</p>
            <p className="mt-3 break-all rounded-xl bg-white px-3 py-3 font-mono text-xs text-gray-600">{campaignLink()}</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button type="button" onClick={copyGeneralCampaignLink} className="rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm font-semibold text-blue-700">Copy link</button>
              <button type="button" onClick={shareGeneralCampaignLink} className="rounded-lg bg-amber-600 px-3 py-2 text-sm font-semibold text-white">Share</button>
            </div>
          </div>
        ) : null}

        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
          <label htmlFor="seller-names" className="text-sm font-bold text-gray-900">Add sellers, students, or participants</label>
          <p className="mt-1 text-sm text-gray-600">Enter one name per line, paste a comma-separated list, or upload a CSV.</p>
          <textarea id="seller-names" value={names} onChange={(event) => setNames(event.target.value)} rows={6} placeholder={'Sara\nTheo\nElijah\nBenji\nNiko\nZJ'} className="mt-3 w-full rounded-xl border border-blue-200 bg-white px-3 py-3 text-sm text-gray-900" />
          <button type="button" onClick={addNames} disabled={isPending} className="mt-3 w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-60 sm:w-auto">{isPending ? 'Saving…' : 'Add to roster'}</button>
        </div>

        {message ? <p className="rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-700">{message}</p> : null}

        {isPending && rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-5 py-8 text-center"><p className="font-semibold text-gray-900">Loading roster…</p></div>
        ) : rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-5 py-8 text-center"><p className="font-semibold text-gray-900">No sellers added yet</p><p className="mt-2 text-sm text-gray-600">Add a roster to generate one tracked campaign link per person. Accounts are optional.</p></div>
        ) : (
          <div className="space-y-3">
            {rows.map((row) => (
              <article key={row.id} className="rounded-2xl border border-gray-200 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div><p className="font-bold text-gray-900">{row.name}</p><div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold"><span className={row.status === 'active' ? 'rounded-full bg-green-100 px-2 py-1 text-green-800' : 'rounded-full bg-gray-200 px-2 py-1 text-gray-700'}>{row.status}</span><span className="rounded-full bg-blue-100 px-2 py-1 text-blue-800">{row.claimed ? 'Account claimed' : 'Managed — no account required'}</span></div></div>
                  <button type="button" disabled={isPending} onClick={() => renameSeller(row)} className="text-sm font-semibold text-blue-700 disabled:opacity-50">Edit</button>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                  <div className="rounded-xl bg-gray-50 p-3"><p className="text-xs uppercase tracking-wide text-gray-500">Passes sold</p><p className="mt-1 font-bold text-gray-900">{row.passesSold}</p></div>
                  <div className="rounded-xl bg-gray-50 p-3"><p className="text-xs uppercase tracking-wide text-gray-500">Gross sales</p><p className="mt-1 font-bold text-gray-900">${row.grossSales.toFixed(2)}</p></div>
                  <div className="rounded-xl bg-gray-50 p-3"><p className="text-xs uppercase tracking-wide text-gray-500">Org earnings</p><p className="mt-1 font-bold text-gray-900">${row.organizationEarnings.toFixed(2)}</p></div>
                  <div className="rounded-xl bg-gray-50 p-3"><p className="text-xs uppercase tracking-wide text-gray-500">Last sale</p><p className="mt-1 font-bold text-gray-900">{formatDate(row.lastSaleAt)}</p></div>
                </div>
                <p className="mt-4 truncate rounded-xl bg-slate-50 px-3 py-3 font-mono text-xs text-slate-600">{row.referralCode}</p>
                {row.status !== 'active' ? <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">Existing printed links still open the campaign, but new purchases will not credit this seller.</p> : null}
                <div className="mt-3 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                  <button type="button" onClick={() => copyLink(row)} className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700">Copy link</button>
                  <button type="button" onClick={() => downloadSellerQr(row)} className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-sm font-semibold text-violet-700">Download QR</button>
                  <button type="button" disabled={isPending} onClick={() => changeStatus(row, row.status === 'active' ? 'inactive' : 'active')} className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800 disabled:opacity-50">{row.status === 'active' ? 'Deactivate' : 'Reactivate'}</button>
                  <button type="button" disabled={isPending} onClick={() => changeStatus(row, 'removed')} className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 disabled:opacity-50">Remove</button>
                </div>
              </article>
            ))}
          </div>
        )}

        <p className="text-xs text-gray-500">Roster changes are saved to the selected campaign. Removed sellers retain historical sales and old links fall back to general campaign access.</p>
      </div>
    </details>
  )
}

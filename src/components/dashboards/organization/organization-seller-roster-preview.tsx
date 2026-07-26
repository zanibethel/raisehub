'use client'

import { ChangeEvent, useEffect, useMemo, useState, useTransition } from 'react'
import { createPortal } from 'react-dom'
import {
  CampaignSellerRosterRow,
  createCampaignSellersAction,
  listCampaignSellerRosterAction,
  updateCampaignSellerAction,
} from './organization-seller-roster-actions'

type CampaignOption = { id: string; name: string; status: string }
type Props = { campaigns: CampaignOption[] }
type QrSheetData = {
  campaignName: string
  campaignUrl: string
  generalQr: string
  sellers: Array<{ row: CampaignSellerRosterRow; qr: string; url: string }>
}

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function escapeCsv(value: string | number | boolean) {
  return `"${String(value).replaceAll('"', '""')}"`
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
  const [qrSheet, setQrSheet] = useState<QrSheetData | null>(null)
  const [showGeneralLinkActions, setShowGeneralLinkActions] = useState(false)
  const [isPending, startTransition] = useTransition()

  const selectedCampaign = campaigns.find((campaign) => campaign.id === selectedCampaignId) ?? campaigns[0]
  const activeRows = useMemo(() => rows.filter((row) => row.status === 'active'), [rows])

  useEffect(() => {
    if (!selectedCampaignId) return
    setShowGeneralLinkActions(false)
    setQrSheet(null)
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

  function sellerSignupLink() {
    return `${window.location.origin}/signup/seller?campaignId=${encodeURIComponent(selectedCampaignId)}`
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

  async function buildQrSheet() {
    setCreatingQrSheet(true)
    setMessage(null)

    try {
      const QRCode = await import('qrcode')
      const campaignName = selectedCampaign?.name ?? 'Campaign'
      const campaignUrl = campaignLink()
      const generalQr = await QRCode.toDataURL(campaignUrl, { width: 560, margin: 2, errorCorrectionLevel: 'M' })
      const sellers = await Promise.all(
        activeRows.map(async (row) => {
          const url = sellerLink(row)
          return {
            row,
            url,
            qr: await QRCode.toDataURL(url, { width: 560, margin: 2, errorCorrectionLevel: 'M' }),
          }
        })
      )

      setQrSheet({ campaignName, campaignUrl, generalQr, sellers })
      setMessage(`Printable QR sheet created with ${activeRows.length} active seller ${activeRows.length === 1 ? 'code' : 'codes'} plus the general campaign code.`)
    } catch {
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

  async function copySellerSignupLink() {
    await navigator.clipboard.writeText(sellerSignupLink())
    setMessage('Seller signup link copied. New sellers will be guided into this campaign and organization.')
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
    <>
      <style>{`@page { size: Letter portrait; margin: 0.35in; } @media print { html, body { margin: 0 !important; padding: 0 !important; background: white !important; } body > *:not(#raisehub-qr-print-root) { display: none !important; } #raisehub-qr-print-root { display: block !important; position: static !important; width: 100% !important; } #raisehub-qr-print-sheet { width: 100% !important; max-width: none !important; margin: 0 !important; padding: 0 !important; border-radius: 0 !important; box-shadow: none !important; background: white !important; } #raisehub-qr-print-grid { display: grid !important; grid-template-columns: repeat(3, minmax(0, 1fr)) !important; gap: 0.12in !important; } .raisehub-qr-card { break-inside: avoid !important; page-break-inside: avoid !important; min-width: 0 !important; padding: 0.1in !important; } .raisehub-qr-card img { width: 1.45in !important; height: 1.45in !important; max-width: 100% !important; } .raisehub-qr-card .raisehub-qr-url { font-size: 6px !important; line-height: 1.15 !important; overflow-wrap: anywhere !important; } .raisehub-print-actions { display: none !important; } }`}</style>

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

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <button type="button" onClick={downloadTemplate} className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-3 text-sm font-semibold text-blue-700">CSV template</button>
            <label className="cursor-pointer rounded-xl border border-blue-200 bg-blue-50 px-3 py-3 text-center text-sm font-semibold text-blue-700">Upload CSV<input type="file" accept=".csv,text/csv" onChange={handleCsvUpload} className="sr-only" /></label>
            <button type="button" onClick={downloadRoster} disabled={rows.length === 0} className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm font-semibold text-emerald-700 disabled:opacity-50">Download roster</button>
            <button type="button" onClick={buildQrSheet} disabled={creatingQrSheet || rows.length === 0} className="rounded-xl border border-violet-200 bg-violet-50 px-3 py-3 text-sm font-semibold text-violet-700 disabled:opacity-50">{creatingQrSheet ? 'Building QR sheet…' : 'Print QR sheet'}</button>
            <button type="button" onClick={copySellerSignupLink} className="rounded-xl border border-green-200 bg-green-50 px-3 py-3 text-sm font-semibold text-green-700">Copy seller signup</button>
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
            <textarea id="seller-names" value={names} onChange={(event) => setNames(event.target.value)} rows={6} placeholder={'Theo\nElijah\nSara\nBenji\nNiko\nZJ'} className="mt-3 w-full rounded-xl border border-blue-200 bg-white px-3 py-3 text-sm text-gray-900" />
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

      {qrSheet && typeof document !== 'undefined' ? createPortal(
        <div id="raisehub-qr-print-root" className="fixed inset-0 z-[100] overflow-y-auto bg-slate-950/70 p-3 sm:p-6">
          <section id="raisehub-qr-print-sheet" className="mx-auto max-w-5xl rounded-2xl bg-white p-4 text-gray-900 shadow-2xl sm:p-7">
            <div className="raisehub-print-actions mb-5 flex flex-col gap-3 sm:flex-row sm:justify-between">
              <button type="button" onClick={() => setQrSheet(null)} className="rounded-xl border border-gray-300 px-4 py-3 font-semibold text-gray-700">Close preview</button>
              <button type="button" onClick={() => window.print()} className="rounded-xl bg-blue-600 px-5 py-3 font-bold text-white">Print or save PDF</button>
            </div>

            <header className="mb-5 text-center">
              <h1 className="text-2xl font-bold">{qrSheet.campaignName}</h1>
              <p className="mt-1 text-sm text-gray-600">Campaign and seller QR codes</p>
            </header>

            <main id="raisehub-qr-print-grid" className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <article className="raisehub-qr-card break-inside-avoid rounded-xl border-2 border-blue-600 bg-blue-50 p-3 text-center">
                <img src={qrSheet.generalQr} alt="General campaign QR code" className="mx-auto h-36 w-36" />
                <h2 className="mt-2 font-bold">General campaign</h2>
                <p className="text-xs text-gray-600">No specific seller</p>
                <p className="raisehub-qr-url mt-2 break-all font-mono text-[8px] text-gray-500">{qrSheet.campaignUrl}</p>
              </article>
              {qrSheet.sellers.map(({ row, qr, url }) => (
                <article key={row.id} className="raisehub-qr-card break-inside-avoid rounded-xl border border-dashed border-slate-400 p-3 text-center">
                  <img src={qr} alt={`QR code for ${row.name}`} className="mx-auto h-36 w-36" />
                  <h2 className="mt-2 font-bold">{row.name}</h2>
                  <p className="text-xs text-gray-600">Seller code: {row.referralCode}</p>
                  <p className="raisehub-qr-url mt-2 break-all font-mono text-[8px] text-gray-500">{url}</p>
                </article>
              ))}
            </main>

            <footer className="mt-5 text-center text-xs text-gray-500">Inactive or removed seller codes still open this campaign without seller attribution.</footer>
          </section>
        </div>,
        document.body
      ) : null}
    </>
  )
}

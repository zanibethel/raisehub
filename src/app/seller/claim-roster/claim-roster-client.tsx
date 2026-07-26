'use client'

import { useMemo, useState, useTransition } from 'react'
import {
  ClaimableRosterEntry,
  claimRosterEntryAction,
} from './actions'

type Props = {
  entries: ClaimableRosterEntry[]
}

export default function ClaimRosterClient({ entries }: Props) {
  const [organizationId, setOrganizationId] = useState(entries[0]?.organization_id ?? '')
  const [campaignId, setCampaignId] = useState(entries[0]?.campaign_id ?? '')
  const [campaignSellerId, setCampaignSellerId] = useState(entries[0]?.campaign_seller_id ?? '')
  const [message, setMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const organizations = useMemo(() => {
    const map = new Map<string, string>()
    entries.forEach((entry) => map.set(entry.organization_id, entry.organization_name))
    return Array.from(map, ([id, name]) => ({ id, name }))
  }, [entries])

  const campaigns = useMemo(() => {
    const map = new Map<string, string>()
    entries
      .filter((entry) => entry.organization_id === organizationId)
      .forEach((entry) => map.set(entry.campaign_id, entry.campaign_name))
    return Array.from(map, ([id, name]) => ({ id, name }))
  }, [entries, organizationId])

  const sellers = entries.filter(
    (entry) => entry.organization_id === organizationId && entry.campaign_id === campaignId
  )

  const selected = entries.find((entry) => entry.campaign_seller_id === campaignSellerId)

  function chooseOrganization(nextOrganizationId: string) {
    const nextEntry = entries.find((entry) => entry.organization_id === nextOrganizationId)
    setOrganizationId(nextOrganizationId)
    setCampaignId(nextEntry?.campaign_id ?? '')
    setCampaignSellerId(nextEntry?.campaign_seller_id ?? '')
    setMessage(null)
  }

  function chooseCampaign(nextCampaignId: string) {
    const nextEntry = entries.find(
      (entry) => entry.organization_id === organizationId && entry.campaign_id === nextCampaignId
    )
    setCampaignId(nextCampaignId)
    setCampaignSellerId(nextEntry?.campaign_seller_id ?? '')
    setMessage(null)
  }

  function claim() {
    if (!campaignSellerId) return
    startTransition(async () => {
      const result = await claimRosterEntryAction(campaignSellerId)
      if (!result.success) {
        setMessage(result.error)
        return
      }
      setMessage(`You are now linked to ${selected?.display_name ?? 'this roster entry'}. Your existing QR code and sales history were preserved.`)
      window.location.reload()
    })
  }

  return (
    <div className="space-y-5">
      <div>
        <label className="text-sm font-semibold text-gray-800">Organization</label>
        <select
          value={organizationId}
          onChange={(event) => chooseOrganization(event.target.value)}
          className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-3 text-sm text-gray-900"
        >
          {organizations.map((organization) => (
            <option key={organization.id} value={organization.id}>{organization.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-sm font-semibold text-gray-800">Campaign</label>
        <select
          value={campaignId}
          onChange={(event) => chooseCampaign(event.target.value)}
          className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-3 text-sm text-gray-900"
        >
          {campaigns.map((campaign) => (
            <option key={campaign.id} value={campaign.id}>{campaign.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-sm font-semibold text-gray-800">Select your name</label>
        <select
          value={campaignSellerId}
          onChange={(event) => {
            setCampaignSellerId(event.target.value)
            setMessage(null)
          }}
          className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-3 text-sm text-gray-900"
        >
          {sellers.map((seller) => (
            <option key={seller.campaign_seller_id} value={seller.campaign_seller_id}>
              {seller.display_name}
            </option>
          ))}
        </select>
        <p className="mt-2 text-xs text-gray-500">
          Only active, unclaimed names from organizations you have joined are shown.
        </p>
      </div>

      {selected ? (
        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
          <p className="text-sm font-semibold text-blue-900">Confirm your roster entry</p>
          <p className="mt-1 text-lg font-bold text-gray-900">{selected.display_name}</p>
          <p className="mt-1 text-sm text-gray-600">{selected.organization_name} · {selected.campaign_name}</p>
          <p className="mt-3 font-mono text-xs text-gray-500">Seller code: {selected.referral_code}</p>
        </div>
      ) : null}

      <button
        type="button"
        onClick={claim}
        disabled={!campaignSellerId || isPending}
        className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-60"
      >
        {isPending ? 'Linking profile…' : 'Confirm and link my seller profile'}
      </button>

      {message ? (
        <p className="rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-700">{message}</p>
      ) : null}
    </div>
  )
}

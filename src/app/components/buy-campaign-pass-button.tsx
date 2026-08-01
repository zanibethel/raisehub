'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

import { createCampaignCheckoutAction } from '@/app/campaigns/stripe-checkout-actions'
import { createClient } from '@/lib/supabase/client'

type OrganizationOption = {
  id: string
  business_name: string | null
  display_name: string | null
}

type SellerOption = {
  id: string
  display_name: string
  referral_code: string
}

type BuyCampaignPassButtonProps = {
  campaignId: string
  passPrice: number
  organizations?: OrganizationOption[]
  defaultOrganizationId?: string | null
  sellerName?: string
  hasActivePass?: boolean
  initialDonationAmount?: string
  initialSelectedOrganizationId?: string | null
}

function buildCampaignHref(input: {
  campaignId: string
  sellerReferral: string
  notice: 'campaign-unavailable' | 'campaign-replaced'
  replacedCampaignId: string | null
  donationAmount: string
  selectedOrganizationId: string
}) {
  const searchParams = new URLSearchParams()
  if (input.sellerReferral) searchParams.set('seller', input.sellerReferral)
  searchParams.set('notice', input.notice)
  if (input.replacedCampaignId) searchParams.set('replaced', input.replacedCampaignId)
  if (input.donationAmount) searchParams.set('donation', input.donationAmount)
  if (input.selectedOrganizationId) searchParams.set('organization', input.selectedOrganizationId)
  return `/campaigns/${input.campaignId}?${searchParams.toString()}`
}

function organizationName(organization: OrganizationOption | null | undefined) {
  return organization?.display_name || organization?.business_name || 'Organization'
}

export default function BuyCampaignPassButton({
  campaignId,
  passPrice,
  organizations = [],
  defaultOrganizationId = null,
  sellerName = '',
  hasActivePass = false,
  initialDonationAmount,
}: BuyCampaignPassButtonProps) {
  const router = useRouter()
  const currentSearchParams = useSearchParams()
  const supabase = createClient()
  const referralFromUrl = currentSearchParams.get('seller')?.trim() || ''
  const isManagedReferral = /^[a-f0-9]{14}$/i.test(referralFromUrl)
  const hasLockedSeller = Boolean(isManagedReferral && sellerName)

  const [sellerOptions, setSellerOptions] = useState<SellerOption[]>([])
  const [sellerOptionsLoading, setSellerOptionsLoading] = useState(!hasLockedSeller)
  const [sellerOptionsError, setSellerOptionsError] = useState('')
  const [selectedSellerCode, setSelectedSellerCode] = useState(
    hasLockedSeller ? referralFromUrl : ''
  )
  const selectedOrganizationId = defaultOrganizationId ?? organizations[0]?.id ?? ''
  const [donationAmount, setDonationAmount] = useState(
    initialDonationAmount ?? (hasActivePass ? '10' : '0')
  )
  const [message, setMessage] = useState('')
  const [demoComplete, setDemoComplete] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (hasLockedSeller) {
      setSellerOptionsLoading(false)
      return
    }

    const controller = new AbortController()

    async function loadSellers() {
      setSelectedSellerCode('')
      setSellerOptions([])
      setSellerOptionsLoading(true)
      setSellerOptionsError('')

      try {
        const searchParams = new URLSearchParams()
        if (selectedOrganizationId) searchParams.set('organization', selectedOrganizationId)
        const query = searchParams.toString()
        const response = await fetch(
          `/api/campaigns/${encodeURIComponent(campaignId)}/sellers${query ? `?${query}` : ''}`,
          {
            cache: 'no-store',
            signal: controller.signal,
          }
        )
        const payload = (await response.json()) as {
          sellers?: SellerOption[]
          error?: string
        }

        if (!response.ok) {
          throw new Error(payload.error || 'Seller options are temporarily unavailable.')
        }

        setSellerOptions(payload.sellers ?? [])
      } catch (error) {
        if (controller.signal.aborted) return
        setSellerOptions([])
        setSellerOptionsError(
          error instanceof Error ? error.message : 'Seller options are temporarily unavailable.'
        )
      } finally {
        if (!controller.signal.aborted) setSellerOptionsLoading(false)
      }
    }

    void loadSellers()
    return () => controller.abort()
  }, [campaignId, hasLockedSeller, selectedOrganizationId])

  const selectedSeller = useMemo(
    () => sellerOptions.find((seller) => seller.referral_code === selectedSellerCode) ?? null,
    [selectedSellerCode, sellerOptions]
  )
  const selectedOrganization = useMemo(
    () => organizations.find((organization) => organization.id === selectedOrganizationId) ?? null,
    [organizations, selectedOrganizationId]
  )

  const effectiveSellerName = hasLockedSeller
    ? sellerName
    : selectedSeller?.display_name ?? ''
  const effectiveSellerReferral = hasLockedSeller
    ? referralFromUrl
    : selectedSellerCode
  const donationNumber = Number(donationAmount) || 0
  const effectivePassPrice = hasActivePass ? 0 : passPrice
  const totalAmount = effectivePassPrice + donationNumber

  async function handleBuyPass() {
    if (loading) return

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      const signupParams = new URLSearchParams({ campaignId, source: 'campaign' })
      if (effectiveSellerReferral) signupParams.set('seller', effectiveSellerReferral)
      if (donationAmount) signupParams.set('donation', donationAmount)
      if (selectedOrganizationId) signupParams.set('organization', selectedOrganizationId)
      router.push(`/signup?${signupParams.toString()}`)
      return
    }

    if (totalAmount <= 0) {
      setDemoComplete(false)
      setMessage('Please choose a donation amount.')
      return
    }

    setLoading(true)
    setDemoComplete(false)
    setMessage('')

    const result = await createCampaignCheckoutAction({
      campaign_id: campaignId,
      selected_organization_id: selectedOrganizationId || undefined,
      donation_amount: donationNumber,
      seller_name: effectiveSellerName || undefined,
      seller_referral: effectiveSellerReferral || undefined,
    })

    if (result.status === 'checkout-ready') {
      window.location.assign(result.url)
      return
    }

    if (result.status === 'demo-complete') {
      setDemoComplete(true)
      setMessage(result.message)
      setLoading(false)
      router.refresh()
      return
    }

    if (result.status === 'replacement-found') {
      router.push(
        buildCampaignHref({
          campaignId: result.campaignId,
          sellerReferral: effectiveSellerReferral,
          notice: 'campaign-replaced',
          replacedCampaignId: result.replacedCampaignId,
          donationAmount,
          selectedOrganizationId,
        })
      )
      return
    }

    if (result.status === 'selection-required' || result.status === 'no-valid-campaign') {
      router.push(
        buildCampaignHref({
          campaignId,
          sellerReferral: effectiveSellerReferral,
          notice: 'campaign-unavailable',
          replacedCampaignId: result.replacedCampaignId,
          donationAmount,
          selectedOrganizationId,
        })
      )
      return
    }

    setDemoComplete(false)
    setMessage(result.message)
    setLoading(false)
  }

  return (
    <div className="space-y-4">
      {hasActivePass ? (
        <div className="rounded-xl border border-green-100 bg-green-50 p-4 text-sm text-green-800">
          <p>✅ Pass already active. You can make an additional donation below.</p>
          <Link
            href="/dashboard"
            className="mt-3 inline-flex rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
          >
            View My Pass
          </Link>
        </div>
      ) : null}

      {hasLockedSeller ? null : (
        <div>
          <label htmlFor="campaign-seller" className="mb-1 block text-sm font-medium text-gray-700">
            Credit this sale to a seller
          </label>
          <select
            id="campaign-seller"
            value={selectedSellerCode}
            onChange={(event) => setSelectedSellerCode(event.target.value)}
            disabled={sellerOptionsLoading || Boolean(sellerOptionsError) || sellerOptions.length === 0}
            className="w-full rounded-lg border border-gray-300 bg-white p-3 text-sm disabled:bg-gray-100 disabled:text-gray-500"
          >
            <option value="">
              {sellerOptionsLoading
                ? 'Loading sellers…'
                : sellerOptions.length === 0
                  ? 'Anyone / no active roster seller'
                  : 'Anyone / no specific seller'}
            </option>
            {sellerOptions.map((seller) => (
              <option key={seller.id} value={seller.referral_code}>
                {seller.display_name}
              </option>
            ))}
          </select>
          {sellerOptionsError ? (
            <p className="mt-2 text-xs text-amber-700">
              {sellerOptionsError} This purchase can still support the campaign generally.
            </p>
          ) : sellerOptionsLoading ? (
            <p className="mt-2 text-xs text-gray-500">Checking this organization’s active seller roster.</p>
          ) : sellerOptions.length > 0 ? (
            <p className="mt-2 text-xs text-gray-500">
              Choose a seller for credit, or leave this as general campaign support.
            </p>
          ) : (
            <p className="mt-2 text-xs text-gray-500">
              No active seller roster entries are available for this organization’s active campaign. The purchase will support the organization generally.
            </p>
          )}
        </div>
      )}

      {selectedOrganization ? (
        <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-blue-700">Supporting</p>
          <p className="mt-1 text-lg font-bold text-blue-950">{organizationName(selectedOrganization)}</p>
          <p className="mt-2 text-xs text-blue-800">
            This campaign supports its sponsoring organization. To support a different organization, choose one of that organization’s campaigns.
          </p>
        </div>
      ) : null}

      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">
          {hasActivePass ? 'Additional donation' : 'Optional donation add-on'}
        </label>
        <div className="flex flex-wrap gap-2">
          {(hasActivePass ? ['5', '10', '25'] : ['0', '10', '25']).map((amount) => (
            <button
              key={amount}
              type="button"
              onClick={() => setDonationAmount(amount)}
              className={`rounded-lg border px-4 py-2 text-sm font-medium transition ${
                donationAmount === amount
                  ? 'border-blue-600 bg-blue-600 text-white'
                  : 'border-gray-300 bg-white text-gray-700 hover:border-blue-400'
              }`}
            >
              {amount === '0' ? 'No donation' : `$${amount}`}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setDonationAmount('')}
            className={`rounded-lg border px-4 py-2 text-sm font-medium transition ${
              !['0', '5', '10', '25'].includes(donationAmount)
                ? 'border-blue-600 bg-blue-600 text-white'
                : 'border-gray-300 bg-white text-gray-700 hover:border-blue-400'
            }`}
          >
            Custom
          </button>
        </div>
        {!['0', '5', '10', '25'].includes(donationAmount) ? (
          <input
            type="number"
            min="0"
            step="1"
            value={donationAmount}
            onChange={(event) => setDonationAmount(event.target.value)}
            className="mt-3 w-full rounded-lg border border-gray-300 p-2 text-sm"
            placeholder="Enter custom amount"
          />
        ) : null}
        <p className="mt-2 text-xs text-gray-500">
          Donations go directly toward {organizationName(selectedOrganization)}.
        </p>
      </div>

      <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
        {!hasActivePass ? (
          <div className="flex items-center justify-between text-sm text-blue-800">
            <span>Pass price</span>
            <span>${passPrice.toFixed(2)}</span>
          </div>
        ) : null}
        {hasActivePass || donationNumber > 0 ? (
          <div className="mt-1 flex items-center justify-between text-sm text-blue-800">
            <span>{hasActivePass ? 'Donation' : 'Donation add-on'}</span>
            <span>${donationNumber.toFixed(2)}</span>
          </div>
        ) : null}
        <div className="mt-3 flex items-center justify-between border-t border-blue-200 pt-3 font-semibold text-blue-900">
          <span>Total today</span>
          <span>${totalAmount.toFixed(2)}</span>
        </div>
      </div>

      <button
        type="button"
        onClick={handleBuyPass}
        disabled={loading}
        className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {loading
          ? 'Processing...'
          : hasActivePass
            ? `Donate Securely - $${totalAmount.toFixed(2)}`
            : `Continue to Secure Checkout - $${totalAmount.toFixed(2)}`}
      </button>
      <p className="text-center text-xs text-gray-500">
        Production payments are completed securely through Stripe. Demo accounts create clearly marked simulated records without charging a card.
      </p>
      {message ? (
        <div
          className={`rounded-xl border p-4 text-sm ${
            demoComplete
              ? 'border-green-200 bg-green-50 text-green-800'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          <p>{message}</p>
          {demoComplete ? (
            <Link
              href="/dashboard"
              className="mt-3 inline-flex rounded-lg bg-green-700 px-4 py-2 text-sm font-bold text-white hover:bg-green-800"
            >
              View demo dashboard
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

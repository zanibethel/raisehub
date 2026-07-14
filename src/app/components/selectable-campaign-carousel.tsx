'use client'

import { useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import CampaignCard from './campaign-card'
import type { SellableCampaignOption } from '@/lib/types/campaigns'

type SelectableCampaignCarouselProps = {
  campaigns: SellableCampaignOption[]
  selectedCampaignId?: string | null
  seller?: string
  replacedCampaignId?: string | null
  notice?: 'campaign-unavailable' | 'campaign-replaced'
  donationAmount?: string
  selectedOrganizationId?: string
  actionLabel?: string
  title?: string
  description?: string
  onSelectCampaign?: (campaignId: string) => void
}

function buildCampaignHref(
  campaignId: string,
  props: Pick<
    SelectableCampaignCarouselProps,
    | 'seller'
    | 'replacedCampaignId'
    | 'notice'
    | 'donationAmount'
    | 'selectedOrganizationId'
  >
) {
  const searchParams = new URLSearchParams()

  if (props.seller) {
    searchParams.set('seller', props.seller)
  }

  if (props.notice) {
    searchParams.set('notice', props.notice)
  }

  if (props.replacedCampaignId) {
    searchParams.set('replaced', props.replacedCampaignId)
  }

  if (props.donationAmount) {
    searchParams.set('donation', props.donationAmount)
  }

  if (props.selectedOrganizationId) {
    searchParams.set('organization', props.selectedOrganizationId)
  }

  const query = searchParams.toString()

  return query ? `/campaigns/${campaignId}?${query}` : `/campaigns/${campaignId}`
}

export default function SelectableCampaignCarousel({
  campaigns,
  selectedCampaignId = null,
  seller,
  replacedCampaignId = null,
  notice,
  donationAmount,
  selectedOrganizationId,
  actionLabel = 'Select Campaign',
  title = 'Choose an active campaign to continue',
  description = 'Only campaigns that are currently accepting new sales are shown here.',
  onSelectCampaign,
}: SelectableCampaignCarouselProps) {
  const router = useRouter()
  const scrollRef = useRef<HTMLDivElement | null>(null)

  const orderedCampaigns = useMemo(() => campaigns, [campaigns])

  function scrollBy(direction: 'prev' | 'next') {
    if (!scrollRef.current) {
      return
    }

    scrollRef.current.scrollBy({
      left: direction === 'next' ? 384 : -384,
      behavior: 'smooth',
    })
  }

  function handleSelectCampaign(campaignId: string) {
    if (onSelectCampaign) {
      onSelectCampaign(campaignId)
      return
    }

    router.push(
      buildCampaignHref(campaignId, {
        seller,
        replacedCampaignId,
        notice,
        donationAmount,
        selectedOrganizationId,
      })
    )
  }

  return (
    <section className="rounded-3xl border border-blue-100 bg-white/90 p-6 shadow-xl backdrop-blur">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-green-700">
            Campaign selection
          </p>
          <h2 className="mt-3 text-3xl font-bold text-blue-700">{title}</h2>
          <p className="mt-3 max-w-3xl text-sm text-gray-600">{description}</p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => scrollBy('prev')}
            aria-label="Previous campaigns"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 shadow-sm hover:border-blue-400 hover:text-blue-700"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => scrollBy('next')}
            aria-label="Next campaigns"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 shadow-sm hover:border-blue-400 hover:text-blue-700"
          >
            ›
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="mt-8 flex snap-x gap-5 overflow-x-auto pb-5"
        role="list"
        aria-label="Available active campaigns"
      >
        {orderedCampaigns.map((campaign) => (
          <div key={campaign.id} role="listitem">
            <CampaignCard
              campaign={campaign}
              actionLabel={actionLabel}
              selected={selectedCampaignId === campaign.id}
              onClick={() => handleSelectCampaign(campaign.id)}
            />
          </div>
        ))}
      </div>

      <p className="text-center text-xs text-gray-500">
        Swipe or use the arrow buttons to browse active campaigns.
      </p>
    </section>
  )
}

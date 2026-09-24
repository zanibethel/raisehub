'use client'

import Link from 'next/link'
import { useRef } from 'react'

import CampaignCard from './campaign-card'
import type { SelectableCampaignCard } from '@/lib/types/campaigns'

type CampaignProgressCarouselClientProps = {
  campaigns: SelectableCampaignCard[]
}

export default function CampaignProgressCarouselClient({
  campaigns,
}: CampaignProgressCarouselClientProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null)

  function move(direction: -1 | 1) {
    const element = scrollRef.current
    if (!element) return

    element.scrollBy({
      left: direction * Math.max(280, element.clientWidth * 0.82),
      behavior: 'smooth',
    })
  }

  if (!campaigns.length) return null

  return (
    <section
      className="mx-auto mt-12 w-full max-w-6xl sm:mt-16"
      aria-label="Trending Fundraisers carousel"
    >
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-700">
            Trending Fundraisers
          </p>
          <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
            Support a campaign gaining momentum
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Pick a local fundraiser, purchase a RaiseHub pass, and help move its goal forward.
          </p>
        </div>

        <div className="hidden shrink-0 items-center gap-2 sm:flex">
          <button
            type="button"
            onClick={() => move(-1)}
            aria-label="Previous fundraiser"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-xl font-black text-slate-700 shadow-sm hover:border-blue-300 hover:text-blue-700"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => move(1)}
            aria-label="Next fundraiser"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-xl font-black text-slate-700 shadow-sm hover:border-blue-300 hover:text-blue-700"
          >
            ›
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        role="list"
        aria-label="Trending fundraiser campaigns"
        className="-mr-4 mt-5 flex snap-x snap-mandatory gap-4 overflow-x-auto pr-4 pb-2 [scrollbar-width:none] [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden sm:mr-0 sm:pr-0"
      >
        {campaigns.map((campaign) => (
          <div
            key={campaign.id}
            role="listitem"
            className="w-[88%] min-w-[88%] shrink-0 snap-start sm:w-[370px] sm:min-w-[370px]"
          >
            <CampaignCard
              campaign={campaign}
              href={`/campaigns/${campaign.id}`}
              actionLabel="View Campaign"
              className="!min-w-0 w-full"
            />
          </div>
        ))}
      </div>

      <div className="mt-4">
        <Link
          href="/campaigns"
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 text-sm font-black text-blue-700 transition hover:bg-blue-100"
        >
          Browse all fundraisers <span aria-hidden="true">→</span>
        </Link>
      </div>
    </section>
  )
}

'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

import {
  dismissSpotlightAction,
  recordSpotlightClickAction,
  recordSpotlightViewAction,
} from '@/app/dashboard/spotlight-actions'
import type { SpotlightCampaign } from '@/lib/spotlights/spotlight-service'

const KIND_LABELS: Record<SpotlightCampaign['kind'], string> = {
  announcement: 'Announcement',
  upgrade: 'Upgrade',
  business_promo: 'Featured Business',
  organization_promo: 'Featured Fundraiser',
  system: 'RaiseHub Update',
}

export default function SpotlightCarousel({
  campaigns,
  workspaceKey,
}: {
  campaigns: SpotlightCampaign[]
  workspaceKey: string
}) {
  const [items, setItems] = useState(campaigns)
  const [index, setIndex] = useState(0)
  const [open, setOpen] = useState(campaigns.length > 0)
  const recorded = useRef(new Set<string>())

  const current = items[index] ?? null
  const total = items.length
  const canGoBack = index > 0
  const canGoForward = index < total - 1

  useEffect(() => {
    if (!open || !current || recorded.current.has(current.id)) return
    recorded.current.add(current.id)
    void recordSpotlightViewAction(current.id, workspaceKey)
  }, [current, open, workspaceKey])

  const imageStyle = useMemo(
    () =>
      current?.image_url
        ? {
            backgroundImage: `linear-gradient(to top, rgba(15,23,42,.58), rgba(15,23,42,.08)), url(${JSON.stringify(current.image_url).slice(1, -1)})`,
          }
        : undefined,
    [current?.image_url]
  )

  if (!open || !current) return null

  function removeCurrent() {
    setItems((existing) => {
      const next = existing.filter((item) => item.id !== current.id)
      if (next.length === 0) {
        setOpen(false)
        setIndex(0)
      } else {
        setIndex((currentIndex) => Math.min(currentIndex, next.length - 1))
      }
      return next
    })
  }

  async function dismissCurrent() {
    await dismissSpotlightAction(current.id, workspaceKey)
    removeCurrent()
  }

  async function follow(url: string | null) {
    if (!url) return
    await recordSpotlightClickAction(current.id, workspaceKey)
    window.location.href = url
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-950/55 p-3 backdrop-blur-sm sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label="RaiseHub Spotlight">
      <div className="w-full max-w-2xl overflow-hidden rounded-[2rem] border border-white/70 bg-white shadow-2xl">
        {current.image_url ? (
          <div className="relative h-44 bg-cover bg-center sm:h-56" style={imageStyle}>
            <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4">
              <span className="rounded-full bg-white/95 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-slate-800 shadow-sm">
                RaiseHub Spotlight
              </span>
              <button type="button" onClick={() => setOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-xl font-bold text-slate-700 shadow-sm" aria-label="Close Spotlight">×</button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between bg-gradient-to-r from-blue-700 via-blue-600 to-green-600 p-5 text-white">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-100">RaiseHub Spotlight</p>
              <p className="mt-1 text-sm font-bold text-white/90">{KIND_LABELS[current.kind]}</p>
            </div>
            <button type="button" onClick={() => setOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-xl font-bold text-white" aria-label="Close Spotlight">×</button>
          </div>
        )}

        <div className="p-5 sm:p-7">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black uppercase tracking-wide text-blue-700">
              {KIND_LABELS[current.kind]}
            </span>
            {total > 1 ? (
              <span className="text-xs font-bold text-slate-400">{index + 1} of {total}</span>
            ) : null}
          </div>

          <h2 className="mt-4 text-2xl font-black leading-tight text-slate-950 sm:text-3xl">{current.title}</h2>
          {current.body ? <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">{current.body}</p> : null}

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {current.cta_label && current.cta_url ? (
              <button type="button" onClick={() => void follow(current.cta_url)} className="min-h-12 rounded-xl bg-slate-950 px-5 text-sm font-black text-white shadow-sm transition hover:bg-slate-800">
                {current.cta_label}
              </button>
            ) : null}
            {current.secondary_cta_label && current.secondary_cta_url ? (
              <button type="button" onClick={() => void follow(current.secondary_cta_url)} className="min-h-12 rounded-xl border border-slate-300 bg-white px-5 text-sm font-black text-slate-700 transition hover:bg-slate-50">
                {current.secondary_cta_label}
              </button>
            ) : null}
          </div>

          <div className="mt-6 flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
            <div className="flex items-center gap-2">
              <button type="button" disabled={!canGoBack} onClick={() => setIndex((value) => Math.max(0, value - 1))} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-slate-600 disabled:opacity-30">←</button>
              <div className="flex gap-1.5" aria-label="Spotlight position">
                {items.map((item, itemIndex) => (
                  <button key={item.id} type="button" onClick={() => setIndex(itemIndex)} className={`h-2.5 rounded-full transition-all ${itemIndex === index ? 'w-6 bg-blue-600' : 'w-2.5 bg-slate-200'}`} aria-label={`Show Spotlight ${itemIndex + 1}`} />
                ))}
              </div>
              <button type="button" disabled={!canGoForward} onClick={() => setIndex((value) => Math.min(total - 1, value + 1))} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-slate-600 disabled:opacity-30">→</button>
            </div>

            {current.dismissible ? (
              <button type="button" onClick={() => void dismissCurrent()} className="text-xs font-bold text-slate-500 underline underline-offset-2 hover:text-slate-800">
                Don’t show again
              </button>
            ) : (
              <button type="button" onClick={() => setOpen(false)} className="text-xs font-bold text-slate-500 underline underline-offset-2 hover:text-slate-800">Not now</button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

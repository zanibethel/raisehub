'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import InsightCard from '@/components/dashboard/insight-card'
import { createClient } from '@/lib/supabase/client'

type BusinessDashboardCreateOfferProps = {
  activeOffersCount: number
  activeOfferLimit: number
  hasReachedLimit: boolean
  onViewUpgrade: () => void
}

type SavedDraftSummary = {
  title: string
  updatedAt: string | null
}

export default function BusinessDashboardCreateOffer({
  activeOffersCount,
  activeOfferLimit,
  hasReachedLimit,
  onViewUpgrade,
}: BusinessDashboardCreateOfferProps) {
  const [savedDraft, setSavedDraft] = useState<SavedDraftSummary | null>(null)
  const remainingOfferSlots = Math.max(
    activeOfferLimit - activeOffersCount,
    0
  )

  useEffect(() => {
    async function loadSavedDraft() {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      const { data } = await supabase
        .from('business_offer_drafts')
        .select('draft, updated_at')
        .eq('business_id', user.id)
        .maybeSingle()

      if (!data || !data.draft || typeof data.draft !== 'object') return

      const draft = data.draft as { title?: unknown }
      setSavedDraft({
        title:
          typeof draft.title === 'string' && draft.title.trim()
            ? draft.title.trim()
            : 'Saved offer draft',
        updatedAt:
          typeof data.updated_at === 'string' ? data.updated_at : null,
      })
    }

    loadSavedDraft()
  }, [])

  const resumeCard = savedDraft ? (
    <section className="fixed inset-x-4 bottom-4 z-40 rounded-2xl border border-blue-200 bg-white p-3 shadow-2xl sm:static sm:mb-5 sm:flex sm:items-center sm:justify-between sm:gap-4 sm:bg-blue-50 sm:p-4 sm:shadow-sm">
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-blue-700">
          Saved offer ready
        </p>
        <h2 className="mt-1 truncate text-sm font-bold text-blue-950 sm:text-base">
          {savedDraft.title}
        </h2>
      </div>

      <Link
        href="/dashboard/offers/new"
        className="mt-3 inline-flex w-full shrink-0 items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700 sm:mt-0 sm:w-auto"
      >
        Resume Saved Offer
      </Link>
    </section>
  ) : null

  if (hasReachedLimit) {
    return (
      <div>
        {resumeCard}
        <section className="rounded-2xl border border-yellow-200 bg-yellow-50 p-5">
          <h2 className="font-bold text-yellow-900">
            You are using all {activeOfferLimit} free active offers
          </h2>

          <p className="mt-2 text-sm leading-6 text-yellow-800">
            Pause an existing offer or review upgrade options before publishing
            another.
          </p>

          <button
            type="button"
            onClick={onViewUpgrade}
            className="mt-4 rounded-xl bg-yellow-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-yellow-700"
          >
            View Upgrade Options
          </button>
        </section>
      </div>
    )
  }

  return (
    <section>
      {resumeCard}
      <InsightCard
        title={
          activeOffersCount === 0
            ? 'Create your first exclusive offer'
            : `You can publish ${remainingOfferSlots} more free offer${
                remainingOfferSlots === 1 ? '' : 's'
              }`
        }
        description={
          activeOffersCount === 0
            ? 'Use the guided RaiseHub wizard to create a members-only offer.'
            : 'Create an offer aimed at a different customer goal than your existing promotions.'
        }
        recommendation="Choose one high-value offer that stays inexpensive to fulfill."
        tone="green"
      />

      <div className="mt-4">
        <Link
          href="/dashboard/offers/new"
          className="inline-flex w-full items-center justify-center rounded-xl bg-green-600 px-6 py-4 font-bold text-white shadow-md transition hover:bg-green-700 sm:w-auto"
        >
          {activeOffersCount === 0
            ? 'Create My First Offer'
            : 'Create Another Exclusive Offer'}
        </Link>
      </div>
    </section>
  )
}

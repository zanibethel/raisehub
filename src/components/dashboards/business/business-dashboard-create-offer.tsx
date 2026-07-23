'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import InsightCard from '@/components/dashboard/insight-card'
import { createClient } from '@/lib/supabase/client'

// =============================================================================
// Types
// =============================================================================

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

// =============================================================================
// Component
// =============================================================================

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
    <section className="mb-5 rounded-2xl border border-blue-200 bg-blue-50 p-5">
      <p className="text-xs font-bold uppercase tracking-wide text-blue-700">
        Saved offer draft
      </p>
      <h2 className="mt-2 text-lg font-bold text-blue-950">
        {savedDraft.title}
      </h2>
      <p className="mt-2 text-sm leading-6 text-blue-800">
        Your proposed offer is saved to this business account. Resume it when
        you are ready to publish or make changes.
      </p>
      <Link
        href="/dashboard/offers/new"
        className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-5 py-3 font-bold text-white hover:bg-blue-700 sm:w-auto"
      >
        Resume Saved Offer
      </Link>
    </section>
  ) : null

  if (hasReachedLimit) {
    return (
      <div>
        {resumeCard}
        <section className="rounded-2xl border border-yellow-200 bg-yellow-50 p-6">
          <h2 className="font-bold text-yellow-900">
            You are using all {activeOfferLimit} free active offers
          </h2>

          <p className="mt-2 text-sm leading-6 text-yellow-800">
            You can pause an existing offer to create another one. Paid plans
            will later support additional active offers, priority placement, and
            AI marketing credits.
          </p>

          <button
            type="button"
            onClick={onViewUpgrade}
            className="mt-4 rounded-xl bg-yellow-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-yellow-700"
          >
            View Future Upgrade Options
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
            ? 'Use the guided RaiseHub wizard to choose a business goal, review tailored ideas, protect your margins, and publish a members-only offer.'
            : 'A broader mix of strong exclusive offers gives members more reasons to visit your business and increases the value of every fundraiser pass.'
        }
        recommendation={
          activeOffersCount === 0
            ? 'Start with one high-perceived-value offer that costs relatively little to fulfill.'
            : 'Create an offer aimed at a different customer goal than your existing promotions.'
        }
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

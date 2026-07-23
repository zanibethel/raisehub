import { useEffect, useMemo, useState } from 'react'

import type { OfferGoal } from './goal-step'
import {
  buildRecommendedOffers,
  type RecommendedOffer,
} from '@/lib/ai/recommendation-engine'

export type OfferSuggestion = RecommendedOffer

type SuggestionStepProps = {
  businessName: string
  businessCategory: string
  selectedGoal: OfferGoal
  selectedSuggestion: OfferSuggestion | null
  onSelect: (suggestion: OfferSuggestion) => void
}

export default function SuggestionStep({
  businessName,
  businessCategory,
  selectedGoal,
  selectedSuggestion,
  onSelect,
}: SuggestionStepProps) {
  const suggestions = useMemo(
    () =>
      buildRecommendedOffers({
        businessCategory,
        goal: selectedGoal,
      }),
    [businessCategory, selectedGoal]
  )

  const selectedIndex = suggestions.findIndex(
    (suggestion) => suggestion.id === selectedSuggestion?.id
  )
  const [currentIndex, setCurrentIndex] = useState(
    selectedIndex >= 0 ? selectedIndex : 0
  )

  useEffect(() => {
    setCurrentIndex(selectedIndex >= 0 ? selectedIndex : 0)
  }, [businessCategory, selectedGoal, selectedIndex])

  const currentSuggestion = suggestions[currentIndex]

  if (!currentSuggestion) {
    return (
      <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-5">
        <p className="font-semibold text-yellow-900">
          We could not build recommendations for this business type yet.
        </p>
        <p className="mt-2 text-sm text-yellow-800">
          Go back and choose another business type or goal.
        </p>
      </div>
    )
  }

  const selected = selectedSuggestion?.id === currentSuggestion.id
  const isFirst = currentIndex === 0
  const isLast = currentIndex === suggestions.length - 1

  function showPrevious() {
    setCurrentIndex((index) => Math.max(index - 1, 0))
  }

  function showNext() {
    setCurrentIndex((index) => Math.min(index + 1, suggestions.length - 1))
  }

  return (
    <div>
      <p className="text-sm font-bold uppercase tracking-[0.18em] text-green-700">
        Recommended for {businessName || 'your business'}
      </p>

      <h1 className="mt-2 text-2xl font-bold text-blue-700 sm:text-3xl">
        Pick a starting idea
      </h1>

      <p className="mt-2 text-sm leading-6 text-gray-600">
        You will edit the title, benefit, description, dates, and fine print on
        the next screen.
      </p>

      <div className="mt-5 flex items-center gap-3">
        <button
          type="button"
          onClick={showPrevious}
          disabled={isFirst}
          aria-label="Show previous recommendation"
          className="min-h-11 rounded-xl border border-gray-300 bg-white px-4 py-2 font-semibold text-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Previous
        </button>

        <div className="min-w-0 flex-1">
          <p className="text-center text-sm font-semibold text-gray-700" aria-live="polite">
            {currentIndex + 1} of {suggestions.length}
          </p>
          <div
            className="mt-1 h-2 overflow-hidden rounded-full bg-gray-100"
            role="progressbar"
            aria-label="Recommendation progress"
            aria-valuemin={1}
            aria-valuemax={suggestions.length}
            aria-valuenow={currentIndex + 1}
          >
            <div
              className="h-full rounded-full bg-blue-600 transition-[width]"
              style={{
                width: `${((currentIndex + 1) / suggestions.length) * 100}%`,
              }}
            />
          </div>
        </div>

        <button
          type="button"
          onClick={showNext}
          disabled={isLast}
          aria-label="Show next recommendation"
          className="min-h-11 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 font-semibold text-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
        </button>
      </div>

      <article className="mt-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-xl font-bold leading-tight text-gray-900">
            {currentSuggestion.title}
          </h2>
          <span className="shrink-0 rounded-full bg-green-50 px-3 py-1 text-sm font-bold text-green-800">
            {currentSuggestion.score.total}/100
          </span>
        </div>

        <p className="mt-3 text-sm leading-6 text-gray-600">
          {currentSuggestion.description}
        </p>

        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl bg-blue-50 p-3">
            <p className="text-xs font-bold uppercase tracking-wide text-blue-700">
              Customer value
            </p>
            <p className="mt-1 font-bold text-blue-900">
              ${currentSuggestion.estimatedRetailValue}
            </p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-600">
              Est. business cost
            </p>
            <p className="mt-1 font-bold text-slate-900">
              ${currentSuggestion.estimatedBusinessCost}
            </p>
          </div>
        </div>

        <p className="mt-4 rounded-xl bg-yellow-50 p-3 text-xs font-semibold leading-5 text-yellow-900">
          RaiseHub Coach: {currentSuggestion.coachNote}
        </p>

        <button
          type="button"
          onClick={() => onSelect(currentSuggestion)}
          aria-pressed={selected}
          className={`mt-5 min-h-11 w-full rounded-xl px-5 py-3 font-semibold transition ${
            selected
              ? 'bg-green-700 text-white ring-2 ring-green-200'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {selected ? 'Selected — continue to customize' : 'Use this idea'}
        </button>

        {selected ? (
          <p className="mt-3 text-center text-sm font-semibold text-green-800" aria-live="polite">
            This is only a starting point. Select Continue below to edit every
            offer detail before publishing.
          </p>
        ) : null}
      </article>
    </div>
  )
}

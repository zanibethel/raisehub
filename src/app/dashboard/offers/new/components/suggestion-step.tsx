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

function renderStars(score: number) {
  return '★'.repeat(score) + '☆'.repeat(5 - score)
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
        Recommended for your business
      </p>

      <h1 className="mt-3 text-3xl font-bold text-blue-700 sm:text-4xl">
        Review one offer idea at a time
      </h1>

      <p className="mt-4 max-w-2xl leading-7 text-gray-600">
        These suggestions are tailored for{' '}
        <span className="font-semibold text-gray-900">
          {businessName || 'your business'}
        </span>{' '}
        and balance strong member value with sustainable business cost.
      </p>

      <div className="mt-7 flex items-center justify-between gap-4">
        <p
          className="text-sm font-semibold text-gray-700"
          aria-live="polite"
        >
          Recommendation {currentIndex + 1} of {suggestions.length}
        </p>
        <div
          className="h-2 min-w-28 flex-1 overflow-hidden rounded-full bg-gray-100 sm:max-w-xs"
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

      <article className="mt-5 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {currentSuggestion.title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              {currentSuggestion.description}
            </p>
          </div>

          <span className="shrink-0 rounded-full bg-blue-50 px-3 py-2 text-sm font-bold text-blue-700">
            Estimated value: ${currentSuggestion.estimatedRetailValue}
          </span>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-green-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-green-700">
              RaiseHub Score
            </p>
            <p className="mt-1 text-2xl font-bold text-green-800">
              {currentSuggestion.score.total}/100
            </p>
            <p className="mt-1 text-xs font-semibold text-green-700">
              {currentSuggestion.score.recommendation}
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 p-4">
            <div className="space-y-2 text-xs text-gray-700">
              <p>
                Member value:{' '}
                <span className="font-semibold">
                  {renderStars(currentSuggestion.score.memberValue)}
                </span>
              </p>
              <p>
                Business sustainability:{' '}
                <span className="font-semibold">
                  {renderStars(currentSuggestion.score.businessSustainability)}
                </span>
              </p>
              <p>
                Exclusivity:{' '}
                <span className="font-semibold">
                  {renderStars(currentSuggestion.score.exclusivity)}
                </span>
              </p>
              <p>
                Growth potential:{' '}
                <span className="font-semibold">
                  {renderStars(currentSuggestion.score.growthPotential)}
                </span>
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-xl bg-yellow-50 p-3">
          <p className="text-xs font-semibold leading-5 text-yellow-900">
            RaiseHub Coach: {currentSuggestion.coachNote}
          </p>
        </div>

        <div className="mt-3 text-xs text-gray-500">
          <p>
            Estimated business cost: ${currentSuggestion.estimatedBusinessCost}
          </p>
          <p className="mt-1">Exclusive to RaiseHub members</p>
        </div>

        <button
          type="button"
          onClick={() => onSelect(currentSuggestion)}
          aria-pressed={selected}
          className={`mt-6 min-h-11 w-full rounded-xl px-5 py-3 font-semibold transition sm:w-auto ${
            selected
              ? 'bg-green-700 text-white ring-2 ring-green-200'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {selected ? 'Selected ✓' : 'Choose this recommendation'}
        </button>
      </article>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={showPrevious}
          disabled={isFirst}
          className="min-h-11 rounded-xl border border-gray-300 bg-white px-4 py-3 font-semibold text-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Previous
        </button>
        <button
          type="button"
          onClick={showNext}
          disabled={isLast}
          className="min-h-11 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 font-semibold text-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  )
}

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
  const suggestions = buildRecommendedOffers({
    businessCategory,
    goal: selectedGoal,
  })

  return (
    <div>
      <p className="text-sm font-bold uppercase tracking-[0.18em] text-green-700">
        Recommended for your business
      </p>

      <h1 className="mt-3 text-3xl font-bold text-blue-700 sm:text-4xl">
        Exclusive offers built for real member value
      </h1>

      <p className="mt-4 max-w-2xl leading-7 text-gray-600">
        These suggestions are tailored for{' '}
        <span className="font-semibold text-gray-900">
          {businessName || 'your business'}
        </span>{' '}
        and designed to balance strong customer value with sustainable business
        cost.
      </p>

      <div className="mt-7 grid gap-5">
        {suggestions.map((suggestion) => {
          const selected = selectedSuggestion?.id === suggestion.id

          return (
            <button
              key={suggestion.id}
              type="button"
              onClick={() => onSelect(suggestion)}
              className={`rounded-2xl border p-5 text-left transition ${
                selected
                  ? 'border-green-500 bg-green-50 ring-2 ring-green-100'
                  : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-sm'
              }`}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">
                    {selected ? '✓ ' : ''}
                    {suggestion.title}
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-gray-600">
                    {suggestion.description}
                  </p>
                </div>

                <span className="shrink-0 rounded-full bg-blue-50 px-3 py-2 text-sm font-bold text-blue-700">
                  Estimated value: ${suggestion.estimatedRetailValue}
                </span>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-green-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-green-700">
                    RaiseHub Score
                  </p>

                  <p className="mt-1 text-2xl font-bold text-green-800">
                    {suggestion.score.total}/100
                  </p>

                  <p className="mt-1 text-xs font-semibold text-green-700">
                    {suggestion.score.recommendation}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-4">
                  <div className="space-y-2 text-xs text-gray-700">
                    <p>
                      Member value:{' '}
                      <span className="font-semibold">
                        {renderStars(suggestion.score.memberValue)}
                      </span>
                    </p>

                    <p>
                      Business sustainability:{' '}
                      <span className="font-semibold">
                        {renderStars(
                          suggestion.score.businessSustainability
                        )}
                      </span>
                    </p>

                    <p>
                      Exclusivity:{' '}
                      <span className="font-semibold">
                        {renderStars(suggestion.score.exclusivity)}
                      </span>
                    </p>

                    <p>
                      Growth potential:{' '}
                      <span className="font-semibold">
                        {renderStars(suggestion.score.growthPotential)}
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-xl bg-yellow-50 p-3">
                <p className="text-xs font-semibold leading-5 text-yellow-900">
                  RaiseHub Coach: {suggestion.coachNote}
                </p>
              </div>

              <div className="mt-3 text-xs text-gray-500">
                <p>
                  Estimated business cost: ${suggestion.estimatedBusinessCost}
                </p>
                <p className="mt-1">
                  Exclusive to RaiseHub members
                </p>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

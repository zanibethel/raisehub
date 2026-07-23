import { scoreOffer } from '@/lib/ai/scoring'

export type OfferExclusivity = 'never' | 'occasionally' | 'already-public'

export type OfferDraft = {
  title: string
  memberBenefit: string
  qualifyingPurchase: string
  description: string
  startsAt: string
  endsAt: string
  limitOnePerMember: boolean
  validEveryDay: boolean
  requiresPurchase: boolean
  exclusivity: OfferExclusivity
  estimatedRetailValue: number
  estimatedBusinessCost: number
}

type DetailsStepProps = {
  businessName: string
  draft: OfferDraft
  onChange: (draft: OfferDraft) => void
}

function renderStars(score: number) {
  return '★'.repeat(score) + '☆'.repeat(5 - score)
}

export function buildFinePrint(draft: OfferDraft) {
  const rules: string[] = ['Exclusive to RaiseHub members.']

  if (draft.limitOnePerMember) {
    rules.push('Limit one redemption per member.')
  }

  if (draft.requiresPurchase && draft.qualifyingPurchase.trim()) {
    rules.push(`Requires ${draft.qualifyingPurchase.trim()}.`)
  } else if (draft.requiresPurchase) {
    rules.push('Qualifying purchase required.')
  }

  if (!draft.validEveryDay) {
    rules.push('Valid only on participating days or times.')
  }

  rules.push('Cannot be combined with other promotions.')

  return rules.join(' ')
}

export default function DetailsStep({
  businessName,
  draft,
  onChange,
}: DetailsStepProps) {
  const isExclusive = draft.exclusivity !== 'already-public'

  const score = scoreOffer({
    title: draft.title,
    discount: draft.memberBenefit,
    description: draft.description,
    estimatedRetailValue: draft.estimatedRetailValue,
    estimatedBusinessCost: draft.estimatedBusinessCost,
    isExclusive,
    requiresPurchase: draft.requiresPurchase,
  })

  function updateDraft<Key extends keyof OfferDraft>(
    key: Key,
    value: OfferDraft[Key]
  ) {
    onChange({
      ...draft,
      [key]: value,
    })
  }

  return (
    <div>
      <p className="text-sm font-bold uppercase tracking-[0.18em] text-green-700">
        Customize your exclusive offer
      </p>

      <h1 className="mt-3 text-3xl font-bold text-blue-700 sm:text-4xl">
        Make this offer valuable and sustainable
      </h1>

      <p className="mt-4 max-w-2xl leading-7 text-gray-600">
        Build a members-only benefit that feels meaningful to customers without
        unnecessarily reducing your margins.
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        <div className="space-y-5">
          <section className="rounded-2xl border border-gray-200 bg-white p-5">
            <label className="block">
              <span className="text-sm font-bold text-gray-800">
                Offer name
              </span>

              <textarea
                value={draft.title}
                onChange={(event) =>
                  updateDraft('title', event.target.value)
                }
                rows={2}
                className="mt-2 w-full resize-y rounded-xl border border-gray-300 p-3 leading-6 outline-none focus:border-blue-500"
                placeholder="Example: VIP Lunch Combo"
              />
            </label>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-5">
            <label className="block">
              <span className="text-sm font-bold text-gray-800">
                Member benefit
              </span>

              <p className="mt-1 text-xs text-gray-500">
                Describe what the member receives—not merely the percentage
                discounted.
              </p>

              <textarea
                value={draft.memberBenefit}
                onChange={(event) =>
                  updateDraft('memberBenefit', event.target.value)
                }
                rows={2}
                className="mt-3 w-full resize-y rounded-xl border border-gray-300 p-3 leading-6 outline-none focus:border-blue-500"
                placeholder="Example: Free loaded fries"
              />
            </label>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-5">
            <label className="block">
              <span className="text-sm font-bold text-gray-800">
                Qualifying purchase
              </span>

              <input
                value={draft.qualifyingPurchase}
                onChange={(event) =>
                  updateDraft('qualifyingPurchase', event.target.value)
                }
                disabled={!draft.requiresPurchase}
                className="mt-2 w-full rounded-xl border border-gray-300 p-3 outline-none focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-400"
                placeholder="Example: Any combo meal"
              />
            </label>

            <label className="mt-4 flex items-center gap-3 text-sm font-semibold text-gray-700">
              <input
                type="checkbox"
                checked={draft.requiresPurchase}
                onChange={(event) =>
                  updateDraft('requiresPurchase', event.target.checked)
                }
                className="h-4 w-4"
              />
              Require a qualifying purchase
            </label>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-5">
            <label className="block">
              <span className="text-sm font-bold text-gray-800">
                Customer-facing description
              </span>

              <textarea
                value={draft.description}
                onChange={(event) =>
                  updateDraft('description', event.target.value)
                }
                rows={4}
                className="mt-2 w-full rounded-xl border border-gray-300 p-3 outline-none focus:border-blue-500"
                placeholder="Explain why members will enjoy this exclusive offer."
              />
            </label>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-5">
            <h2 className="font-bold text-gray-900">Offer duration</h2>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm font-semibold text-gray-700">
                  Start date
                </span>

                <input
                  type="date"
                  value={draft.startsAt}
                  onChange={(event) =>
                    updateDraft('startsAt', event.target.value)
                  }
                  className="mt-2 w-full rounded-xl border border-gray-300 p-3"
                />
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-gray-700">
                  End date
                </span>

                <input
                  type="date"
                  value={draft.endsAt}
                  onChange={(event) =>
                    updateDraft('endsAt', event.target.value)
                  }
                  className="mt-2 w-full rounded-xl border border-gray-300 p-3"
                />
              </label>
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-5">
            <h2 className="font-bold text-gray-900">Redemption rules</h2>

            <div className="mt-4 space-y-4">
              <label className="flex items-center gap-3 text-sm font-semibold text-gray-700">
                <input
                  type="checkbox"
                  checked={draft.limitOnePerMember}
                  onChange={(event) =>
                    updateDraft('limitOnePerMember', event.target.checked)
                  }
                  className="h-4 w-4"
                />
                Limit one redemption per member
              </label>

              <label className="flex items-center gap-3 text-sm font-semibold text-gray-700">
                <input
                  type="checkbox"
                  checked={draft.validEveryDay}
                  onChange={(event) =>
                    updateDraft('validEveryDay', event.target.checked)
                  }
                  className="h-4 w-4"
                />
                Valid every day
              </label>
            </div>

            <div className="mt-5 rounded-xl bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-600">
                Generated fine print
              </p>

              <p className="mt-2 text-sm leading-6 text-gray-700">
                {buildFinePrint(draft)}
              </p>
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-5">
            <h2 className="font-bold text-gray-900">Offer value</h2>

            <p className="mt-1 text-sm text-gray-600">
              These values are only shown to the business and help RaiseHub
              measure perceived value against fulfillment cost.
            </p>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm font-semibold text-gray-700">
                  Estimated customer value
                </span>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={draft.estimatedRetailValue}
                  onChange={(event) =>
                    updateDraft(
                      'estimatedRetailValue',
                      Number(event.target.value)
                    )
                  }
                  className="mt-2 w-full rounded-xl border border-gray-300 p-3"
                />
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-gray-700">
                  Estimated business cost
                </span>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={draft.estimatedBusinessCost}
                  onChange={(event) =>
                    updateDraft(
                      'estimatedBusinessCost',
                      Number(event.target.value)
                    )
                  }
                  className="mt-2 w-full rounded-xl border border-gray-300 p-3"
                />
              </label>
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-5">
            <h2 className="font-bold text-gray-900">Exclusivity check</h2>

            <p className="mt-1 text-sm text-gray-600">
              Would customers normally receive this offer outside RaiseHub?
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {[
                ['never', 'Never'],
                ['occasionally', 'Occasionally'],
                ['already-public', 'Already do'],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() =>
                    updateDraft(
                      'exclusivity',
                      value as OfferExclusivity
                    )
                  }
                  className={`rounded-xl border p-3 text-sm font-semibold ${
                    draft.exclusivity === value
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-gray-200 bg-white text-gray-700'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {draft.exclusivity === 'already-public' ? (
              <p className="mt-4 rounded-xl bg-yellow-50 p-4 text-sm leading-6 text-yellow-900">
                RaiseHub members should receive something unavailable through
                normal walk-in promotions, social media, email lists, or public
                coupons. Consider adding an exclusive upgrade, bundle, or bonus.
              </p>
            ) : null}
          </section>
        </div>

        <aside className="space-y-5 lg:sticky lg:top-6 lg:self-start">
          <section className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
            <p className="text-xs font-bold uppercase tracking-wide text-blue-600">
              Live member preview
            </p>

            <p className="mt-3 text-sm font-semibold text-gray-500">
              {businessName || 'Community Partner'}
            </p>

            <h2 className="mt-2 text-2xl font-bold text-gray-900">
              {draft.title || 'Your exclusive offer'}
            </h2>

            <p className="mt-3 text-lg font-bold text-blue-700">
              {draft.memberBenefit || 'Member benefit'}
            </p>

            {draft.qualifyingPurchase && draft.requiresPurchase ? (
              <p className="mt-2 text-sm text-gray-600">
                With {draft.qualifyingPurchase}
              </p>
            ) : null}

            <p className="mt-4 text-sm leading-6 text-gray-700">
              {draft.description ||
                'Your customer-facing description will appear here.'}
            </p>

            <div className="mt-5 rounded-xl bg-white p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-green-700">
                Estimated member value
              </p>

              <p className="mt-1 text-2xl font-bold text-green-800">
                ${draft.estimatedRetailValue.toFixed(2)}
              </p>
            </div>

            <p className="mt-4 text-xs font-semibold text-blue-700">
              Exclusive to RaiseHub members
            </p>
          </section>

          <section className="rounded-2xl border border-green-100 bg-green-50 p-5">
            <p className="text-xs font-bold uppercase tracking-wide text-green-700">
              RaiseHub Score
            </p>

            <p className="mt-2 text-3xl font-bold text-green-800">
              {score.total}/100
            </p>

            <p className="mt-1 text-sm font-semibold text-green-700">
              {score.recommendation}
            </p>

            <div className="mt-5 space-y-2 text-xs text-gray-700">
              <p>Member value: {renderStars(score.memberValue)}</p>
              <p>
                Business sustainability:{' '}
                {renderStars(score.businessSustainability)}
              </p>
              <p>Exclusivity: {renderStars(score.exclusivity)}</p>
              <p>
                Growth potential: {renderStars(score.growthPotential)}
              </p>
            </div>

            <div className="mt-5 space-y-2">
              {score.feedback.map((item) => (
                <p
                  key={item}
                  className="rounded-lg bg-white/70 p-3 text-xs leading-5 text-gray-700"
                >
                  {item}
                </p>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  )
}

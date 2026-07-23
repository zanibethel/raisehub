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

  if (draft.limitOnePerMember) rules.push('Limit one redemption per member.')

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
    onChange({ ...draft, [key]: value })
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
        Edit every detail before publishing. Your RaiseHub Score updates as you work.
      </p>

      <details className="sticky top-2 z-20 mt-6 rounded-2xl border border-green-200 bg-green-50/95 shadow-md backdrop-blur">
        <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 rounded-2xl px-4 py-3 marker:hidden">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wide text-green-700">
              Live RaiseHub Score
            </p>
            <p className="truncate text-sm font-semibold text-green-800">
              {score.recommendation}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <span className="text-2xl font-bold text-green-800">{score.total}/100</span>
            <span className="rounded-full bg-white px-2 py-1 text-xs font-bold text-green-700">
              Details
            </span>
          </div>
        </summary>

        <div className="border-t border-green-200 px-4 pb-4 pt-3">
          <p className="text-xs leading-5 text-green-900">
            This score changes immediately when you edit the offer below.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-700 sm:grid-cols-4">
            <p className="rounded-lg bg-white p-2">Member value<br /><strong>{renderStars(score.memberValue)}</strong></p>
            <p className="rounded-lg bg-white p-2">Sustainability<br /><strong>{renderStars(score.businessSustainability)}</strong></p>
            <p className="rounded-lg bg-white p-2">Exclusivity<br /><strong>{renderStars(score.exclusivity)}</strong></p>
            <p className="rounded-lg bg-white p-2">Growth potential<br /><strong>{renderStars(score.growthPotential)}</strong></p>
          </div>
          <div className="mt-3 space-y-2">
            {score.feedback.map((item) => (
              <p key={item} className="rounded-lg bg-white/80 p-3 text-xs leading-5 text-gray-700">
                {item}
              </p>
            ))}
          </div>
        </div>
      </details>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        <div className="space-y-5">
          <section className="rounded-2xl border border-gray-200 bg-white p-5">
            <label className="block">
              <span className="text-sm font-bold text-gray-800">Offer name</span>
              <textarea
                value={draft.title}
                onChange={(event) => updateDraft('title', event.target.value)}
                rows={2}
                className="mt-2 w-full resize-y rounded-xl border border-gray-300 p-3 leading-6 outline-none focus:border-blue-500"
                placeholder="Example: VIP Lunch Combo"
              />
            </label>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-5">
            <label className="block">
              <span className="text-sm font-bold text-gray-800">Member benefit</span>
              <p className="mt-1 text-xs text-gray-500">
                Describe what the member receives—not merely the percentage discounted.
              </p>
              <textarea
                value={draft.memberBenefit}
                onChange={(event) => updateDraft('memberBenefit', event.target.value)}
                rows={2}
                className="mt-3 w-full resize-y rounded-xl border border-gray-300 p-3 leading-6 outline-none focus:border-blue-500"
                placeholder="Example: Free loaded fries"
              />
            </label>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-5">
            <label className="block">
              <span className="text-sm font-bold text-gray-800">Qualifying purchase</span>
              <input
                value={draft.qualifyingPurchase}
                onChange={(event) => updateDraft('qualifyingPurchase', event.target.value)}
                disabled={!draft.requiresPurchase}
                className="mt-2 w-full rounded-xl border border-gray-300 p-3 outline-none focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-400"
                placeholder="Example: Any combo meal"
              />
            </label>
            <label className="mt-4 flex items-center gap-3 text-sm font-semibold text-gray-700">
              <input
                type="checkbox"
                checked={draft.requiresPurchase}
                onChange={(event) => updateDraft('requiresPurchase', event.target.checked)}
                className="h-4 w-4"
              />
              Require a qualifying purchase
            </label>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-5">
            <label className="block">
              <span className="text-sm font-bold text-gray-800">Customer-facing description</span>
              <textarea
                value={draft.description}
                onChange={(event) => updateDraft('description', event.target.value)}
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
                <span className="text-sm font-semibold text-gray-700">Start date</span>
                <input type="date" value={draft.startsAt} onChange={(event) => updateDraft('startsAt', event.target.value)} className="mt-2 w-full rounded-xl border border-gray-300 p-3" />
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-gray-700">End date</span>
                <input type="date" value={draft.endsAt} onChange={(event) => updateDraft('endsAt', event.target.value)} className="mt-2 w-full rounded-xl border border-gray-300 p-3" />
              </label>
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-5">
            <h2 className="font-bold text-gray-900">Redemption rules</h2>
            <div className="mt-4 space-y-4">
              <label className="flex items-center gap-3 text-sm font-semibold text-gray-700">
                <input type="checkbox" checked={draft.limitOnePerMember} onChange={(event) => updateDraft('limitOnePerMember', event.target.checked)} className="h-4 w-4" />
                Limit one redemption per member
              </label>
              <label className="flex items-center gap-3 text-sm font-semibold text-gray-700">
                <input type="checkbox" checked={draft.validEveryDay} onChange={(event) => updateDraft('validEveryDay', event.target.checked)} className="h-4 w-4" />
                Valid every day
              </label>
            </div>
            <div className="mt-5 rounded-xl bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-600">Generated fine print</p>
              <p className="mt-2 text-sm leading-6 text-gray-700">{buildFinePrint(draft)}</p>
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-5">
            <h2 className="font-bold text-gray-900">Offer value</h2>
            <p className="mt-1 text-sm text-gray-600">
              These values are private and help compare customer value with business cost.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <label className="block">
                <span className="text-sm font-semibold text-gray-700">Customer value</span>
                <input type="number" min="0" step="0.01" value={draft.estimatedRetailValue} onChange={(event) => updateDraft('estimatedRetailValue', Number(event.target.value))} className="mt-2 w-full rounded-xl border border-gray-300 p-3" />
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-gray-700">Business cost</span>
                <input type="number" min="0" step="0.01" value={draft.estimatedBusinessCost} onChange={(event) => updateDraft('estimatedBusinessCost', Number(event.target.value))} className="mt-2 w-full rounded-xl border border-gray-300 p-3" />
              </label>
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-5">
            <h2 className="font-bold text-gray-900">Exclusivity check</h2>
            <p className="mt-1 text-sm text-gray-600">Would customers normally receive this offer outside RaiseHub?</p>
            <div className="mt-4 grid grid-cols-3 gap-3">
              {[
                ['never', 'Never'],
                ['occasionally', 'Sometimes'],
                ['already-public', 'Already do'],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => updateDraft('exclusivity', value as OfferExclusivity)}
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
                Add an exclusive upgrade, bundle, or bonus so members receive something unavailable publicly.
              </p>
            ) : null}
          </section>
        </div>

        <aside className="lg:sticky lg:top-6 lg:self-start">
          <section className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
            <p className="text-xs font-bold uppercase tracking-wide text-blue-600">Live member preview</p>
            <p className="mt-3 text-sm font-semibold text-gray-500">{businessName || 'Community Partner'}</p>
            <h2 className="mt-2 break-words text-2xl font-bold text-gray-900">{draft.title || 'Your exclusive offer'}</h2>
            <p className="mt-3 break-words text-lg font-bold text-blue-700">{draft.memberBenefit || 'Member benefit'}</p>
            {draft.qualifyingPurchase && draft.requiresPurchase ? <p className="mt-2 text-sm text-gray-600">With {draft.qualifyingPurchase}</p> : null}
            <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-6 text-gray-700">{draft.description || 'Your customer-facing description will appear here.'}</p>
            <div className="mt-5 rounded-xl bg-white p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-green-700">Estimated member value</p>
              <p className="mt-1 text-2xl font-bold text-green-800">${draft.estimatedRetailValue.toFixed(2)}</p>
            </div>
            <p className="mt-4 text-xs font-semibold text-blue-700">Exclusive to RaiseHub members</p>
          </section>
        </aside>
      </div>
    </div>
  )
}

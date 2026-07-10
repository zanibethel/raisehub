import { scoreOffer } from '@/lib/ai/scoring'
import {
  buildFinePrint,
  type OfferDraft,
} from './details-step'

type ReviewStepProps = {
  businessName: string
  draft: OfferDraft
  publishing: boolean
  onPublish: () => void
}

function formatDate(value: string) {
  if (!value) return 'No date selected'

  return new Date(`${value}T00:00:00`).toLocaleDateString()
}

export default function ReviewStep({
  businessName,
  draft,
  publishing,
  onPublish,
}: ReviewStepProps) {
  const score = scoreOffer({
    title: draft.title,
    discount: draft.memberBenefit,
    description: draft.description,
    estimatedRetailValue: draft.estimatedRetailValue,
    estimatedBusinessCost: draft.estimatedBusinessCost,
    isExclusive: draft.exclusivity !== 'already-public',
    requiresPurchase: draft.requiresPurchase,
  })

  return (
    <div>
      <p className="text-sm font-bold uppercase tracking-[0.18em] text-green-700">
        Review and publish
      </p>

      <h1 className="mt-3 text-3xl font-bold text-blue-700 sm:text-4xl">
        Your exclusive offer is ready
      </h1>

      <p className="mt-4 max-w-2xl leading-7 text-gray-600">
        Review exactly what members will see before publishing.
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-3xl border border-blue-100 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-gray-500">
            {businessName || 'Community Partner'}
          </p>

          <h2 className="mt-3 text-3xl font-bold text-gray-900">
            {draft.title}
          </h2>

          <p className="mt-4 text-xl font-bold text-blue-700">
            {draft.memberBenefit}
          </p>

          {draft.requiresPurchase && draft.qualifyingPurchase ? (
            <p className="mt-2 text-sm text-gray-600">
              With {draft.qualifyingPurchase}
            </p>
          ) : null}

          <p className="mt-5 leading-7 text-gray-700">
            {draft.description}
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl bg-green-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-green-700">
                Estimated member value
              </p>

              <p className="mt-2 text-2xl font-bold text-green-800">
                ${draft.estimatedRetailValue.toFixed(2)}
              </p>
            </div>

            <div className="rounded-2xl bg-blue-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-blue-700">
                Availability
              </p>

              <p className="mt-2 text-sm font-semibold text-gray-800">
                {formatDate(draft.startsAt)} – {formatDate(draft.endsAt)}
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-2xl bg-slate-50 p-5">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-600">
              Fine print
            </p>

            <p className="mt-2 text-sm leading-6 text-gray-700">
              {buildFinePrint(draft)}
            </p>
          </div>

          <p className="mt-5 text-sm font-bold text-blue-700">
            Exclusive to RaiseHub members
          </p>
        </section>

        <aside className="space-y-5">
          <section className="rounded-2xl border border-green-100 bg-green-50 p-5">
            <p className="text-xs font-bold uppercase tracking-wide text-green-700">
              RaiseHub Score
            </p>

            <p className="mt-2 text-4xl font-bold text-green-800">
              {score.total}/100
            </p>

            <p className="mt-2 font-semibold text-green-700">
              {score.recommendation}
            </p>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-5">
            <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
              Business economics
            </p>

            <p className="mt-3 text-sm text-gray-700">
              Customer value:{' '}
              <span className="font-bold">
                ${draft.estimatedRetailValue.toFixed(2)}
              </span>
            </p>

            <p className="mt-2 text-sm text-gray-700">
              Estimated fulfillment cost:{' '}
              <span className="font-bold">
                ${draft.estimatedBusinessCost.toFixed(2)}
              </span>
            </p>
          </section>

          <button
            type="button"
            onClick={onPublish}
            disabled={publishing}
            className="w-full rounded-xl bg-green-600 px-6 py-4 font-bold text-white shadow-md hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {publishing ? 'Publishing Offer...' : 'Publish Exclusive Offer'}
          </button>
        </aside>
      </div>
    </div>
  )
}

'use client'

import { useState } from 'react'

type PreviewOffer = {
  id: string
  title: string | null
  discount: string | null
  description: string | null
  ends_at: string | null
}

type Props = {
  offers: PreviewOffer[]
  canReveal: boolean
}

function formatOfferDate(value: string | null): string {
  if (!value) return 'No published end date'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Date unavailable'

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function BusinessOfferPreview({ offers, canReveal }: Props) {
  const [showUnlockedView, setShowUnlockedView] = useState(false)
  const revealed = canReveal && showUnlockedView

  return (
    <>
      {canReveal ? (
        <div className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-blue-700">
                Preview controls
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Switch views without changing what customers can access.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowUnlockedView((current) => !current)}
              aria-pressed={showUnlockedView}
              className="shrink-0 rounded-full bg-blue-700 px-4 py-2 text-sm font-bold text-white"
            >
              {showUnlockedView ? 'Locked View' : 'Unlocked View'}
            </button>
          </div>
        </div>
      ) : null}

      <section className="mt-6 grid gap-4 sm:grid-cols-2">
        {offers.length > 0 ? (
          offers.map((offer, index) => (
            <article
              key={offer.id}
              className="rounded-3xl border border-yellow-100 bg-white/95 p-5 shadow-lg"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-bold uppercase tracking-wide text-yellow-700">
                  Exclusive Local Deal {index + 1}
                </p>
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${
                  revealed
                    ? 'bg-green-100 text-green-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {revealed ? 'Unlocked' : 'Locked'}
                </span>
              </div>

              {revealed ? (
                <div className="mt-5 rounded-2xl border border-green-200 bg-green-50 p-5">
                  <h2 className="text-lg font-bold text-gray-950">
                    {offer.title || 'Exclusive Local Deal'}
                  </h2>
                  <p className="mt-2 text-base font-bold text-green-800">
                    {offer.discount || 'Member benefit not entered'}
                  </p>
                  <p className="mt-3 text-sm leading-6 text-gray-700">
                    {offer.description || 'No customer description entered.'}
                  </p>
                </div>
              ) : (
                <div className="mt-5 rounded-2xl border border-yellow-200 bg-yellow-50 p-5 text-center">
                  <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-yellow-100 text-lg">
                    🔒
                  </div>
                  <h2 className="mt-3 text-lg font-bold text-gray-900">
                    Deal details require a RaiseHub Pass
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-gray-600">
                    Support a participating fundraiser to reveal this offer.
                  </p>
                </div>
              )}

              <div className="mt-4 rounded-2xl bg-gray-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
                  Valid until
                </p>
                <p className="mt-1 font-semibold text-gray-800">
                  {formatOfferDate(offer.ends_at)}
                </p>
              </div>
            </article>
          ))
        ) : (
          <div className="rounded-3xl border border-gray-200 bg-white p-6 text-center sm:col-span-2">
            <h2 className="font-bold text-gray-900">
              No customer offers are currently available
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Check back after this business publishes or reactivates an offer.
            </p>
          </div>
        )}
      </section>
    </>
  )
}

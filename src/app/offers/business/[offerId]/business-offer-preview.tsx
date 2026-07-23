'use client'

import { useState } from 'react'

type PreviewOffer = {
  id: string
  title: string | null
  discount: string | null
  description: string | null
  ends_at: string | null
}

type BusinessDetails = {
  name: string
  logoUrl: string | null
  address: string | null
  phone: string | null
  websiteUrl: string | null
  googleMapsUrl: string | null
}

type Props = {
  offers: PreviewOffer[]
  canReveal: boolean
  business: BusinessDetails
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

function normalizeExternalUrl(value: string): string {
  return /^https?:\/\//i.test(value) ? value : `https://${value}`
}

export default function BusinessOfferPreview({
  offers,
  canReveal,
  business,
}: Props) {
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

      <section className="mt-6 grid gap-6">
        {offers.length > 0 ? (
          offers.map((offer) => (
            <article
              key={offer.id}
              className="overflow-hidden rounded-3xl border border-yellow-100 bg-white/95 shadow-xl"
            >
              <header className="border-b border-yellow-100 p-5 sm:p-8">
                <div className="flex items-start gap-4">
                  <img
                    src={business.logoUrl || '/default-business-logo.png'}
                    alt={`${business.name} logo`}
                    className="h-14 w-14 shrink-0 rounded-xl border border-gray-200 object-cover sm:h-16 sm:w-16"
                  />
                  <div className="min-w-0">
                    <p className="break-words text-xs font-semibold uppercase tracking-wide text-yellow-700">
                      {business.name}
                    </p>
                    <h2 className="mt-1 break-words text-2xl font-bold leading-tight text-gray-900 sm:text-3xl">
                      {revealed ? offer.title || 'Exclusive Local Deal' : 'Exclusive Local Deal'}
                    </h2>
                  </div>
                </div>
              </header>

              <div className="p-5 sm:p-8">
                {revealed ? (
                  <section className="rounded-2xl border border-green-100 bg-green-50 p-5 sm:p-6">
                    <p className="text-xs font-semibold uppercase tracking-wide text-green-700">
                      Pass Benefit
                    </p>
                    <p className="mt-2 break-words text-xl font-bold text-green-800">
                      {offer.discount || 'Special savings available'}
                    </p>
                    <p className="mt-3 break-words text-sm leading-6 text-gray-700 sm:text-base">
                      {offer.description || 'Exclusive customer offer'}
                    </p>
                  </section>
                ) : (
                  <section className="rounded-2xl border border-yellow-200 bg-yellow-50 p-5 text-center sm:p-6">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100 text-xl">
                      🔒
                    </div>
                    <h3 className="mt-4 text-lg font-bold text-gray-900">
                      Deal details require a RaiseHub Pass
                    </h3>
                    <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-600">
                      Support a participating fundraiser to reveal the discount, full offer description, and redemption details.
                    </p>
                  </section>
                )}

                <section className="mt-6 rounded-2xl border border-gray-100 bg-gray-50 p-5">
                  <h3 className="font-bold text-gray-900">Offer Information</h3>
                  <dl className="mt-4 space-y-4 text-sm">
                    <div>
                      <dt className="font-semibold text-gray-900">Valid until</dt>
                      <dd className="mt-1 text-gray-600">
                        {formatOfferDate(offer.ends_at)}
                      </dd>
                    </div>
                    {business.address ? (
                      <div>
                        <dt className="font-semibold text-gray-900">Location</dt>
                        <dd className="mt-1 break-words text-gray-600">
                          {business.address}
                        </dd>
                      </div>
                    ) : null}
                    {business.phone ? (
                      <div>
                        <dt className="font-semibold text-gray-900">Phone</dt>
                        <dd className="mt-1">
                          <a
                            href={`tel:${business.phone}`}
                            className="break-words font-medium text-blue-700 underline underline-offset-4"
                          >
                            {business.phone}
                          </a>
                        </dd>
                      </div>
                    ) : null}
                  </dl>
                </section>

                {business.websiteUrl || business.googleMapsUrl ? (
                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    {business.websiteUrl ? (
                      <a
                        href={normalizeExternalUrl(business.websiteUrl)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-green-200 bg-white px-4 py-2.5 text-center text-sm font-semibold text-green-700 transition hover:bg-green-50"
                      >
                        Visit Website
                      </a>
                    ) : null}
                    {business.googleMapsUrl ? (
                      <a
                        href={normalizeExternalUrl(business.googleMapsUrl)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-green-200 bg-white px-4 py-2.5 text-center text-sm font-semibold text-green-700 transition hover:bg-green-50"
                      >
                        View Map
                      </a>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </article>
          ))
        ) : (
          <div className="rounded-3xl border border-gray-200 bg-white p-6 text-center">
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

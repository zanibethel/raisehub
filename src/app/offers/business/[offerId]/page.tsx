import Link from 'next/link'

import { createClient } from '@/lib/supabase/server'

type BusinessOfferPreviewPageProps = {
  params: Promise<{ offerId: string }>
}

type PreviewOffer = {
  id: string
  starts_at: string | null
  ends_at: string | null
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

function isCurrentlyAvailable(offer: PreviewOffer): boolean {
  const now = Date.now()
  const startsAt = offer.starts_at ? new Date(offer.starts_at).getTime() : null
  const endsAt = offer.ends_at ? new Date(offer.ends_at).getTime() : null

  if (startsAt !== null && !Number.isNaN(startsAt) && startsAt > now) {
    return false
  }

  if (endsAt !== null && !Number.isNaN(endsAt) && endsAt < now) {
    return false
  }

  return true
}

export default async function BusinessOfferPreviewPage({
  params,
}: BusinessOfferPreviewPageProps) {
  const { offerId } = await params
  const supabase = await createClient()

  const { data: anchorOffer } = await supabase
    .from('offers')
    .select('business_id')
    .eq('id', offerId)
    .eq('is_active', true)
    .maybeSingle()

  if (!anchorOffer?.business_id) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-10 sm:px-8 sm:py-16">
        <div className="mx-auto max-w-xl rounded-3xl border border-gray-100 bg-white p-6 shadow-xl sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-wide text-red-700">
            Preview unavailable
          </p>
          <h1 className="mt-2 text-2xl font-bold text-gray-900">
            No active business preview was found
          </h1>
          <Link
            href="/offers"
            className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white"
          >
            Back to Local Deals
          </Link>
        </div>
      </main>
    )
  }

  const [{ data: offers }, { data: profile }] = await Promise.all([
    supabase
      .from('offers')
      .select('id, starts_at, ends_at')
      .eq('business_id', anchorOffer.business_id)
      .eq('is_active', true)
      .order('created_at', { ascending: false }),
    supabase
      .from('profiles')
      .select('business_name, display_name, logo_url, address')
      .eq('id', anchorOffer.business_id)
      .maybeSingle(),
  ])

  const availableOffers = (offers ?? []).filter(isCurrentlyAvailable)
  const businessName =
    profile?.display_name || profile?.business_name || 'Local Business'

  return (
    <main className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-blue-50 px-4 py-8 sm:px-8 sm:py-16">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/offers"
          className="inline-flex min-h-11 items-center text-sm font-semibold text-yellow-700 underline-offset-4 hover:underline"
        >
          ← Back to Local Deals
        </Link>

        <section className="mt-4 rounded-3xl border border-yellow-100 bg-white/95 p-5 shadow-xl sm:mt-6 sm:p-8">
          <div className="flex items-start gap-4">
            <img
              src={profile?.logo_url || '/default-business-logo.png'}
              alt={`${businessName} logo`}
              className="h-16 w-16 shrink-0 rounded-xl border border-gray-200 object-cover"
            />
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-yellow-700">
                Community Partner
              </p>
              <h1 className="mt-1 break-words text-2xl font-bold text-gray-900 sm:text-3xl">
                {businessName}
              </h1>
              {profile?.address ? (
                <p className="mt-2 break-words text-sm text-gray-600">
                  {profile.address}
                </p>
              ) : null}
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between gap-4 border-t border-gray-100 pt-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
                Available offers
              </p>
              <p className="mt-1 text-2xl font-bold text-gray-950">
                {availableOffers.length}
              </p>
            </div>
            <p className="max-w-sm text-right text-sm leading-6 text-gray-600">
              Offer details stay hidden until a customer has an active RaiseHub Pass.
            </p>
          </div>
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-2">
          {availableOffers.length > 0 ? (
            availableOffers.map((offer, index) => (
              <article
                key={offer.id}
                className="rounded-3xl border border-yellow-100 bg-white/95 p-5 shadow-lg"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-yellow-700">
                    Exclusive Local Deal {index + 1}
                  </p>
                  <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-bold text-yellow-800">
                    Locked
                  </span>
                </div>

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
      </div>
    </main>
  )
}

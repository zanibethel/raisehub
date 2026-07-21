import Link from 'next/link'

import TrackedOfferLink from '@/app/components/tracked-offer-link'
import { getCustomerPassAccess } from '@/lib/services/customer-pass-access-service'
import { createClient } from '@/lib/supabase/server'

// =============================================================================
// Types
// =============================================================================

type OfferPageProps = {
  params: Promise<{
    id: string
  }>
}

// =============================================================================
// Helpers
// =============================================================================

function formatOfferDate(
  value: string | null
): string {
  if (!value) {
    return 'No published end date'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return 'Date unavailable'
  }

  return date.toLocaleDateString(
    undefined,
    {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }
  )
}

function normalizeExternalUrl(
  value: string
): string {
  return value.startsWith('http')
    ? value
    : `https://${value}`
}

// =============================================================================
// Component
// =============================================================================

export default async function OfferPage({
  params,
}: OfferPageProps) {
  const { id } = await params
  const supabase = await createClient()

  // ===========================================================================
  // Authentication and pass access
  // ===========================================================================

  const {
    data: { user },
  } = await supabase.auth.getUser()

  let isUnlocked = false

  if (user) {
    const { hasActivePass } =
      await getCustomerPassAccess(
        user.id
      )

    isUnlocked = hasActivePass
  }

  // ===========================================================================
  // Analytics
  // ===========================================================================

  await supabase
    .from('offer_views')
    .insert({
      offer_id: id,
      user_id: user?.id ?? null,
    })

  // ===========================================================================
  // Public offer and business information
  // ===========================================================================

  const { data: offer } =
    await supabase
      .from('offers')
      .select(
        'id, title, discount, description, starts_at, ends_at, business_id'
      )
      .eq('id', id)
      .eq('is_active', true)
      .single()

  if (!offer) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-10 sm:px-8 sm:py-16">
        <div className="mx-auto max-w-xl rounded-3xl border border-gray-100 bg-white p-6 shadow-xl sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-wide text-red-700">
            Offer Unavailable
          </p>

          <h1 className="mt-2 text-2xl font-bold text-gray-900">
            Offer not found
          </h1>

          <p className="mt-3 text-sm leading-6 text-gray-600">
            This offer may have ended,
            been removed, or is no longer
            available.
          </p>

          <Link
            href="/offers"
            className="mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 sm:w-auto"
          >
            Back to Local Deals
          </Link>
        </div>
      </main>
    )
  }

  const { data: profile } =
    await supabase
      .from('profiles')
      .select(
        'business_name, display_name, logo_url, phone, address, website_url, google_maps_url'
      )
      .eq('id', offer.business_id)
      .single()

  const businessName =
    profile?.display_name ||
    profile?.business_name ||
    'Local Business'

  const offerReturnPath =
    `/offers/${offer.id}`

  return (
    <main className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-blue-50 px-4 py-8 sm:px-8 sm:py-16">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/offers"
          className="inline-flex min-h-11 items-center text-sm font-semibold text-yellow-700 underline-offset-4 hover:underline"
        >
          ← Back to Local Deals
        </Link>

        <article className="mt-4 overflow-hidden rounded-3xl border border-yellow-100 bg-white/95 shadow-xl sm:mt-6">
          <header className="border-b border-yellow-100 p-5 sm:p-8">
            <div className="flex items-start gap-4">
              <img
                src={
                  profile?.logo_url ||
                  '/default-business-logo.png'
                }
                alt={`${businessName} logo`}
                className="h-14 w-14 shrink-0 rounded-xl border border-gray-200 object-cover sm:h-16 sm:w-16"
              />

              <div className="min-w-0">
                <p className="break-words text-xs font-semibold uppercase tracking-wide text-yellow-700">
                  {businessName}
                </p>

                <h1 className="mt-1 break-words text-2xl font-bold leading-tight text-gray-900 sm:text-3xl">
                  {isUnlocked
                    ? offer.title ||
                      'Exclusive Local Deal'
                    : 'Exclusive Local Deal'}
                </h1>
              </div>
            </div>
          </header>

          <div className="p-5 sm:p-8">
            {isUnlocked ? (
              <section className="rounded-2xl border border-green-100 bg-green-50 p-5 sm:p-6">
                <p className="text-xs font-semibold uppercase tracking-wide text-green-700">
                  Pass Benefit
                </p>

                <p className="mt-2 break-words text-xl font-bold text-green-800">
                  {offer.discount ||
                    'Special savings available'}
                </p>

                <p className="mt-3 break-words text-sm leading-6 text-gray-700 sm:text-base">
                  {offer.description ||
                    'Exclusive customer offer'}
                </p>
              </section>
            ) : (
              <section className="rounded-2xl border border-yellow-200 bg-yellow-50 p-5 text-center sm:p-6">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100 text-xl">
                  🔒
                </div>

                <h2 className="mt-4 text-lg font-bold text-gray-900">
                  Deal details require a
                  RaiseHub Pass
                </h2>

                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-600">
                  Support a participating
                  fundraiser to reveal the
                  discount, full offer
                  description, and
                  redemption details.
                </p>
              </section>
            )}

            <section
              aria-labelledby="offer-information-heading"
              className="mt-6 rounded-2xl border border-gray-100 bg-gray-50 p-5"
            >
              <h2
                id="offer-information-heading"
                className="font-bold text-gray-900"
              >
                Offer Information
              </h2>

              <dl className="mt-4 space-y-4 text-sm">
                <div>
                  <dt className="font-semibold text-gray-900">
                    Valid until
                  </dt>

                  <dd className="mt-1 text-gray-600">
                    {formatOfferDate(
                      offer.ends_at
                    )}
                  </dd>
                </div>

                {profile?.address ? (
                  <div>
                    <dt className="font-semibold text-gray-900">
                      Location
                    </dt>

                    <dd className="mt-1 break-words text-gray-600">
                      {profile.address}
                    </dd>
                  </div>
                ) : null}

                {profile?.phone ? (
                  <div>
                    <dt className="font-semibold text-gray-900">
                      Phone
                    </dt>

                    <dd className="mt-1">
                      <a
                        href={`tel:${profile.phone}`}
                        className="break-words font-medium text-blue-700 underline underline-offset-4"
                      >
                        {profile.phone}
                      </a>
                    </dd>
                  </div>
                ) : null}
              </dl>
            </section>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {isUnlocked ? (
                <TrackedOfferLink
                  href="/dashboard#my-pass"
                  offerId={offer.id}
                  clickType="dashboard_click"
                  className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-green-700 px-5 py-3 text-center text-sm font-semibold text-white transition hover:bg-green-800"
                >
                  Open My Pass
                </TrackedOfferLink>
              ) : user ? (
                <Link
                  href="/campaigns"
                  className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-blue-700 px-5 py-3 text-center text-sm font-semibold text-white transition hover:bg-blue-800"
                >
                  Choose a Fundraiser Pass
                </Link>
              ) : (
                <>
                  <Link
                    href={`/login?next=${encodeURIComponent(
                      offerReturnPath
                    )}`}
                    className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-blue-700 px-5 py-3 text-center text-sm font-semibold text-white transition hover:bg-blue-800"
                  >
                    Log In
                  </Link>

                  <Link
                    href="/signup?source=offers"
                    className="inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-blue-200 bg-white px-5 py-3 text-center text-sm font-semibold text-blue-700 transition hover:bg-blue-50"
                  >
                    Create Customer Account
                  </Link>
                </>
              )}
            </div>

            {profile?.website_url ||
            profile?.google_maps_url ? (
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {profile?.website_url ? (
                  <a
                    href={normalizeExternalUrl(
                      profile.website_url
                    )}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-green-200 bg-white px-4 py-2.5 text-center text-sm font-semibold text-green-700 transition hover:bg-green-50"
                  >
                    Visit Website
                  </a>
                ) : null}

                {profile?.google_maps_url ? (
                  <a
                    href={normalizeExternalUrl(
                      profile.google_maps_url
                    )}
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
      </div>
    </main>
  )
}